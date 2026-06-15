-- GATE E2E — 0072 / T2 : CLOISONNEMENT PAR NATURE + AVANCE 450-3
-- ============================================================================================
-- Prouve :
--   C1. CLOISONNEMENT DÉFAUT (correctif B7) : un appel TRAVAUX daté PLUS TÔT que tout, un paiement
--       SANS filtre n'y touche PAS (il va au COURANT) — l'ancien FIFO global chronologique l'aurait soldé.
--   C2. FILTRE EXPLICITE 'works' : impute bien le travaux, le courant reste intact.
--   C3. TROP-PERÇU : reliquat -> avance 450-3 (D512/C450-3) ; v_lot_advance_balance le voit (delta exact).
--   C4. FIFO INTRA-NATURE : entre deux appels travaux, le plus ANCIEN est soldé d'abord.
--   C5. RÉIMPUTATION idempotente : rejouer allocate_payment ne duplique pas (DELETE+reinsert).
-- Robuste aux données seedées (golden loop = appels COURANT) : C1 prouve « works=0 », les tests works
--   exploitent l'absence d'appels travaux seedés, C3 mesure un DELTA.
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_lot1 uuid; v_lot2 uuid; v_lot3 uuid; v_lot4 uuid;
  v_a450_1 uuid; v_a450_2 uuid; v_a450_3 uuid; v_a512 uuid; v_a701 uuid; v_a702 uuid;
  v_wbudget uuid;
  v_works_call uuid; v_works_line uuid; v_cur_call uuid; v_cur_line uuid;
  v_works_line2 uuid;
  v_pay uuid; v_paid_works numeric; v_paid_cur numeric; v_cnt int;
  v_adv_before numeric; v_adv_after numeric; v_unpaid numeric;
  v_w1 uuid; v_w2 uuid; v_w1_line uuid; v_w2_line uuid; v_paid_w1 numeric; v_paid_w2 numeric;

  -- crée un appel (en-tête + 1 ligne lot) avec son écriture d'appel D450-x/lot · C70x.
  -- (inline plus bas — pas de fonction imbriquée en plpgsql)
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0072-cloisonnement');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_lot1 FROM lots WHERE copro_id=v_copro ORDER BY id LIMIT 1;
  SELECT id INTO v_lot2 FROM lots WHERE copro_id=v_copro ORDER BY id OFFSET 1 LIMIT 1;
  SELECT id INTO v_lot3 FROM lots WHERE copro_id=v_copro ORDER BY id OFFSET 2 LIMIT 1;
  SELECT id INTO v_lot4 FROM lots WHERE copro_id=v_copro ORDER BY id OFFSET 3 LIMIT 1;
  SELECT id INTO v_a450_1 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  SELECT id INTO v_a450_2 FROM accounts WHERE copro_id=v_copro AND code='450-2';
  SELECT id INTO v_a450_3 FROM accounts WHERE copro_id=v_copro AND code='450-3';
  SELECT id INTO v_a512 FROM accounts WHERE copro_id=v_copro AND code='512';
  SELECT id INTO v_a701 FROM accounts WHERE copro_id=v_copro AND code='701';
  SELECT id INTO v_a702 FROM accounts WHERE copro_id=v_copro AND code='702';
  IF v_lot4 IS NULL THEN RAISE EXCEPTION '0072 setup : la copro seedée a moins de 4 lots'; END IF;

  -- Budget travaux minimal (allocate_payment ne lit que budget_type via la jointure).
  INSERT INTO budgets (copro_id, period_id, budget_type, status, name)
  VALUES (v_copro, v_n, 'works', 'draft', 'Travaux test 0072') RETURNING id INTO v_wbudget;

  -- ════════════════ C1 — CLOISONNEMENT DÉFAUT (B7) ════════════════
  -- Appel TRAVAUX daté très tôt (lot1).
  v_works_call := (create_ledger_transaction(v_copro, v_n, current_date - 100, 'C1 appel travaux', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a450_2, 'lot_id', v_lot1, 'direction', 'debit',  'amount', 100, 'entry_label', 'Appel travaux'),
      jsonb_build_object('account_id', v_a702,   'lot_id', NULL,   'direction', 'credit', 'amount', 100, 'entry_label', 'Produit travaux')
    ), true)->>'tx_id')::uuid;
  INSERT INTO call_for_funds (copro_id, period_id, budget_id, label, issue_date, due_date, total_amount, status, ledger_tx_id, issued_at)
  VALUES (v_copro, v_n, v_wbudget, 'C1 travaux', current_date - 100, current_date - 70, 100, 'issued', v_works_call, now())
  RETURNING id INTO v_works_call;
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due) VALUES (v_copro, v_works_call, v_lot1, 100) RETURNING id INTO v_works_line;

  -- Appel COURANT daté plus tard (lot1).
  v_cur_call := (create_ledger_transaction(v_copro, v_n, current_date, 'C1 appel courant', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a450_1, 'lot_id', v_lot1, 'direction', 'debit',  'amount', 100, 'entry_label', 'Appel courant'),
      jsonb_build_object('account_id', v_a701,   'lot_id', NULL,   'direction', 'credit', 'amount', 100, 'entry_label', 'Produit courant')
    ), true)->>'tx_id')::uuid;
  INSERT INTO call_for_funds (copro_id, period_id, budget_id, label, issue_date, due_date, total_amount, status, ledger_tx_id, issued_at)
  VALUES (v_copro, v_n, NULL, 'C1 courant', current_date, current_date + 30, 100, 'issued', v_cur_call, now())
  RETURNING id INTO v_cur_call;
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due) VALUES (v_copro, v_cur_call, v_lot1, 100) RETURNING id INTO v_cur_line;

  -- Paiement SANS filtre de 1 € : doit aller au COURANT, jamais au travaux (pourtant le plus ancien).
  INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date, method, status)
  VALUES (v_copro, v_n, v_lot1, 1, current_date, 'transfer', 'recorded') RETURNING id INTO v_pay;
  PERFORM allocate_payment(v_pay, NULL, NULL);

  SELECT amount_paid INTO v_paid_works FROM call_for_funds_lines WHERE id=v_works_line;
  IF v_paid_works <> 0 THEN
    RAISE EXCEPTION 'C1 : appel TRAVAUX imputé (%) par un paiement sans filtre — cloison franchie (B7)', v_paid_works;
  END IF;
  SELECT coalesce(sum(pa.amount_allocated),0) INTO v_paid_cur
  FROM payment_allocations pa JOIN call_for_funds_lines cfl ON cfl.id=pa.call_line_id
  WHERE pa.payment_id=v_pay AND cfl.lot_id=v_lot1;
  IF v_paid_cur <> 1 THEN RAISE EXCEPTION 'C1 : 1 € non imputé au courant (imputé=%)', v_paid_cur; END IF;

  -- ════════════════ C2 — FILTRE EXPLICITE 'works' ════════════════
  v_works_call := (create_ledger_transaction(v_copro, v_n, current_date, 'C2 appel travaux', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a450_2, 'lot_id', v_lot2, 'direction', 'debit',  'amount', 100, 'entry_label', 'Appel travaux'),
      jsonb_build_object('account_id', v_a702,   'lot_id', NULL,   'direction', 'credit', 'amount', 100, 'entry_label', 'Produit travaux')
    ), true)->>'tx_id')::uuid;
  INSERT INTO call_for_funds (copro_id, period_id, budget_id, label, issue_date, due_date, total_amount, status, ledger_tx_id, issued_at)
  VALUES (v_copro, v_n, v_wbudget, 'C2 travaux', current_date, current_date + 30, 100, 'issued', v_works_call, now())
  RETURNING id INTO v_works_call;
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due) VALUES (v_copro, v_works_call, v_lot2, 100) RETURNING id INTO v_works_line;

  INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date, method, status)
  VALUES (v_copro, v_n, v_lot2, 60, current_date, 'transfer', 'recorded') RETURNING id INTO v_pay;
  PERFORM allocate_payment(v_pay, NULL, 'works');
  SELECT amount_paid INTO v_paid_works FROM call_for_funds_lines WHERE id=v_works_line;
  IF v_paid_works <> 60 THEN RAISE EXCEPTION 'C2 : filtre works n''a pas imputé le travaux (paid=%)', v_paid_works; END IF;

  -- ════════════════ C3 — TROP-PERÇU -> AVANCE 450-3 (delta) ════════════════
  SELECT coalesce(advance_balance,0) INTO v_adv_before FROM v_lot_advance_balance WHERE copro_id=v_copro AND lot_id=v_lot3;
  v_adv_before := coalesce(v_adv_before, 0);
  -- montant total impayé du lot3 (courant+travaux) AVANT, pour payer pile + 50 de trop.
  SELECT coalesce(sum(cfl.amount_due - cfl.amount_paid),0) INTO v_unpaid
  FROM call_for_funds_lines cfl JOIN call_for_funds cf ON cf.id=cfl.call_id
  LEFT JOIN budgets b ON b.id=cf.budget_id
  WHERE cfl.lot_id=v_lot3 AND cfl.copro_id=v_copro AND cfl.status<>'paid' AND cf.status<>'cancelled'
    AND coalesce(b.budget_type::text,'current') IN ('current','works');
  PERFORM post_owner_payment(v_copro, v_n, v_lot3, v_unpaid + 50, current_date, 'transfer', NULL, NULL, NULL, NULL);
  SELECT coalesce(advance_balance,0) INTO v_adv_after FROM v_lot_advance_balance WHERE copro_id=v_copro AND lot_id=v_lot3;
  IF round(v_adv_after - v_adv_before, 2) <> 50 THEN
    RAISE EXCEPTION 'C3 : avance 450-3 delta=% (attendu 50) — trop-perçu non basculé', round(v_adv_after - v_adv_before,2);
  END IF;
  -- AVANCE = SOURCE GL : la vue dérive bien du grand livre (C450-3 posté).
  SELECT round(coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END),0),2) INTO v_paid_cur
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.lot_id=v_lot3 AND e.account_id=v_a450_3;
  IF v_paid_cur <> v_adv_after THEN RAISE EXCEPTION 'C3 : vue avance (%) != solde GL 450-3 (%)', v_adv_after, v_paid_cur; END IF;

  -- ════════════════ C4 — FIFO INTRA-NATURE (works) ════════════════
  -- Deux appels travaux lot4, l'un ancien (J-50) l'autre récent (J0). Filtre works, payer 40 (= part ancien).
  v_w1 := (create_ledger_transaction(v_copro, v_n, current_date - 50, 'C4 travaux ancien', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a450_2, 'lot_id', v_lot4, 'direction', 'debit',  'amount', 40, 'entry_label', 'T ancien'),
      jsonb_build_object('account_id', v_a702,   'lot_id', NULL,   'direction', 'credit', 'amount', 40, 'entry_label', 'P')
    ), true)->>'tx_id')::uuid;
  INSERT INTO call_for_funds (copro_id, period_id, budget_id, label, issue_date, due_date, total_amount, status, ledger_tx_id, issued_at)
  VALUES (v_copro, v_n, v_wbudget, 'C4 ancien', current_date - 50, current_date - 20, 40, 'issued', v_w1, now()) RETURNING id INTO v_w1;
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due) VALUES (v_copro, v_w1, v_lot4, 40) RETURNING id INTO v_w1_line;

  v_w2 := (create_ledger_transaction(v_copro, v_n, current_date, 'C4 travaux recent', 'call_for_funds', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a450_2, 'lot_id', v_lot4, 'direction', 'debit',  'amount', 40, 'entry_label', 'T recent'),
      jsonb_build_object('account_id', v_a702,   'lot_id', NULL,   'direction', 'credit', 'amount', 40, 'entry_label', 'P')
    ), true)->>'tx_id')::uuid;
  INSERT INTO call_for_funds (copro_id, period_id, budget_id, label, issue_date, due_date, total_amount, status, ledger_tx_id, issued_at)
  VALUES (v_copro, v_n, v_wbudget, 'C4 recent', current_date, current_date + 30, 40, 'issued', v_w2, now()) RETURNING id INTO v_w2;
  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due) VALUES (v_copro, v_w2, v_lot4, 40) RETURNING id INTO v_w2_line;

  INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date, method, status)
  VALUES (v_copro, v_n, v_lot4, 40, current_date, 'transfer', 'recorded') RETURNING id INTO v_pay;
  PERFORM allocate_payment(v_pay, NULL, 'works');
  SELECT amount_paid INTO v_paid_w1 FROM call_for_funds_lines WHERE id=v_w1_line;
  SELECT amount_paid INTO v_paid_w2 FROM call_for_funds_lines WHERE id=v_w2_line;
  IF v_paid_w1 <> 40 OR v_paid_w2 <> 0 THEN
    RAISE EXCEPTION 'C4 : FIFO intra-nature KO (ancien=% attendu 40, récent=% attendu 0)', v_paid_w1, v_paid_w2;
  END IF;

  -- ════════════════ C5 — RÉIMPUTATION idempotente ════════════════
  PERFORM allocate_payment(v_pay, NULL, 'works');  -- rejoue
  SELECT count(*) INTO v_cnt FROM payment_allocations WHERE payment_id=v_pay;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'C5 : réimputation a dupliqué les allocations (count=%)', v_cnt; END IF;
  SELECT amount_paid INTO v_paid_w1 FROM call_for_funds_lines WHERE id=v_w1_line;
  IF v_paid_w1 <> 40 THEN RAISE EXCEPTION 'C5 : amount_paid altéré après rejeu (%)', v_paid_w1; END IF;

  RAISE NOTICE 'GATE 0072 OK : cloisonnement défaut (works intact malgré antériorité) + filtre explicite works + trop-perçu->450-3 (vue=GL) + FIFO intra-nature + réimputation idempotente';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
