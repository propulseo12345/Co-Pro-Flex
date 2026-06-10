-- GATE E2E — VALIDATION & PAIEMENT FACTURE FOURNISSEUR AU GRAND LIVRE (0046 / J2.8)
-- ============================================================================================
-- Brouillon (sans écriture) -> validate_supplier_invoice (D6xx/C401) -> idempotence -> refus
-- brouillon vide -> garde non-gestionnaire -> post_supplier_payment (D401/C512, paid) -> audit=0.
-- Lancé par db-test.mjs (contexte service_role préfixé). Auto-rollback (ROLLBACK_TEST_OK).
DO $$
DECLARE
  v_copro uuid; v_period uuid; v_tiers uuid; v_acc616 uuid; v_acc401 uuid; v_acc512 uuid;
  v_inv jsonb; v_inv_id uuid; v_res jsonb; v_tx uuid;
  v_debit numeric; v_credit numeric; v_d616 numeric; v_c401 numeric; v_ntx int;
  v_empty_id uuid; v_status text; v_pay jsonb; v_512 numeric; v_audit int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  v_copro := create_clean_test_copro_seeded('e2e-valid-facture');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_tiers  FROM tiers WHERE copro_id = v_copro AND is_supplier = true LIMIT 1;
  SELECT id INTO v_acc616 FROM accounts WHERE copro_id = v_copro AND code='616';
  SELECT id INTO v_acc401 FROM accounts WHERE copro_id = v_copro AND code='401';
  SELECT id INTO v_acc512 FROM accounts WHERE copro_id = v_copro AND code='512';

  -- BROUILLON (post_immediately=false) : 2 lignes 600 + 400 sur 616, total 1000.
  v_inv := post_supplier_invoice(v_copro, v_period, v_tiers, 'F-VAL-1', current_date, current_date+30,
    'Facture a valider', jsonb_build_array(
      jsonb_build_object('account_id', v_acc616, 'label', 'Part A', 'amount', 600),
      jsonb_build_object('account_id', v_acc616, 'label', 'Part B', 'amount', 400)),
    null, null, false, null, null, null);
  v_inv_id := (v_inv->>'invoice_id')::uuid;

  -- (1) Brouillon : aucune écriture.
  SELECT status::text INTO v_status FROM supplier_invoices WHERE id = v_inv_id;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'ASSERT(1a): statut % attendu draft', v_status; END IF;
  IF EXISTS (SELECT 1 FROM ledger_transactions WHERE source_type='supplier_invoice' AND source_id=v_inv_id) THEN
    RAISE EXCEPTION 'ASSERT(1b): le brouillon a deja une ecriture'; END IF;

  -- (2) Validation -> posted + ledger_tx + écriture équilibrée.
  v_res := validate_supplier_invoice(v_inv_id);
  IF NOT (v_res->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT(2a): validation KO %', v_res; END IF;
  SELECT status::text, ledger_tx_id INTO v_status, v_tx FROM supplier_invoices WHERE id = v_inv_id;
  IF v_status <> 'posted' OR v_tx IS NULL THEN RAISE EXCEPTION 'ASSERT(2b): statut/tx KO (%, %)', v_status, v_tx; END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE 0 END),0),
         coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE 0 END),0)
    INTO v_debit, v_credit
  FROM ledger_entries e WHERE e.tx_id = v_tx;
  IF abs(v_debit - v_credit) > 0.01 OR abs(v_debit - 1000) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT(2c): ecriture desequilibree D=% C=%', v_debit, v_credit; END IF;
  SELECT coalesce(sum(amount),0) INTO v_d616 FROM ledger_entries WHERE tx_id=v_tx AND account_id=v_acc616 AND direction='debit';
  SELECT coalesce(sum(amount),0) INTO v_c401 FROM ledger_entries WHERE tx_id=v_tx AND account_id=v_acc401 AND direction='credit';
  IF abs(v_d616-1000)>0.01 OR abs(v_c401-1000)>0.01 THEN
    RAISE EXCEPTION 'ASSERT(2d): D616=% (att.1000) C401=% (att.1000)', v_d616, v_c401; END IF;

  -- (3) Idempotence : re-valider -> already_posted + 1 seule tx.
  v_res := validate_supplier_invoice(v_inv_id);
  IF (v_res->>'already_posted') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'ASSERT(3a): re-validation non idempotente %', v_res; END IF;
  SELECT count(*) INTO v_ntx FROM ledger_transactions WHERE source_type='supplier_invoice' AND source_id=v_inv_id;
  IF v_ntx <> 1 THEN RAISE EXCEPTION 'ASSERT(3b): % ecritures pour la facture (att.1)', v_ntx; END IF;

  -- (4) Brouillon SANS ligne (INSERT direct, comme le quick-create modal liste : en-tête seul, un
  -- total estimé > 0 mais aucune ligne de ventilation) -> validation refusée (23514).
  -- NB : la base impose total_amount > 0 (ck_supplier_invoice_total) → le brouillon vide a un total
  -- estimé (120), mais ZÉRO ligne → c'est la garde « 0 ligne » de la RPC qui doit le refuser.
  INSERT INTO supplier_invoices (copro_id, period_id, tiers_id, invoice_number, invoice_date, due_date, label, total_amount, status)
  VALUES (v_copro, v_period, v_tiers, 'F-EMPTY', current_date, current_date+30, 'Brouillon vide', 120, 'draft')
  RETURNING id INTO v_empty_id;
  BEGIN
    PERFORM validate_supplier_invoice(v_empty_id);
    RAISE EXCEPTION 'ASSERT(4): brouillon sans ligne accepte (attendu 23514)';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- (5) Garde : un non-gestionnaire (uid sans membership) est refusé (42501).
  PERFORM set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role','authenticated')::text, true);
  BEGIN
    PERFORM validate_supplier_invoice(v_inv_id);
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
    RAISE EXCEPTION 'ASSERT(5): non-gestionnaire accepte (attendu 42501)';
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  END;

  -- (6) Paiement -> D401/C512, statut paid.
  v_pay := post_supplier_payment(v_copro, v_period, v_inv_id, 1000, current_date, 'transfer', 'PAY-1', 'idem-val-1');
  IF NOT (v_pay->>'success')::boolean THEN RAISE EXCEPTION 'ASSERT(6a): paiement KO %', v_pay; END IF;
  SELECT status::text INTO v_status FROM supplier_invoices WHERE id = v_inv_id;
  IF v_status <> 'paid' THEN RAISE EXCEPTION 'ASSERT(6b): statut % attendu paid', v_status; END IF;
  SELECT coalesce(sum(CASE WHEN direction='credit' THEN amount ELSE -amount END),0) INTO v_512
  FROM ledger_entries WHERE tx_id = (v_pay->>'ledger_tx_id')::uuid AND account_id = v_acc512;
  IF abs(v_512 - 1000) > 0.01 THEN RAISE EXCEPTION 'ASSERT(6c): C512=% attendu 1000', v_512; END IF;

  -- (7) Intégrité globale.
  SELECT count(*) INTO v_audit FROM audit_finance_integrity(v_copro);
  IF v_audit <> 0 THEN RAISE EXCEPTION 'ASSERT(7): audit_finance_integrity=% (attendu 0)', v_audit; END IF;

  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK : validation+paiement facture au GL prouves';
  ELSE RAISE; END IF;
END $$;
