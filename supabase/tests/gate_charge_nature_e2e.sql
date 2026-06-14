-- GATE E2E — E3 : colonne accounts.charge_nature (classification courant/travaux)
-- ============================================================================================
-- Prouve : (1) le seed classe 6221=travaux, 601=courant, 450-1=NULL ; (2) le CHECK miroir bloque un
-- compte 6/7 sans charge_nature et un compte hors 6/7 avec charge_nature ; (3) open_next_period lit la
-- colonne -> une charge 6221 (honoraires travaux) alimente le résultat TRAVAUX (compte 12), pas courant.
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_np uuid; v_a6221 uuid; v_a512 uuid; v_a12 uuid;
  v_open jsonb; v_solde12 numeric; v_ok boolean; v_amount numeric := 800.00;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_copro := create_clean_test_copro_seeded('e3-charge-nature');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_a6221 FROM accounts WHERE copro_id = v_copro AND code = '6221';
  SELECT id INTO v_a512  FROM accounts WHERE copro_id = v_copro AND code = '512';
  SELECT id INTO v_a12   FROM accounts WHERE copro_id = v_copro AND code = '12';

  -- (1) Classification seedée.
  IF (SELECT charge_nature FROM accounts WHERE code = '6221' AND copro_id = v_copro) <> 'travaux' THEN RAISE EXCEPTION 'E3 (1) : 6221 attendu travaux'; END IF;
  IF (SELECT charge_nature FROM accounts WHERE code = '601' AND copro_id = v_copro) <> 'courant' THEN RAISE EXCEPTION 'E3 (1) : 601 attendu courant'; END IF;
  IF (SELECT charge_nature FROM accounts WHERE code = '702' AND copro_id = v_copro) <> 'travaux' THEN RAISE EXCEPTION 'E3 (1) : 702 attendu travaux'; END IF;
  IF (SELECT charge_nature FROM accounts WHERE code = '711' AND copro_id = v_copro) <> 'courant' THEN RAISE EXCEPTION 'E3 (1) : 711 attendu courant (par défaut, bascule E4)'; END IF;
  IF (SELECT charge_nature FROM accounts WHERE code = '450-1' AND copro_id = v_copro) IS NOT NULL THEN RAISE EXCEPTION 'E3 (1) : 450-1 attendu NULL'; END IF;

  -- (2) CHECK miroir (via UPDATE pour éviter les NOT NULL d'un INSERT).
  v_ok := false;
  BEGIN UPDATE accounts SET charge_nature = NULL WHERE copro_id = v_copro AND code = '601';
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'E3 (2a) : CHECK n''a pas bloqué un compte 6xx à charge_nature NULL'; END IF;
  v_ok := false;
  BEGIN UPDATE accounts SET charge_nature = 'courant' WHERE copro_id = v_copro AND code = '450-1';
  EXCEPTION WHEN check_violation THEN v_ok := true; END;
  IF NOT v_ok THEN RAISE EXCEPTION 'E3 (2b) : CHECK n''a pas bloqué un compte hors 6/7 à charge_nature non NULL'; END IF;

  -- (3) Comportement : une charge 6221 (honoraires travaux) -> résultat TRAVAUX (compte 12), pas courant.
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'TEST honoraires travaux 6221', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a6221, 'lot_id', NULL, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Honoraires travaux'),
      jsonb_build_object('account_id', v_a512,  'lot_id', NULL, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Paiement')
    ), true);
  PERFORM close_period(v_n);
  v_open := open_next_period(v_copro, v_n, NULL, NULL, NULL);
  v_np := (v_open->>'next_period_id')::uuid;
  IF abs((v_open->>'result_travaux')::numeric) < 0.01 THEN RAISE EXCEPTION 'E3 (3) : result_travaux nul malgré une charge 6221 (classement courant/travaux KO)'; END IF;
  SELECT round(coalesce(sum(CASE WHEN e.direction = 'debit' THEN e.amount ELSE -e.amount END), 0), 2) INTO v_solde12
  FROM ledger_entries e JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted'
  WHERE e.copro_id = v_copro AND e.period_id = v_np AND e.account_id = v_a12;
  IF v_solde12 <= 0 THEN RAISE EXCEPTION 'E3 (3) : charge 6221 non classée travaux — 12 de N+1 = % (attendu débiteur)', v_solde12; END IF;

  RAISE NOTICE 'GATE E3 OK : charge_nature seedée (6221/702=travaux, 601/711=courant, 450-1=NULL) + CHECK miroir + open_next_period classe le 6221 en travaux';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
