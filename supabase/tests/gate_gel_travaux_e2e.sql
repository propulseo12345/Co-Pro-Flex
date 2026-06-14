-- GATE E2E — B4 : GEL DU COMPTE 12 (travaux) + APUREMENT additif
-- ============================================================================================
-- Prouve : (1) avec un résultat TRAVAUX présent, regularize_period (flag défaut OFF) NE déverse PAS
--   le 12 (gel) — il reste et se reporte — tout en affectant le COURANT ; l'invariant restreint au
--   courant reste vert malgré un 12 non nul. (2) settle_works_balance déverse le 12 vivant vers 450-2
--   par quote-part sur l'exercice OUVERT, le 12 retombe à 0, et l'écran (v_works_pending_settlement)
--   le voit puis ne le voit plus. Couvre les DEUX signes (excédent travaux copro A, déficit copro B).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro    uuid; v_n uuid; v_np uuid; v_lot uuid; v_nb_lots int;
  v_a702 uuid; v_a671 uuid; v_a512 uuid; v_a452 uuid; v_a12 uuid;
  v_open jsonb; v_reg jsonb; v_settle jsonb;
  v_solde12_np numeric; v_solde12_after numeric; v_alloc452 numeric; v_alloc_lots int;
  v_violations int; v_view_balance numeric; v_view_rows int; v_settle_tx int;
  -- Montant NON divisible par les 4 lots égaux (250/1000) : 1000.01 * 250/1000 = 250.0025 -> les 3
  -- premiers lots à 250.00, le dernier absorbe le reste (250.01). Exerce la branche d'arrondi cumulatif ;
  -- si elle cassait, Σ(450-2) ≠ solde 12 et create_ledger_transaction rejetterait l'écriture (partie double).
  v_amount numeric := 1000.01;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- ════════════════ COPRO A — EXCÉDENT TRAVAUX (appel 702 sans charge) ════════════════
  v_copro := create_clean_test_copro_seeded('b4-gel-excedent');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT count(*) INTO v_nb_lots FROM lots WHERE copro_id = v_copro;
  SELECT id INTO v_lot FROM lots WHERE copro_id = v_copro ORDER BY id LIMIT 1;
  SELECT id INTO v_a702 FROM accounts WHERE copro_id = v_copro AND code = '702';
  SELECT id INTO v_a452 FROM accounts WHERE copro_id = v_copro AND code = '450-2';
  SELECT id INTO v_a12  FROM accounts WHERE copro_id = v_copro AND code = '12';

  -- Injecte un résultat TRAVAUX excédentaire : appel de fonds travaux D 450-2 (lot) / C 702.
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'TEST appel travaux', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a452, 'lot_id', v_lot, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Appel travaux lot'),
      jsonb_build_object('account_id', v_a702, 'lot_id', NULL,  'direction', 'credit', 'amount', v_amount, 'entry_label', 'Produit appel travaux')
    ), true);

  -- Clôture N -> ouverture N+1 (le travaux excédentaire se reporte sur le 12 de N+1).
  PERFORM close_period(v_n);
  v_open := open_next_period(v_copro, v_n, NULL, NULL, NULL);
  IF NOT (v_open->>'success')::boolean THEN RAISE EXCEPTION 'A: open_next_period KO : %', v_open; END IF;
  v_np := (v_open->>'next_period_id')::uuid;
  IF (v_open->>'result_travaux')::numeric = 0 THEN
    RAISE EXCEPTION 'A (anti-vacuité) : résultat travaux nul — le test ne prouverait rien';
  END IF;

  -- Solde 12 de N+1 APRÈS à-nouveau (avant regularize).
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_solde12_np
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_np AND e.account_id=v_a12;
  IF v_solde12_np = 0 THEN RAISE EXCEPTION 'A : 12 de N+1 nul après à-nouveau (travaux non reporté)'; END IF;

  -- regularize_period FLAG OFF (défaut) : doit affecter le courant et GELER le 12.
  v_reg := regularize_period(v_copro, v_n);
  IF NOT (v_reg->>'success')::boolean THEN RAISE EXCEPTION 'A: regularize KO : %', v_reg; END IF;
  IF (v_reg->>'pending_travaux')::numeric = 0 THEN RAISE EXCEPTION 'A : pending_travaux=0, le gel n''a pas été signalé'; END IF;

  -- (A1) le 12 est INCHANGÉ après regularize (gel — pas déversé).
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_solde12_after
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_np AND e.account_id=v_a12;
  IF abs(v_solde12_after - v_solde12_np) > 0.01 THEN
    RAISE EXCEPTION 'A1 : 12 modifié par regularize (gel raté) : avant=% après=%', v_solde12_np, v_solde12_after;
  END IF;

  -- (A2) aucune écriture result_allocation ne touche 450-2 (travaux non déversé).
  IF EXISTS (SELECT 1 FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id
             WHERE t.copro_id=v_copro AND t.source_type='result_allocation' AND e.account_id=v_a452) THEN
    RAISE EXCEPTION 'A2 : result_allocation a touché 450-2 alors que le travaux est gelé';
  END IF;

  -- (A3) invariant restreint au courant = 0 ligne MALGRÉ un 12 non nul.
  SELECT count(*) INTO v_violations FROM v_result_allocation_split WHERE copro_id=v_copro AND period_id=v_np;
  IF v_violations <> 0 THEN RAISE EXCEPTION 'A3 : invariant restreint remonte % violation(s) (faux positif du gel)', v_violations; END IF;

  -- (A4) l'écran d'apurement voit bien le 12 gelé.
  SELECT count(*), coalesce(max(works_balance),0) INTO v_view_rows, v_view_balance
  FROM v_works_pending_settlement WHERE copro_id=v_copro;
  IF v_view_rows <> 1 OR abs(v_view_balance + v_amount) > 0.01 THEN
    RAISE EXCEPTION 'A4 : v_works_pending_settlement attendu 1 ligne ~%, trouvé % ligne(s) bal=%', -v_amount, v_view_rows, v_view_balance;
  END IF;

  -- (A5) APUREMENT : settle_works_balance déverse le 12 (excédent -> remboursement : D 12 / C 450-2).
  v_settle := settle_works_balance(v_copro);
  IF NOT (v_settle->>'success')::boolean OR (v_settle->>'settled')::numeric = 0 THEN
    RAISE EXCEPTION 'A5 : settle_works_balance KO : %', v_settle;
  END IF;
  -- anti-vacuité : une écriture works_settlement touchant 450-2 existe.
  SELECT count(*) INTO v_settle_tx FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id
   WHERE t.copro_id=v_copro AND t.source_type='works_settlement' AND e.account_id=v_a452;
  IF v_settle_tx = 0 THEN RAISE EXCEPTION 'A5 : aucune écriture works_settlement sur 450-2'; END IF;
  -- (A6) le 12 est soldé.
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_solde12_after
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_np AND e.account_id=v_a12;
  IF abs(v_solde12_after) > 0.01 THEN RAISE EXCEPTION 'A6 : 12 non soldé après apurement : %', v_solde12_after; END IF;
  -- (A7) 450-2 crédité sur TOUS les lots (excédent -> remboursement), Σ = montant travaux.
  SELECT count(DISTINCT e.lot_id), round(coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_alloc_lots, v_alloc452
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted' AND t.source_type='works_settlement'
  WHERE e.copro_id=v_copro AND e.account_id=v_a452 AND e.period_id=v_np;
  IF v_alloc_lots <> v_nb_lots THEN RAISE EXCEPTION 'A7 : apurement 450-2 sur % lot(s), attendu %', v_alloc_lots, v_nb_lots; END IF;
  IF abs(v_alloc452 - v_amount) > 0.01 THEN RAISE EXCEPTION 'A7 : Σ apurement 450-2 (%) ≠ travaux (%)', v_alloc452, v_amount; END IF;
  -- (A8) l'écran ne montre plus rien (having <> 0).
  SELECT count(*) INTO v_view_rows FROM v_works_pending_settlement WHERE copro_id=v_copro;
  IF v_view_rows <> 0 THEN RAISE EXCEPTION 'A8 : v_works_pending_settlement montre encore % ligne(s) après apurement', v_view_rows; END IF;

  -- ════════════════ COPRO B — DÉFICIT TRAVAUX (charge 671 sans appel) ════════════════
  v_copro := create_clean_test_copro_seeded('b4-gel-deficit');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT count(*) INTO v_nb_lots FROM lots WHERE copro_id = v_copro;
  SELECT id INTO v_a671 FROM accounts WHERE copro_id = v_copro AND code = '671';
  SELECT id INTO v_a512 FROM accounts WHERE copro_id = v_copro AND code = '512';
  SELECT id INTO v_a452 FROM accounts WHERE copro_id = v_copro AND code = '450-2';
  SELECT id INTO v_a12  FROM accounts WHERE copro_id = v_copro AND code = '12';

  -- Injecte un résultat TRAVAUX déficitaire : charge travaux payée D 671 / C 512.
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'TEST charge travaux', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a671, 'lot_id', NULL, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Charge travaux'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Paiement travaux')
    ), true);

  PERFORM close_period(v_n);
  v_open := open_next_period(v_copro, v_n, NULL, NULL, NULL);
  v_np := (v_open->>'next_period_id')::uuid;
  IF (v_open->>'result_travaux')::numeric = 0 THEN RAISE EXCEPTION 'B (anti-vacuité) : résultat travaux nul'; END IF;

  -- regularize flag OFF : gel.
  PERFORM regularize_period(v_copro, v_n);
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_solde12_np
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_np AND e.account_id=v_a12;
  IF v_solde12_np <= 0 THEN RAISE EXCEPTION 'B : 12 attendu DÉBITEUR (déficit), trouvé %', v_solde12_np; END IF;

  -- settle : déficit -> appel (C 12 / D 450-2).
  v_settle := settle_works_balance(v_copro);
  IF NOT (v_settle->>'success')::boolean THEN RAISE EXCEPTION 'B : settle KO : %', v_settle; END IF;
  IF v_settle->>'direction' <> 'appel' THEN RAISE EXCEPTION 'B : direction attendue appel, trouvé %', v_settle->>'direction'; END IF;
  -- 12 soldé.
  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_solde12_after
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.period_id=v_np AND e.account_id=v_a12;
  IF abs(v_solde12_after) > 0.01 THEN RAISE EXCEPTION 'B : 12 non soldé après apurement déficit : %', v_solde12_after; END IF;
  -- 450-2 DÉBITÉ sur tous les lots (appel), Σ = montant.
  SELECT count(DISTINCT e.lot_id), round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2)
    INTO v_alloc_lots, v_alloc452
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted' AND t.source_type='works_settlement'
  WHERE e.copro_id=v_copro AND e.account_id=v_a452 AND e.period_id=v_np;
  IF v_alloc_lots <> v_nb_lots THEN RAISE EXCEPTION 'B : apurement déficit 450-2 sur % lot(s), attendu %', v_alloc_lots, v_nb_lots; END IF;
  IF abs(v_alloc452 - v_amount) > 0.01 THEN RAISE EXCEPTION 'B : Σ apurement déficit (%) ≠ travaux (%)', v_alloc452, v_amount; END IF;

  RAISE NOTICE 'GATE B4 OK : gel du 12 (courant affecté, travaux reporté, invariant restreint vert) + apurement additif excédent ET déficit (12 soldé, 450-2 par quote-part)';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
