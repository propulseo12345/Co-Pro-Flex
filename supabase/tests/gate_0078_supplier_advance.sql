-- GATE E2E — 0078 / F8 Brique 3 : acompte fournisseur 409 (D409/C512 ; apurement D401/C409)
-- ============================================================================================
-- Prouve : acompte SANS facture posté (409 débité) ; idempotence ; apurement partiel laissant
--   remaining>0 puis 2e apurement ; sur-imputation au-delà du net rejetée.
-- Auto-rollback (ROLLBACK_TEST_OK). Contexte service_role préfixé par db-test.mjs.
DO $$
DECLARE
  v_copro uuid; v_n uuid; v_supplier uuid; v_a409 uuid; v_a_charge uuid;
  v_adv jsonb; v_adv_id uuid; v_inv jsonb; v_inv1 uuid; v_inv2 uuid; v_set jsonb;
  v_bal409 numeric; v_cnt int; ok boolean;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"role":"service_role"}', true);

  v_copro := create_clean_test_copro_seeded('0078-advance');
  SELECT id INTO v_n FROM accounting_periods WHERE copro_id=v_copro AND status='open' ORDER BY start_date DESC LIMIT 1;
  SELECT id INTO v_a409 FROM accounts WHERE copro_id=v_copro AND code='409';
  SELECT id INTO v_a_charge FROM accounts WHERE copro_id=v_copro AND charge_nature='courant' LIMIT 1;
  INSERT INTO tiers (copro_id, name, is_supplier) VALUES (v_copro, 'Fournisseur acompte 0078', true) RETURNING id INTO v_supplier;

  -- (1) Acompte SANS facture : D409/C512, 500.
  v_adv := post_supplier_advance(v_copro, v_n, v_supplier, 500, current_date, 'transfer', 'AC-1', 'idem-1');
  v_adv_id := (v_adv->>'advance_id')::uuid;
  SELECT round(coalesce(sum(case when e.direction='debit' then e.amount else -e.amount end),0),2) INTO v_bal409
  FROM ledger_entries e JOIN ledger_transactions t ON t.id=e.tx_id AND t.status='posted'
  WHERE e.copro_id=v_copro AND e.account_id=v_a409;
  IF v_bal409 <> 500 THEN RAISE EXCEPTION '(1) solde 409 attendu 500 (débiteur), trouvé %', v_bal409; END IF;

  -- (2) Idempotence : même clé -> replay, pas de 2e acompte.
  v_adv := post_supplier_advance(v_copro, v_n, v_supplier, 500, current_date, 'transfer', 'AC-1', 'idem-1');
  IF (v_adv->>'idempotent_replay') IS DISTINCT FROM 'true' THEN RAISE EXCEPTION '(2) idempotence non respectée'; END IF;
  SELECT count(*) INTO v_cnt FROM supplier_advances WHERE copro_id=v_copro AND idempotency_key='idem-1';
  IF v_cnt <> 1 THEN RAISE EXCEPTION '(2) % acomptes pour la même clé (attendu 1)', v_cnt; END IF;

  -- (3) Apurement partiel : facture 300 -> min(500,300)=300, remaining 200.
  v_inv := post_supplier_invoice(v_copro, v_n, v_supplier, 'INV-1', current_date, current_date+30, 'Facture 1',
            jsonb_build_array(jsonb_build_object('account_id', v_a_charge, 'label','charge','amount',300)),
            NULL, NULL, true, NULL, NULL, NULL);
  v_inv1 := (v_inv->>'invoice_id')::uuid;
  v_set := settle_supplier_advance_on_invoice(v_copro, v_adv_id, v_inv1, current_date, NULL);
  IF (v_set->>'settled')::numeric <> 300 THEN RAISE EXCEPTION '(3) apurement attendu 300, trouvé %', v_set->>'settled'; END IF;
  IF (v_set->>'remaining')::numeric <> 200 THEN RAISE EXCEPTION '(3) remaining attendu 200, trouvé %', v_set->>'remaining'; END IF;

  -- (4) 2e apurement sur une AUTRE facture (150) : min(200,150)=150, remaining 50.
  v_inv := post_supplier_invoice(v_copro, v_n, v_supplier, 'INV-2', current_date, current_date+30, 'Facture 2',
            jsonb_build_array(jsonb_build_object('account_id', v_a_charge, 'label','charge','amount',150)),
            NULL, NULL, true, NULL, NULL, NULL);
  v_inv2 := (v_inv->>'invoice_id')::uuid;
  v_set := settle_supplier_advance_on_invoice(v_copro, v_adv_id, v_inv2, current_date, NULL);
  IF (v_set->>'settled')::numeric <> 150 THEN RAISE EXCEPTION '(4) apurement attendu 150, trouvé %', v_set->>'settled'; END IF;
  IF (v_set->>'remaining')::numeric <> 50 THEN RAISE EXCEPTION '(4) remaining attendu 50, trouvé %', v_set->>'remaining'; END IF;

  -- (5) Sur-imputation : la facture 1 est déjà soldée (net 401 = 0) -> rejet.
  ok := false;
  BEGIN
    PERFORM settle_supplier_advance_on_invoice(v_copro, v_adv_id, v_inv1, current_date, NULL);
  EXCEPTION WHEN OTHERS THEN IF SQLERRM LIKE '%entièrement réglée%' THEN ok := true; ELSE RAISE; END IF; END;
  IF NOT ok THEN RAISE EXCEPTION '(5) sur-imputation acceptée (facture déjà soldée)'; END IF;

  RAISE NOTICE 'GATE 0078 OK : acompte 409 sans facture (D409/C512) + idempotence + apurement partiel (300 puis 150, remaining 50) + sur-imputation rejetée';
  RAISE EXCEPTION 'ROLLBACK_TEST_OK';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM = 'ROLLBACK_TEST_OK' THEN RAISE NOTICE 'OK'; ELSE RAISE; END IF;
END $$;
