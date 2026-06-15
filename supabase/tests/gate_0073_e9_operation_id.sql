-- GATE E2E — 0073 / E9 : operation_id à la SAISIE + filet + garde DURE à la clôture
-- ============================================================================================
-- Prouve :
--   A. post_supplier_invoice (post immédiat) : operation_id forwardé sur la ligne 6xx du GL ET persisté.
--   B. draft -> validate_supplier_invoice : operation_id RELU depuis la ligne persistée -> ligne 6xx du GL.
--   C. FILET v_works_entries_unlinked : flagge une charge TRAVAUX sans operation_id ; ignore une charge
--      COURANTE sans operation_id ; ignore une orpheline DÉJÀ CONTRE-PASSÉE.
--   D. close_works_operation : REFUSE tant qu'orphelin ; après rattachement (contre-passe + re-saisie
--      avec operation_id) RÉUSSIT ; idempotent ; n'altère PAS le grand livre (immutabilité).
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_wbudget uuid; v_tiers uuid;
  v_a_works uuid; v_a_cur uuid; v_a512 uuid;
  v_inv jsonb; v_inv_id uuid; v_tx uuid; v_orphan_tx uuid; v_close jsonb;
  v_cnt int; v_before int; v_after int; v_status text; ok boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0073-e9');
  SELECT id INTO v_n       FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_a_works FROM accounts WHERE copro_id=v_copro AND charge_nature='travaux' LIMIT 1;
  SELECT id INTO v_a_cur   FROM accounts WHERE copro_id=v_copro AND charge_nature='courant' LIMIT 1;
  SELECT id INTO v_a512    FROM accounts WHERE copro_id=v_copro AND code='512';
  IF v_a_works IS NULL OR v_a_cur IS NULL THEN RAISE EXCEPTION '0073 setup : compte charge_nature travaux/courant manquant (w=% c=%)', v_a_works, v_a_cur; END IF;

  INSERT INTO budgets (copro_id, period_id, budget_type, status, name)
  VALUES (v_copro, v_n, 'works', 'draft', 'Operation travaux 0073') RETURNING id INTO v_wbudget;
  INSERT INTO tiers (copro_id, name, is_supplier) VALUES (v_copro, 'Fournisseur 0073', true) RETURNING id INTO v_tiers;

  -- ════════════ A. post_supplier_invoice immédiat + operation_id ════════════
  v_inv := post_supplier_invoice(v_copro, v_n, v_tiers, 'INV-A', current_date, current_date + 30, 'Travaux A',
    jsonb_build_array(jsonb_build_object('account_id', v_a_works, 'label', 'Charge travaux A', 'amount', 100, 'operation_id', v_wbudget::text)),
    NULL, NULL, true, NULL, NULL, NULL);
  v_inv_id := (v_inv->>'invoice_id')::uuid;
  v_tx     := (v_inv->>'ledger_tx_id')::uuid;
  SELECT count(*) INTO v_cnt FROM ledger_entries WHERE tx_id=v_tx AND account_id=v_a_works AND operation_id=v_wbudget;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'A : ligne 6xx du GL sans operation_id (count=%)', v_cnt; END IF;
  SELECT count(*) INTO v_cnt FROM supplier_invoice_lines WHERE invoice_id=v_inv_id AND operation_id=v_wbudget;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'A : supplier_invoice_lines.operation_id non persisté'; END IF;

  -- ════════════ B. draft -> validate (relit operation_id) ════════════
  v_inv := post_supplier_invoice(v_copro, v_n, v_tiers, 'INV-B', current_date, current_date + 30, 'Travaux B',
    jsonb_build_array(jsonb_build_object('account_id', v_a_works, 'label', 'Charge travaux B', 'amount', 50, 'operation_id', v_wbudget::text)),
    NULL, NULL, false, NULL, NULL, NULL);
  v_inv_id := (v_inv->>'invoice_id')::uuid;
  IF (v_inv->>'ledger_tx_id') IS NOT NULL THEN RAISE EXCEPTION 'B : un brouillon ne doit pas poster d''écriture'; END IF;
  v_inv := validate_supplier_invoice(v_inv_id);
  v_tx  := (v_inv->>'ledger_tx_id')::uuid;
  SELECT count(*) INTO v_cnt FROM ledger_entries WHERE tx_id=v_tx AND account_id=v_a_works AND operation_id=v_wbudget;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'B : validate n''a pas relu operation_id sur la ligne 6xx (count=%)', v_cnt; END IF;

  -- ════════════ C. FILET v_works_entries_unlinked ════════════
  -- Charge travaux SANS operation_id -> orpheline détectée.
  v_orphan_tx := (create_ledger_transaction(v_copro, v_n, current_date, 'Charge orpheline', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a_works, 'direction', 'debit',  'amount', 30, 'entry_label', 'orpheline'),
      jsonb_build_object('account_id', v_a512,    'direction', 'credit', 'amount', 30, 'entry_label', 'banque')
    ), true)->>'tx_id')::uuid;
  SELECT count(*) INTO v_cnt FROM v_works_entries_unlinked WHERE copro_id=v_copro AND tx_id=v_orphan_tx;
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'C : charge travaux orpheline non détectée par le filet (count=%)', v_cnt; END IF;
  -- Charge COURANTE sans operation_id -> NON flaggée.
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Charge courante', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a_cur, 'direction', 'debit',  'amount', 20, 'entry_label', 'courant'),
      jsonb_build_object('account_id', v_a512,  'direction', 'credit', 'amount', 20, 'entry_label', 'banque')
    ), true);
  SELECT count(*) INTO v_cnt FROM v_works_entries_unlinked WHERE copro_id=v_copro AND account_id=v_a_cur;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'C : charge courante flaggée à tort par le filet'; END IF;

  -- ════════════ D. close_works_operation : refus -> rattachement -> succès ════════════
  ok := false;
  BEGIN
    PERFORM close_works_operation(v_copro, v_wbudget);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%non rattachée%' THEN ok := true; ELSE RAISE; END IF; END;
  IF NOT ok THEN RAISE EXCEPTION 'D : clôture acceptée malgré une charge orpheline (attendu refus)'; END IF;

  -- Rattacher = contre-passer l'orpheline (0071) puis re-saisir AVEC operation_id.
  PERFORM reverse_ledger_transaction(v_orphan_tx, 'rattachement E9', NULL);
  SELECT count(*) INTO v_cnt FROM v_works_entries_unlinked WHERE copro_id=v_copro AND tx_id=v_orphan_tx;
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'C/D : orpheline contre-passée encore flaggée (count=%)', v_cnt; END IF;
  PERFORM create_ledger_transaction(v_copro, v_n, current_date, 'Charge rattachee', 'budget_expense', NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', v_a_works, 'direction', 'debit',  'amount', 30, 'entry_label', 'rattachee', 'operation_id', v_wbudget::text),
      jsonb_build_object('account_id', v_a512,    'direction', 'credit', 'amount', 30, 'entry_label', 'banque')
    ), true);

  SELECT count(*) INTO v_before FROM ledger_entries WHERE copro_id=v_copro;
  v_close := close_works_operation(v_copro, v_wbudget);
  IF NOT (v_close->>'success')::boolean THEN RAISE EXCEPTION 'D : clôture KO après rattachement : %', v_close; END IF;
  SELECT status::text INTO v_status FROM budgets WHERE id=v_wbudget;
  IF v_status <> 'closed' THEN RAISE EXCEPTION 'D : budget non clôturé (statut=%)', v_status; END IF;

  -- Idempotence + immutabilité GL.
  v_close := close_works_operation(v_copro, v_wbudget);
  IF (v_close->>'already_closed') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'D : clôture non idempotente'; END IF;
  SELECT count(*) INTO v_after FROM ledger_entries WHERE copro_id=v_copro;
  IF v_after <> v_before THEN RAISE EXCEPTION 'D : la clôture a modifié le GL (% -> %)', v_before, v_after; END IF;

  RAISE NOTICE 'GATE 0073 OK : operation_id à la saisie (post + draft/validate) + filet (travaux orphelin détecté, courant ignoré, contre-passé exclu) + close_works_operation (refus->rattachement->succès, idempotent, GL intact)';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
