-- GATE E2E — AVOIRS FOURNISSEURS (notes de crédit, migration 0044)
-- ============================================================================================
-- Prouve la chaîne avoir : facture (D6xx/C401) -> avoir TOTAL (copie lignes, C6xx/D401) -> avoir
-- PARTIEL -> réconciliation vue (remaining_to_pay net des avoirs) -> garde « avoir d'un avoir ».
-- Décision G5 + SPEC_AVOIRS_FOURNISSEURS.md. Auto-rollback (ROLLBACK_TEST_OK).
--
-- Invariants :
--   1. Avoir total (copie de la facture) : montant = facture.
--   2. Écriture INVERSE : C 6xx = montant (charge diminue) ET D 401 = montant (dette diminue).
--   3. GL de l'avoir équilibré (Σdébit = Σcrédit).
--   4. Vue : facture entièrement créditée -> remaining_to_pay = 0, credited_amount = montant ;
--      l'avoir lui-même -> remaining_to_pay = 0, doc_kind = 'credit_note'.
--   5. Avoir PARTIEL (300 sur 1000) -> remaining_to_pay = 700, credited_amount = 300.
--   6. Garde : un avoir d'un AVOIR (original_invoice_id pointant un credit_note) est REJETÉ.
--   7. Intégrité globale conservée : audit_finance_integrity = 0.
DO $$
DECLARE
  v_copro    uuid;
  v_period   uuid;
  v_tiers    uuid;
  v_acc616   uuid;
  v_inv      jsonb;
  v_inv_id   uuid;
  v_cn       jsonb;
  v_cn_id    uuid;
  v_inv2     jsonb;
  v_inv2_id  uuid;
  v_c616     numeric;
  v_c401     numeric;
  v_bal      numeric;
  v_reste    numeric;
  v_credite  numeric;
  v_kind     text;
  v_status   text;
  v_audit    int;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('e2e-avoir-fournisseur');
  SELECT id INTO v_period FROM accounting_periods WHERE copro_id = v_copro AND status = 'open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_tiers  FROM tiers WHERE copro_id = v_copro AND is_supplier = true LIMIT 1;
  SELECT id INTO v_acc616 FROM accounts WHERE copro_id = v_copro AND code = '616';

  -- Facture fournisseur 1000 (D616 / C401).
  v_inv := post_supplier_invoice(v_copro, v_period, v_tiers, 'F-AVOIR-1', current_date, current_date + 30,
    'Facture test avoir', jsonb_build_array(jsonb_build_object('account_id', v_acc616, 'label', 'Prime', 'amount', 1000)),
    null, null, true, null, null, null);
  v_inv_id := (v_inv->>'invoice_id')::uuid;

  -- 1) Avoir TOTAL par copie des lignes de la facture.
  v_cn := post_supplier_credit_note(v_copro, v_period, v_tiers, 'AV-1', current_date, 'Avoir total',
    null, v_inv_id, null, null, null, null);
  v_cn_id := (v_cn->>'credit_note_id')::uuid;
  IF NOT (v_cn->>'success')::boolean OR abs((v_cn->>'total_amount')::numeric - 1000) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (1) : avoir total KO : %', v_cn;
  END IF;

  -- 2+3) Écriture inverse C616/D401, équilibrée (sur les tx d'avoir = source_type supplier_credit_note).
  SELECT coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END), 0) INTO v_c616
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted' AND t.source_type = 'supplier_credit_note'
  WHERE a.copro_id = v_copro AND a.code = '616';
  SELECT coalesce(sum(CASE WHEN e.direction='credit' THEN e.amount ELSE -e.amount END), 0) INTO v_c401
  FROM ledger_entries e JOIN accounts a ON a.id = e.account_id
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted' AND t.source_type = 'supplier_credit_note'
  WHERE a.copro_id = v_copro AND a.code = '401';
  IF abs(v_c616 - 1000) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : 616 crédité attendu 1000, trouvé %', v_c616;
  END IF;
  IF abs(v_c401 + 1000) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (2) : 401 débité attendu -1000 (crédit net), trouvé %', v_c401;
  END IF;

  SELECT coalesce(sum(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END), 0) INTO v_bal
  FROM ledger_entries e
  JOIN ledger_transactions t ON t.id = e.tx_id AND t.status = 'posted' AND t.source_type = 'supplier_credit_note'
  WHERE e.copro_id = v_copro;
  IF abs(v_bal) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (3) : écriture avoir déséquilibrée, Σ(débit−crédit)=%', v_bal;
  END IF;

  -- 4) Vue : facture nette = 0, créditée 1000 ; l'avoir = 0 à payer et doc_kind credit_note.
  SELECT remaining_to_pay, credited_amount INTO v_reste, v_credite
  FROM v_supplier_invoices_overview WHERE id = v_inv_id;
  IF abs(v_reste) > 0.01 OR abs(v_credite - 1000) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (4) : facture reste=% credité=% (attendu 0 / 1000)', v_reste, v_credite;
  END IF;
  SELECT remaining_to_pay, doc_kind INTO v_reste, v_kind
  FROM v_supplier_invoices_overview WHERE id = v_cn_id;
  IF abs(v_reste) > 0.01 OR v_kind <> 'credit_note' THEN
    RAISE EXCEPTION 'ASSERT FAIL (4) : avoir reste=% kind=% (attendu 0 / credit_note)', v_reste, v_kind;
  END IF;

  -- 5) Avoir PARTIEL (300 sur une 2e facture de 1000) -> reste 700, crédité 300.
  v_inv2 := post_supplier_invoice(v_copro, v_period, v_tiers, 'F-AVOIR-2', current_date, current_date + 30,
    'Facture 2', jsonb_build_array(jsonb_build_object('account_id', v_acc616, 'label', 'Prime2', 'amount', 1000)),
    null, null, true, null, null, null);
  v_inv2_id := (v_inv2->>'invoice_id')::uuid;
  PERFORM post_supplier_credit_note(v_copro, v_period, v_tiers, 'AV-2', current_date, 'Avoir partiel',
    jsonb_build_array(jsonb_build_object('account_id', v_acc616, 'label', 'remise', 'amount', 300)),
    v_inv2_id, null, null, null, null);
  SELECT remaining_to_pay, credited_amount INTO v_reste, v_credite
  FROM v_supplier_invoices_overview WHERE id = v_inv2_id;
  IF abs(v_reste - 700) > 0.01 OR abs(v_credite - 300) > 0.01 THEN
    RAISE EXCEPTION 'ASSERT FAIL (5) : avoir partiel reste=% credité=% (attendu 700 / 300)', v_reste, v_credite;
  END IF;

  -- 6) Garde : un avoir d'un AVOIR doit être rejeté (original doit être une facture).
  BEGIN
    PERFORM post_supplier_credit_note(v_copro, v_period, v_tiers, 'AV-BAD', current_date, 'Avoir invalide',
      jsonb_build_array(jsonb_build_object('account_id', v_acc616, 'label', 'x', 'amount', 50)),
      v_cn_id, null, null, null, null);
    RAISE EXCEPTION 'ASSERT FAIL (6) : avoir-d-avoir aurait dû être rejeté';
  EXCEPTION
    WHEN sqlstate '23514' THEN NULL;  -- comportement attendu
  END;

  -- 8) Paiement NET d'une facture partiellement créditée (700 sur net 700) -> 'paid' (B3) ;
  --    puis sur-paiement (net dépassé) rejeté.
  PERFORM post_supplier_payment(v_copro, v_period, v_inv2_id, 700, current_date, 'transfer', 'règlement net', 'pay-net-1');
  SELECT status::text INTO v_status FROM supplier_invoices WHERE id = v_inv2_id;
  IF v_status <> 'paid' THEN
    RAISE EXCEPTION 'ASSERT FAIL (8) : facture créditée payée au net (700/700) attendue paid, trouvé %', v_status;
  END IF;
  BEGIN
    PERFORM post_supplier_payment(v_copro, v_period, v_inv2_id, 1, current_date, 'transfer', 'sur-paiement', 'pay-net-over');
    RAISE EXCEPTION 'ASSERT FAIL (8) : sur-paiement au-delà du net aurait dû être rejeté';
  EXCEPTION
    WHEN sqlstate '23514' THEN NULL;
  END;

  -- 9) Payer un AVOIR (comme s'il était une facture) est rejeté (B1).
  BEGIN
    PERFORM post_supplier_payment(v_copro, v_period, v_cn_id, 100, current_date, 'transfer', 'paie avoir', 'pay-avoir');
    RAISE EXCEPTION 'ASSERT FAIL (9) : payer un avoir aurait dû être rejeté';
  EXCEPTION
    WHEN sqlstate '23514' THEN NULL;
  END;

  -- 7) Intégrité globale conservée.
  SELECT count(*) INTO v_audit FROM audit_finance_integrity(v_copro);
  IF v_audit <> 0 THEN
    RAISE EXCEPTION 'ASSERT FAIL (7) : audit_finance_integrity = % (attendu 0)', v_audit;
  END IF;

  RAISE NOTICE 'GATE AVOIR OK : écriture inverse C616/D401, vue nette (total reste=0/crédité=1000 ; partiel reste=700), garde avoir-d-avoir, audit=0';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
