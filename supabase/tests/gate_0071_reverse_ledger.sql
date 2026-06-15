-- GATE E2E — 0071 / F9 : CONTRE-PASSATION (reverse_ledger_transaction + cancel_call_for_funds)
-- ============================================================================================
-- Prouve :
--   A. Extourne générique : 2e tx 'od' équilibrée, lignes INVERSÉES, metadata.reversal_of posé ;
--      l'écriture d'origine est INTACTE (count/Σ inchangés, toujours posted).
--   B. Double-extourne REFUSÉE.
--   C. Extourne d'une tx DRAFT REFUSÉE.
--   D. Extourne d'une écriture RÉGÉNÉRABLE (closing) REFUSÉE.
--   E. CAS CENTRAL : extourne d'une tx d'une période NON ouverte (close+open_next) -> atterrit
--      dans la période OUVERTE (date clampée), pas dans l'originale.
--   F. cancel_call_for_funds : appel posté sans paiement -> status='cancelled' + extourne présente,
--      ledger_tx_id CONSERVÉ ; appel AVEC paiement imputé -> REFUS STRICT.
--   G. Resserrement tr_cff_ledger_required : un appel annulé+émis qui PERDRAIT son ledger_tx_id lève.
--   H. Intégrité : audit_finance_integrity=0 et v_lot_vs_gl_mismatch vide après extourne d'appel.
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_np uuid; v_lot uuid;
  v_a601 uuid; v_a512 uuid; v_a450_1 uuid;
  v_tx uuid; v_tx_draft uuid; v_tx_regen uuid; v_rev jsonb; v_rev_tx uuid;
  v_cnt int; v_debit numeric; v_credit numeric; v_rof text;
  v_orig_lines int; v_budget uuid; v_call jsonb; v_call_id uuid; v_call_tx uuid;
  v_status text; v_open_period uuid; v_audit int; v_mismatch int;
  v_lot_bal_before numeric; v_lot_bal_after numeric; v_line uuid;
  ok boolean;
  v_amount numeric := 500;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  -- ════════════════════════ SETUP ════════════════════════
  v_copro := create_clean_test_copro_seeded('0071-reverse');
  SELECT id INTO v_n      FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_lot    FROM lots     WHERE copro_id=v_copro ORDER BY id LIMIT 1;
  SELECT id INTO v_a601   FROM accounts WHERE copro_id=v_copro AND code='601';
  SELECT id INTO v_a512   FROM accounts WHERE copro_id=v_copro AND code='512';
  SELECT id INTO v_a450_1 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  IF v_a601 IS NULL OR v_a512 IS NULL OR v_lot IS NULL THEN
    RAISE EXCEPTION '0071 setup : compte/lot manquant (601=% 512=% lot=%)', v_a601, v_a512, v_lot;
  END IF;

  -- ════════════════════════ A. EXTOURNE GÉNÉRIQUE ════════════════════════
  v_tx := (create_ledger_transaction(v_copro, v_n, current_date, 'TEST charge', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a601, 'lot_id', NULL, 'direction', 'debit',  'amount', v_amount, 'entry_label', 'Charge'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', v_amount, 'entry_label', 'Banque')
    ), true)->>'tx_id')::uuid;
  SELECT count(*) INTO v_orig_lines FROM ledger_entries WHERE tx_id=v_tx;

  v_rev := reverse_ledger_transaction(v_tx, 'erreur de saisie', NULL);
  IF NOT (v_rev->>'success')::boolean THEN RAISE EXCEPTION 'A : extourne KO : %', v_rev; END IF;
  v_rev_tx := (v_rev->>'reversal_tx_id')::uuid;

  -- (A1) l'extourne est 'od', équilibrée, et porte metadata.reversal_of = tx d'origine.
  SELECT source_type::text, (metadata->>'reversal_of') INTO v_status, v_rof
  FROM ledger_transactions WHERE id=v_rev_tx;
  IF v_status <> 'od' THEN RAISE EXCEPTION 'A1 : source_type extourne=% (attendu od)', v_status; END IF;
  IF v_rof <> v_tx::text THEN RAISE EXCEPTION 'A1 : reversal_of=% (attendu %)', v_rof, v_tx; END IF;

  -- (A2) lignes INVERSÉES : le 601 (débit à l'origine) est CRÉDITÉ dans l'extourne.
  SELECT count(*) INTO v_cnt FROM ledger_entries WHERE tx_id=v_rev_tx AND account_id=v_a601 AND direction='credit' AND amount=v_amount;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'A2 : 601 non inversé dans l''extourne (count=%)', v_cnt; END IF;
  SELECT count(*) INTO v_cnt FROM ledger_entries WHERE tx_id=v_rev_tx AND account_id=v_a512 AND direction='debit' AND amount=v_amount;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'A2 : 512 non inversé dans l''extourne (count=%)', v_cnt; END IF;

  -- (A3) écriture d'origine INTACTE (toujours posted, mêmes lignes).
  SELECT status::text INTO v_status FROM ledger_transactions WHERE id=v_tx;
  IF v_status <> 'posted' THEN RAISE EXCEPTION 'A3 : tx d''origine altérée (statut=%)', v_status; END IF;
  SELECT count(*) INTO v_cnt FROM ledger_entries WHERE tx_id=v_tx;
  IF v_cnt <> v_orig_lines THEN RAISE EXCEPTION 'A3 : lignes d''origine modifiées (% vs %)', v_cnt, v_orig_lines; END IF;

  -- (A4) v_general_ledger : l'origine est marquée is_reversed, l'extourne porte reversal_of.
  SELECT bool_and(is_reversed) INTO ok FROM v_general_ledger WHERE tx_id=v_tx;
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'A4 : v_general_ledger ne marque pas l''origine is_reversed'; END IF;
  SELECT bool_and(reversal_of = v_tx) INTO ok FROM v_general_ledger WHERE tx_id=v_rev_tx;
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'A4 : v_general_ledger n''expose pas reversal_of sur l''extourne'; END IF;

  -- ════════════════════════ B. DOUBLE-EXTOURNE REFUSÉE ════════════════════════
  ok := false;
  BEGIN
    PERFORM reverse_ledger_transaction(v_tx, 'rebelote', NULL);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%déjà contre-passée%' THEN ok := true; ELSE RAISE; END IF;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'B : double-extourne acceptée (attendu refus)'; END IF;

  -- ════════════════════════ C. EXTOURNE D'UNE DRAFT REFUSÉE ════════════════════════
  v_tx_draft := (create_ledger_transaction(v_copro, v_n, current_date, 'TEST draft', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a601, 'lot_id', NULL, 'direction', 'debit',  'amount', 10, 'entry_label', 'd'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', 10, 'entry_label', 'c')
    ), false)->>'tx_id')::uuid;  -- auto_post=false -> reste draft
  ok := false;
  BEGIN
    PERFORM reverse_ledger_transaction(v_tx_draft, 'x', NULL);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%postée peut être contre-passée%' THEN ok := true; ELSE RAISE; END IF;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'C : extourne d''une draft acceptée (attendu refus)'; END IF;

  -- ════════════════════════ D. EXTOURNE D'UNE RÉGÉNÉRABLE REFUSÉE ════════════════════════
  -- source_type='closing' + source_id=période non approuvée -> is_ledger_regen_exempt=true.
  v_tx_regen := (create_ledger_transaction(v_copro, v_n, current_date, 'TEST regen', 'closing', v_n,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a601, 'lot_id', NULL, 'direction', 'debit',  'amount', 20, 'entry_label', 'd'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', 20, 'entry_label', 'c')
    ), true)->>'tx_id')::uuid;
  ok := false;
  BEGIN
    PERFORM reverse_ledger_transaction(v_tx_regen, 'x', NULL);
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%régénérable%' THEN ok := true; ELSE RAISE; END IF;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'D : extourne d''une régénérable acceptée (attendu refus)'; END IF;

  -- ════════════════════════ E. CAS CENTRAL : période close -> extourne dans l'OPEN ════════════════════════
  -- Une tx postée dans v_n, puis on clôture v_n et ouvre v_np. L'extourne doit atterrir dans v_np.
  v_tx := (create_ledger_transaction(v_copro, v_n, current_date, 'TEST charge avant cloture', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a601, 'lot_id', NULL, 'direction', 'debit',  'amount', 30, 'entry_label', 'd'),
      jsonb_build_object('account_id', v_a512, 'lot_id', NULL, 'direction', 'credit', 'amount', 30, 'entry_label', 'c')
    ), true)->>'tx_id')::uuid;
  PERFORM close_period(v_n);
  v_np := (open_next_period(v_copro, v_n, NULL, NULL, NULL)->>'next_period_id')::uuid;
  IF v_np IS NULL THEN RAISE EXCEPTION 'E : open_next_period n''a pas rendu de période'; END IF;

  v_rev := reverse_ledger_transaction(v_tx, 'correction post-cloture', NULL);
  v_open_period := (v_rev->>'period_id')::uuid;
  IF v_open_period <> v_np THEN RAISE EXCEPTION 'E : extourne dans la période % (attendu OPEN %)', v_open_period, v_np; END IF;
  -- la période d'accueil est bien celle 'open'.
  SELECT status::text INTO v_status FROM accounting_periods WHERE id=v_np;
  IF v_status <> 'open' THEN RAISE EXCEPTION 'E : période d''accueil non ouverte (%)', v_status; END IF;

  -- ════════════════════════ F. cancel_call_for_funds ════════════════════════
  -- Nouvelle copro propre pour isoler la boucle d'appel/paiement.
  v_copro := create_clean_test_copro_seeded('0071-cancel');
  SELECT id INTO v_n   FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_lot FROM lots WHERE copro_id=v_copro ORDER BY id LIMIT 1;
  SELECT id INTO v_budget FROM budgets WHERE copro_id=v_copro AND budget_type='current' LIMIT 1;
  IF v_budget IS NULL THEN RAISE EXCEPTION 'F setup : aucun budget current dans la copro seedée'; END IF;

  -- (F1) appel posté sans paiement -> annulation OK.
  v_call := post_budget_call_for_funds(v_copro, v_n, v_budget, 'Appel test cancel', 1, current_date, current_date + 30, 1.0, NULL, NULL);
  v_call_id := (v_call->>'call_id')::uuid;
  v_call_tx := (v_call->>'ledger_tx_id')::uuid;
  SELECT cancel_call_for_funds(v_call_id, 'annulation test') INTO v_rev;
  IF NOT (v_rev->>'success')::boolean THEN RAISE EXCEPTION 'F1 : cancel KO : %', v_rev; END IF;
  SELECT status::text, ledger_tx_id INTO v_status, v_open_period FROM call_for_funds WHERE id=v_call_id;
  IF v_status <> 'cancelled' THEN RAISE EXCEPTION 'F1 : statut appel=% (attendu cancelled)', v_status; END IF;
  IF v_open_period IS NULL THEN RAISE EXCEPTION 'F1 : ledger_tx_id effacé (doit être conservé)'; END IF;
  -- extourne de l'écriture d'appel présente.
  SELECT count(*) INTO v_cnt FROM ledger_transactions WHERE source_type='od' AND (metadata->>'reversal_of')=v_call_tx::text;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'F1 : extourne de l''appel absente (count=%)', v_cnt; END IF;

  -- (F2) appel AVEC paiement imputé -> refus strict. On impute EXPLICITEMENT sur une ligne de CET
  --   appel (sinon le FIFO viserait un appel seedé plus ancien et le refus ne se déclencherait pas).
  v_call := post_budget_call_for_funds(v_copro, v_n, v_budget, 'Appel test paye', 1, current_date, current_date + 30, 1.0, NULL, NULL);
  v_call_id := (v_call->>'call_id')::uuid;
  SELECT id, lot_id INTO v_line, v_lot FROM call_for_funds_lines WHERE call_id=v_call_id LIMIT 1;
  IF v_line IS NULL THEN RAISE EXCEPTION 'F2 setup : l''appel n''a pas de ligne'; END IF;
  PERFORM post_owner_payment(v_copro, v_n, v_lot, 50, current_date, 'transfer', NULL, ARRAY[v_line], NULL, NULL);
  ok := false;
  BEGIN
    PERFORM cancel_call_for_funds(v_call_id, 'tentative');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%paiements imputés%' THEN ok := true; ELSE RAISE; END IF;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'F2 : annulation d''un appel payé acceptée (attendu refus strict)'; END IF;

  -- ════════════════════════ G. RESSERREMENT tr_cff_ledger_required ════════════════════════
  -- Appel FRAIS posté puis annulé proprement ; on efface ensuite son ledger_tx_id et on force la
  -- contrainte différée -> doit lever (un appel annulé+émis doit garder son écriture).
  v_call := post_budget_call_for_funds(v_copro, v_n, v_budget, 'Appel test resserrement', 1, current_date, current_date + 30, 1.0, NULL, NULL);
  v_call_id := (v_call->>'call_id')::uuid;
  PERFORM cancel_call_for_funds(v_call_id, 'pour test resserrement');
  ok := false;
  BEGIN
    UPDATE call_for_funds SET ledger_tx_id = NULL WHERE id=v_call_id;
    SET CONSTRAINTS ALL IMMEDIATE;
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%conserver son écriture%' THEN ok := true; ELSE RAISE; END IF;
  END;
  IF NOT ok THEN RAISE EXCEPTION 'G : resserrement tr_cff_ledger_required non déclenché (cancelled+émis sans tx accepté)'; END IF;
  SET CONSTRAINTS ALL DEFERRED;

  -- ════════════════════════ H. INTÉGRITÉ après extourne d'appel ════════════════════════
  -- Copro neuve : appel posté + extourne -> le solde 450-1 du lot revient à 0, audit propre.
  v_copro := create_clean_test_copro_seeded('0071-integrite');
  SELECT id INTO v_n      FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_a450_1 FROM accounts WHERE copro_id=v_copro AND code='450-1';
  SELECT id INTO v_budget FROM budgets  WHERE copro_id=v_copro AND budget_type='current' LIMIT 1;

  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_lot_bal_before
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.account_id=v_a450_1;

  v_call := post_budget_call_for_funds(v_copro, v_n, v_budget, 'Appel integrite', 1, current_date, current_date + 30, 1.0, NULL, NULL);
  PERFORM cancel_call_for_funds((v_call->>'call_id')::uuid, 'annulation integrite');

  SELECT round(coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0),2) INTO v_lot_bal_after
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.account_id=v_a450_1;
  IF abs(v_lot_bal_after - v_lot_bal_before) > 0.01 THEN
    RAISE EXCEPTION 'H : solde 450-1 non rétabli après extourne (avant=% après=%)', v_lot_bal_before, v_lot_bal_after;
  END IF;

  SELECT count(*) INTO v_audit FROM audit_finance_integrity(v_copro);
  IF v_audit <> 0 THEN RAISE EXCEPTION 'H : audit_finance_integrity remonte % anomalie(s)', v_audit; END IF;
  SELECT count(*) INTO v_mismatch FROM v_lot_vs_gl_mismatch WHERE copro_id=v_copro;
  IF v_mismatch <> 0 THEN RAISE EXCEPTION 'H : v_lot_vs_gl_mismatch remonte % ligne(s)', v_mismatch; END IF;

  RAISE NOTICE 'GATE 0071 OK : extourne générique (od/inversée/metadata/origine intacte) + refus (double/draft/régénérable) + cas central période close->open + cancel_call (ok sans paiement / refus strict avec paiement) + resserrement trigger + intégrité rétablie';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
