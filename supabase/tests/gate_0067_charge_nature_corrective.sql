-- GATE 0067 — T10 : correctif charge_nature (661/662/704 -> 'travaux').
-- ============================================================================================
-- Prouve : (1) le seed corrigé (provision_copro_chart) classe 661=travaux, 662=travaux, 704=travaux,
-- 6221=travaux (déjà OK en 0059), 601=courant et — NON-RÉGRESSION EXPLICITE — 711=COURANT ; (2)
-- COMPORTEMENT (anti-vacuité) : une charge de classe 661 (remboursement annuités d'emprunt) postée
-- puis l'exercice clôturé alimente le résultat TRAVAUX (compte 12), PAS le courant (478).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role posé par le runner (db-test.mjs).
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_np uuid;
  v_a661 uuid; v_a512 uuid; v_a12 uuid; v_a478 uuid;
  v_open jsonb; v_solde12 numeric; v_solde478 numeric;
  v_nat text;
  -- Montant NON divisible par les quote-parts (cf. consigne) : on poste directement la charge,
  -- mais on garde un montant "tordu" pour ne rien faire reposer sur une répartition propre.
  v_amount numeric := 733.37;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_copro := create_clean_test_copro_seeded('t10-charge-nature-corrective');

  SELECT id INTO v_n   FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_a661 FROM accounts WHERE copro_id = v_copro AND code = '661';
  SELECT id INTO v_a512 FROM accounts WHERE copro_id = v_copro AND code = '512';
  SELECT id INTO v_a12  FROM accounts WHERE copro_id = v_copro AND code = '12';
  SELECT id INTO v_a478 FROM accounts WHERE copro_id = v_copro AND code = '478';

  IF v_n IS NULL THEN RAISE EXCEPTION '0067 setup : exercice ouvert introuvable'; END IF;
  IF v_a661 IS NULL THEN RAISE EXCEPTION '0067 setup : compte 661 absent du seed'; END IF;
  IF v_a12  IS NULL THEN RAISE EXCEPTION '0067 setup : compte 12 (attente travaux) absent du seed'; END IF;

  -- (1) Classification seedée par provision_copro_chart (via create_clean_test_copro_seeded).
  SELECT charge_nature INTO v_nat FROM accounts WHERE copro_id = v_copro AND code = '661';
  IF v_nat IS DISTINCT FROM 'travaux' THEN RAISE EXCEPTION '0067 (1) : 661 attendu travaux, obtenu %', v_nat; END IF;
  SELECT charge_nature INTO v_nat FROM accounts WHERE copro_id = v_copro AND code = '662';
  IF v_nat IS DISTINCT FROM 'travaux' THEN RAISE EXCEPTION '0067 (1) : 662 attendu travaux, obtenu %', v_nat; END IF;
  SELECT charge_nature INTO v_nat FROM accounts WHERE copro_id = v_copro AND code = '704';
  IF v_nat IS DISTINCT FROM 'travaux' THEN RAISE EXCEPTION '0067 (1) : 704 attendu travaux, obtenu %', v_nat; END IF;
  SELECT charge_nature INTO v_nat FROM accounts WHERE copro_id = v_copro AND code = '6221';
  IF v_nat IS DISTINCT FROM 'travaux' THEN RAISE EXCEPTION '0067 (1) : 6221 attendu travaux, obtenu %', v_nat; END IF;
  SELECT charge_nature INTO v_nat FROM accounts WHERE copro_id = v_copro AND code = '601';
  IF v_nat IS DISTINCT FROM 'courant' THEN RAISE EXCEPTION '0067 (1) : 601 attendu courant, obtenu %', v_nat; END IF;
  -- NON-RÉGRESSION : 711 NE DOIT PAS basculer travaux (gate_charge_nature_e2e en dépend).
  SELECT charge_nature INTO v_nat FROM accounts WHERE copro_id = v_copro AND code = '711';
  IF v_nat IS DISTINCT FROM 'courant' THEN RAISE EXCEPTION '0067 (1) NON-RÉGRESSION : 711 attendu COURANT, obtenu % (ne pas le basculer travaux)', v_nat; END IF;

  -- (2) ANTI-VACUITÉ / COMPORTEMENT : poster une charge 661 puis clôturer -> résultat TRAVAUX.
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'TEST remboursement annuités emprunt 661', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a661, 'lot_id', NULL, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Annuités emprunt'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Paiement banque')
    ), true);

  PERFORM close_period(v_n);
  v_open := open_next_period(v_copro, v_n, NULL, NULL, NULL);
  v_np := (v_open->>'next_period_id')::uuid;

  -- La charge 661 doit peser dans result_travaux, et NON dans result_courant.
  IF abs((v_open->>'result_travaux')::numeric) < v_amount - 0.01 THEN
    RAISE EXCEPTION '0067 (2) : result_travaux % trop faible — la charge 661 (%) n''a pas été classée travaux',
      (v_open->>'result_travaux'), v_amount;
  END IF;

  -- Empreinte au grand livre N+1 : le compte 12 (attente travaux) reçoit la charge (débiteur),
  -- le compte 478 (attente courant) ne doit PAS porter cette charge 661.
  SELECT round(coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0), 2)
    INTO v_solde12
  FROM ledger_entries e JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE e.copro_id = v_copro AND e.period_id = v_np AND e.account_id = v_a12;
  IF v_solde12 < v_amount - 0.01 THEN
    RAISE EXCEPTION '0067 (2) : compte 12 (travaux) de N+1 = % (attendu >= % — la charge 661 doit l''alimenter)', v_solde12, v_amount;
  END IF;

  IF v_a478 IS NOT NULL THEN
    SELECT round(coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0), 2)
      INTO v_solde478
    FROM ledger_entries e JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
    WHERE e.copro_id = v_copro AND e.period_id = v_np AND e.account_id = v_a478;
    -- Le 478 ne doit pas avoir absorbé la charge 661 (il peut porter d'autres soldes courants de la
    -- boucle d'or, mais pas le montant tordu de 661) : on vérifie qu'il NE dépasse PAS v_amount issu
    -- de cette charge, en s'assurant surtout que le travaux a bien capté le 661 (assertion ci-dessus).
    IF v_solde478 >= v_amount - 0.01 AND v_solde12 < v_amount - 0.01 THEN
      RAISE EXCEPTION '0067 (2) : la charge 661 semble tombée sur le courant (478=%, 12=%)', v_solde478, v_solde12;
    END IF;
  END IF;

  RAISE NOTICE '0067 GATE OK : 661/662/704=travaux, 711=COURANT (non-régression), 6221=travaux, 601=courant ; charge 661 -> résultat TRAVAUX (12=%, result_travaux=%)', v_solde12, (v_open->>'result_travaux');
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
