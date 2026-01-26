-- ============================================================================
-- TESTS COMPLETS : Invariants Finance & RLS Owner-Safe
-- CoProFlex - Validation Audit Logique Métier
-- Date: 2026-01-26
-- ============================================================================
--
-- TESTS COUVERTS:
-- 1) Call total mismatch doit echouer
-- 2) Call status se met a jour apres paiement partiel
-- 3) Over-allocation doit echouer
-- 4) Invoice total mismatch doit echouer
-- 5) Supplier payment depasse restant doit echouer
-- 6) RLS: un coproprietaire ne voit que ses lots
-- 7) RLS: AG draft invisible aux coproprietaires
-- 8) RLS: Documents selon confidentialite
--
-- USAGE: Executer ce fichier apres les migrations
-- Les tests utilisent des transactions SAVEPOINT/ROLLBACK
-- ============================================================================

-- ============================================================================
-- SECTION 0: CONFIGURATION ET HELPERS DE TEST
-- ============================================================================

-- Fonction helper pour simuler un utilisateur
CREATE OR REPLACE FUNCTION test_set_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_user_id::text)::text,
    true);
END;
$$;

-- Fonction helper pour reset utilisateur
CREATE OR REPLACE FUNCTION test_clear_user()
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '{}', true);
END;
$$;

-- ============================================================================
-- SECTION 1: TEST INVARIANT APPEL TOTAL (Action 1)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_period_id UUID;
  v_key_id UUID;
  v_lot_id UUID;
  v_call_id UUID;
  v_line_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1: INVARIANT APPEL TOTAL';
  RAISE NOTICE '========================================';

  -- Setup: recuperer des IDs existants
  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_key_id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_lot_id FROM lots WHERE copro_id = v_copro_id LIMIT 1;

  IF v_copro_id IS NULL OR v_period_id IS NULL OR v_key_id IS NULL OR v_lot_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees de base manquantes';
    RETURN;
  END IF;

  -- Test 1.1: Creation coherente (DOIT PASSER)
  v_test_name := '1.1 Creation appel + ligne coherente';
  BEGIN
    SAVEPOINT test_1_1;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Invariant 1', CURRENT_DATE, CURRENT_DATE + 30, 1000.00, 'draft')
    RETURNING id INTO v_call_id;

    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 1000.00);

    RAISE NOTICE '[PASS] %', v_test_name;
    ROLLBACK TO test_1_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_1_1;
  END;

  -- Test 1.2: Violation invariant - ligne > total (DOIT ECHOUER)
  v_test_name := '1.2 Violation - ligne excede total';
  BEGIN
    SAVEPOINT test_1_2;
    v_error_caught := FALSE;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Violation', CURRENT_DATE, CURRENT_DATE + 30, 500.00, 'draft')
    RETURNING id INTO v_call_id;

    BEGIN
      INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
      VALUES (v_copro_id, v_call_id, v_lot_id, 600.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Violation non detectee!', v_test_name;
    END IF;

    ROLLBACK TO test_1_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_1_2;
  END;

  -- Test 1.3: Violation invariant - somme lignes != total
  v_test_name := '1.3 Violation - somme lignes != total';
  BEGIN
    SAVEPOINT test_1_3;
    v_error_caught := FALSE;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Multi Lignes', CURRENT_DATE, CURRENT_DATE + 30, 1000.00, 'draft')
    RETURNING id INTO v_call_id;

    -- Premiere ligne OK
    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 400.00);

    -- Deuxieme ligne qui depasse
    BEGIN
      INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
      VALUES (v_copro_id, v_call_id, (SELECT id FROM lots WHERE copro_id = v_copro_id AND id != v_lot_id LIMIT 1), 700.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Violation non detectee!', v_test_name;
    END IF;

    ROLLBACK TO test_1_3;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_1_3;
  END;

END $$;

-- ============================================================================
-- SECTION 2: TEST AUTO-UPDATE STATUS APPEL (Action 2)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_period_id UUID;
  v_key_id UUID;
  v_lot_id UUID;
  v_call_id UUID;
  v_line_id UUID;
  v_payment_id UUID;
  v_status call_for_funds_status;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2: AUTO-UPDATE STATUS APPEL';
  RAISE NOTICE '========================================';

  -- Setup
  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_key_id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_lot_id FROM lots WHERE copro_id = v_copro_id LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees de base manquantes';
    RETURN;
  END IF;

  -- Test 2.1: Paiement partiel -> status partially_paid
  v_test_name := '2.1 Paiement partiel -> partially_paid';
  BEGIN
    SAVEPOINT test_2_1;

    -- Creer appel de 200 EUR
    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Status', CURRENT_DATE, CURRENT_DATE + 30, 200.00, 'issued')
    RETURNING id INTO v_call_id;

    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 200.00)
    RETURNING id INTO v_line_id;

    -- Paiement partiel de 100 EUR
    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 100.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
    VALUES (v_copro_id, v_payment_id, v_line_id, 100.00);

    -- Verifier status
    SELECT status INTO v_status FROM call_for_funds WHERE id = v_call_id;

    IF v_status = 'partially_paid' THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Expected partially_paid, got %', v_test_name, v_status;
    END IF;

    ROLLBACK TO test_2_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_2_1;
  END;

  -- Test 2.2: Paiement complet -> status paid
  v_test_name := '2.2 Paiement complet -> paid';
  BEGIN
    SAVEPOINT test_2_2;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Complet', CURRENT_DATE, CURRENT_DATE + 30, 150.00, 'issued')
    RETURNING id INTO v_call_id;

    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 150.00)
    RETURNING id INTO v_line_id;

    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 150.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
    VALUES (v_copro_id, v_payment_id, v_line_id, 150.00);

    SELECT status INTO v_status FROM call_for_funds WHERE id = v_call_id;

    IF v_status = 'paid' THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Expected paid, got %', v_test_name, v_status;
    END IF;

    ROLLBACK TO test_2_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_2_2;
  END;

END $$;

-- ============================================================================
-- SECTION 3: TEST SUR-ALLOCATION PAIEMENTS (Action 3)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_period_id UUID;
  v_key_id UUID;
  v_lot_id UUID;
  v_call_id UUID;
  v_line_id UUID;
  v_payment_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3: SUR-ALLOCATION PAIEMENTS';
  RAISE NOTICE '========================================';

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_key_id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_lot_id FROM lots WHERE copro_id = v_copro_id LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees de base manquantes';
    RETURN;
  END IF;

  -- Test 3.1: Allocation valide
  v_test_name := '3.1 Allocation valide';
  BEGIN
    SAVEPOINT test_3_1;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Alloc', CURRENT_DATE, CURRENT_DATE + 30, 300.00, 'issued')
    RETURNING id INTO v_call_id;

    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 300.00)
    RETURNING id INTO v_line_id;

    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 100.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
    VALUES (v_copro_id, v_payment_id, v_line_id, 100.00);

    RAISE NOTICE '[PASS] %', v_test_name;
    ROLLBACK TO test_3_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_3_1;
  END;

  -- Test 3.2: Sur-allocation bloquee
  v_test_name := '3.2 Sur-allocation bloquee';
  BEGIN
    SAVEPOINT test_3_2;
    v_error_caught := FALSE;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test OverAlloc', CURRENT_DATE, CURRENT_DATE + 30, 500.00, 'issued')
    RETURNING id INTO v_call_id;

    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 500.00)
    RETURNING id INTO v_line_id;

    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 50.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    -- Tenter d'allouer 60 EUR sur paiement de 50 EUR
    BEGIN
      INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
      VALUES (v_copro_id, v_payment_id, v_line_id, 60.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Sur-allocation non bloquee!', v_test_name;
    END IF;

    ROLLBACK TO test_3_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_3_2;
  END;

  -- Test 3.3: Allocation negative bloquee
  v_test_name := '3.3 Allocation negative bloquee';
  BEGIN
    SAVEPOINT test_3_3;
    v_error_caught := FALSE;

    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Neg', CURRENT_DATE, CURRENT_DATE + 30, 100.00, 'issued')
    RETURNING id INTO v_call_id;

    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 100.00)
    RETURNING id INTO v_line_id;

    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 100.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    BEGIN
      INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
      VALUES (v_copro_id, v_payment_id, v_line_id, -10.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Allocation negative non bloquee!', v_test_name;
    END IF;

    ROLLBACK TO test_3_3;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_3_3;
  END;

END $$;

-- ============================================================================
-- SECTION 4: TEST INVARIANT FACTURE FOURNISSEUR (Action 4 - NEW)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_period_id UUID;
  v_supplier_id UUID;
  v_account_id UUID;
  v_invoice_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4: INVARIANT FACTURE FOURNISSEUR';
  RAISE NOTICE '========================================';

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_supplier_id FROM suppliers WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_account_id FROM accounts WHERE copro_id = v_copro_id AND code LIKE '6%' LIMIT 1;

  IF v_supplier_id IS NULL OR v_account_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees de base manquantes (supplier ou account)';
    RETURN;
  END IF;

  -- Test 4.1: Creation coherente facture + lignes
  v_test_name := '4.1 Creation facture + lignes coherentes';
  BEGIN
    SAVEPOINT test_4_1;

    INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test Facture', 500.00, 'draft')
    RETURNING id INTO v_invoice_id;

    INSERT INTO supplier_invoice_lines (copro_id, invoice_id, account_id, label, amount)
    VALUES
      (v_copro_id, v_invoice_id, v_account_id, 'Ligne 1', 300.00),
      (v_copro_id, v_invoice_id, v_account_id, 'Ligne 2', 200.00);

    RAISE NOTICE '[PASS] %', v_test_name;
    ROLLBACK TO test_4_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_4_1;
  END;

  -- Test 4.2: Violation - lignes > total
  v_test_name := '4.2 Violation - lignes excedent total';
  BEGIN
    SAVEPOINT test_4_2;
    v_error_caught := FALSE;

    INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test Violation', 400.00, 'draft')
    RETURNING id INTO v_invoice_id;

    -- Premiere ligne OK (200)
    INSERT INTO supplier_invoice_lines (copro_id, invoice_id, account_id, label, amount)
    VALUES (v_copro_id, v_invoice_id, v_account_id, 'Ligne 1', 200.00);

    -- Deuxieme ligne qui depasse (300 -> total 500 > 400)
    BEGIN
      INSERT INTO supplier_invoice_lines (copro_id, invoice_id, account_id, label, amount)
      VALUES (v_copro_id, v_invoice_id, v_account_id, 'Ligne 2', 300.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Violation non detectee!', v_test_name;
    END IF;

    ROLLBACK TO test_4_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_4_2;
  END;

  -- Test 4.3: Verification fonction check_invoice_total_integrity
  v_test_name := '4.3 Fonction check_invoice_total_integrity';
  BEGIN
    SAVEPOINT test_4_3;

    INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test Check', 100.00, 'draft')
    RETURNING id INTO v_invoice_id;

    INSERT INTO supplier_invoice_lines (copro_id, invoice_id, account_id, label, amount)
    VALUES (v_copro_id, v_invoice_id, v_account_id, 'Ligne unique', 100.00);

    IF check_invoice_total_integrity(v_invoice_id) THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Integrite non validee', v_test_name;
    END IF;

    ROLLBACK TO test_4_3;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_4_3;
  END;

END $$;

-- ============================================================================
-- SECTION 5: TEST SUR-PAIEMENT FOURNISSEUR (Action 4)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_period_id UUID;
  v_supplier_id UUID;
  v_invoice_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 5: SUR-PAIEMENT FOURNISSEUR';
  RAISE NOTICE '========================================';

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_supplier_id FROM suppliers WHERE copro_id = v_copro_id LIMIT 1;

  IF v_supplier_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees de base manquantes';
    RETURN;
  END IF;

  -- Test 5.1: Paiement fournisseur valide
  v_test_name := '5.1 Paiement fournisseur valide';
  BEGIN
    SAVEPOINT test_5_1;

    INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test Paiement', 500.00, 'approved')
    RETURNING id INTO v_invoice_id;

    INSERT INTO supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount)
    VALUES (v_copro_id, v_period_id, v_invoice_id, CURRENT_DATE, 200.00);

    RAISE NOTICE '[PASS] %', v_test_name;
    ROLLBACK TO test_5_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_5_1;
  END;

  -- Test 5.2: Sur-paiement bloque
  v_test_name := '5.2 Sur-paiement bloque';
  BEGIN
    SAVEPOINT test_5_2;
    v_error_caught := FALSE;

    INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test OverPay', 300.00, 'approved')
    RETURNING id INTO v_invoice_id;

    -- Tenter de payer 400 EUR sur facture de 300 EUR
    BEGIN
      INSERT INTO supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount)
      VALUES (v_copro_id, v_period_id, v_invoice_id, CURRENT_DATE, 400.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Sur-paiement non bloque!', v_test_name;
    END IF;

    ROLLBACK TO test_5_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_5_2;
  END;

  -- Test 5.3: Paiement sur facture draft bloque
  v_test_name := '5.3 Paiement sur facture draft bloque';
  BEGIN
    SAVEPOINT test_5_3;
    v_error_caught := FALSE;

    INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test Draft', 200.00, 'draft')
    RETURNING id INTO v_invoice_id;

    BEGIN
      INSERT INTO supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount)
      VALUES (v_copro_id, v_period_id, v_invoice_id, CURRENT_DATE, 100.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Paiement draft non bloque!', v_test_name;
    END IF;

    ROLLBACK TO test_5_3;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    ROLLBACK TO test_5_3;
  END;

END $$;

-- ============================================================================
-- SECTION 6: TEST RLS FINANCE COPROPRIETAIRE (Action 5)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_owner_user_id UUID;
  v_manager_user_id UUID;
  v_other_lot_id UUID;
  v_owner_lot_id UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 6: RLS FINANCE COPROPRIETAIRE';
  RAISE NOTICE '========================================';

  -- Recuperer donnees de test
  SELECT c.id INTO v_copro_id FROM copros c LIMIT 1;

  -- Trouver un user manager
  SELECT m.user_id INTO v_manager_user_id
  FROM memberships m
  WHERE m.copro_id = v_copro_id AND m.role IN ('admin', 'gestionnaire')
  LIMIT 1;

  -- Trouver un user coproprietaire avec lot
  SELECT cp.user_id, lo.lot_id INTO v_owner_user_id, v_owner_lot_id
  FROM coproprietaires cp
  JOIN lot_owners lo ON lo.coproprietaire_id = cp.id
  WHERE cp.copro_id = v_copro_id
    AND cp.user_id IS NOT NULL
    AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  LIMIT 1;

  IF v_owner_user_id IS NULL OR v_manager_user_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees RLS insuffisantes (owner ou manager manquant)';
    RETURN;
  END IF;

  -- Test 6.1: Verifier fonction user_is_lot_owner
  v_test_name := '6.1 user_is_lot_owner fonctionne';
  BEGIN
    -- Simuler connexion owner
    PERFORM test_set_user(v_owner_user_id);

    IF user_is_lot_owner(v_owner_lot_id) THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Owner non reconnu pour son lot', v_test_name;
    END IF;

    PERFORM test_clear_user();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    PERFORM test_clear_user();
  END;

  -- Test 6.2: user_is_copro_manager
  v_test_name := '6.2 user_is_copro_manager fonctionne';
  BEGIN
    PERFORM test_set_user(v_manager_user_id);

    IF user_is_copro_manager(v_copro_id) THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Manager non reconnu', v_test_name;
    END IF;

    PERFORM test_clear_user();
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    PERFORM test_clear_user();
  END;

  -- Test 6.3: Owner ne voit pas lot d'un autre
  v_test_name := '6.3 Owner ne voit pas lot autre';
  BEGIN
    -- Trouver un autre lot
    SELECT lo.lot_id INTO v_other_lot_id
    FROM lot_owners lo
    WHERE lo.copro_id = v_copro_id
      AND lo.lot_id != v_owner_lot_id
    LIMIT 1;

    IF v_other_lot_id IS NOT NULL THEN
      PERFORM test_set_user(v_owner_user_id);

      IF NOT user_is_lot_owner(v_other_lot_id) THEN
        RAISE NOTICE '[PASS] %', v_test_name;
      ELSE
        RAISE NOTICE '[FAIL] % - Owner voit lot autre!', v_test_name;
      END IF;

      PERFORM test_clear_user();
    ELSE
      RAISE NOTICE '[SKIP] % - Pas d''autre lot pour tester', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    PERFORM test_clear_user();
  END;

END $$;

-- ============================================================================
-- SECTION 7: TEST RLS AG DRAFT (Action 7)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_copro_id UUID;
  v_owner_user_id UUID;
  v_manager_user_id UUID;
  v_ag_draft_id UUID;
  v_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 7: RLS AG DRAFT INVISIBLE';
  RAISE NOTICE '========================================';

  SELECT c.id INTO v_copro_id FROM copros c LIMIT 1;

  SELECT m.user_id INTO v_manager_user_id
  FROM memberships m
  WHERE m.copro_id = v_copro_id AND m.role IN ('admin', 'gestionnaire')
  LIMIT 1;

  SELECT cp.user_id INTO v_owner_user_id
  FROM coproprietaires cp
  JOIN lot_owners lo ON lo.coproprietaire_id = cp.id
  WHERE cp.copro_id = v_copro_id AND cp.user_id IS NOT NULL
  LIMIT 1;

  IF v_owner_user_id IS NULL OR v_manager_user_id IS NULL THEN
    RAISE NOTICE '[SKIP] Donnees RLS insuffisantes';
    RETURN;
  END IF;

  -- Test 7.1: AG draft visible par manager
  v_test_name := '7.1 AG draft visible par manager';
  BEGIN
    SAVEPOINT test_7_1;

    -- Creer une AG draft
    INSERT INTO ag_meetings (copro_id, title, meeting_type, meeting_date, location, status)
    VALUES (v_copro_id, 'Test AG Draft', 'ordinaire', CURRENT_DATE + 30, 'Test Location', 'draft')
    RETURNING id INTO v_ag_draft_id;

    PERFORM test_set_user(v_manager_user_id);

    SELECT COUNT(*) INTO v_count
    FROM ag_meetings
    WHERE id = v_ag_draft_id;

    IF v_count = 1 THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Manager ne voit pas AG draft', v_test_name;
    END IF;

    PERFORM test_clear_user();
    ROLLBACK TO test_7_1;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    PERFORM test_clear_user();
    ROLLBACK TO test_7_1;
  END;

  -- Test 7.2: AG draft invisible par coproprietaire
  v_test_name := '7.2 AG draft invisible par coproprietaire';
  BEGIN
    SAVEPOINT test_7_2;

    INSERT INTO ag_meetings (copro_id, title, meeting_type, meeting_date, location, status)
    VALUES (v_copro_id, 'Test AG Draft 2', 'ordinaire', CURRENT_DATE + 30, 'Test', 'draft')
    RETURNING id INTO v_ag_draft_id;

    PERFORM test_set_user(v_owner_user_id);

    SELECT COUNT(*) INTO v_count
    FROM ag_meetings
    WHERE id = v_ag_draft_id;

    IF v_count = 0 THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Coproprietaire voit AG draft!', v_test_name;
    END IF;

    PERFORM test_clear_user();
    ROLLBACK TO test_7_2;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    PERFORM test_clear_user();
    ROLLBACK TO test_7_2;
  END;

  -- Test 7.3: AG convoquee visible par coproprietaire
  v_test_name := '7.3 AG convoquee visible par coproprietaire';
  BEGIN
    SAVEPOINT test_7_3;

    INSERT INTO ag_meetings (copro_id, title, meeting_type, meeting_date, location, status)
    VALUES (v_copro_id, 'Test AG Convoquee', 'ordinaire', CURRENT_DATE + 30, 'Test', 'convoked')
    RETURNING id INTO v_ag_draft_id;

    PERFORM test_set_user(v_owner_user_id);

    SELECT COUNT(*) INTO v_count
    FROM ag_meetings
    WHERE id = v_ag_draft_id;

    IF v_count = 1 THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Coproprietaire ne voit pas AG convoquee', v_test_name;
    END IF;

    PERFORM test_clear_user();
    ROLLBACK TO test_7_3;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
    PERFORM test_clear_user();
    ROLLBACK TO test_7_3;
  END;

END $$;

-- ============================================================================
-- SECTION 8: TEST VUE INTEGRITE FINANCE
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 8: VUES D''INTEGRITE';
  RAISE NOTICE '========================================';

  -- Test 8.1: Vue v_finance_integrity_issues existe
  v_test_name := '8.1 Vue v_finance_integrity_issues existe';
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'v_finance_integrity_issues';

    IF v_count = 1 THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Vue non trouvee', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Test 8.2: Vue v_invoice_total_mismatch existe
  v_test_name := '8.2 Vue v_invoice_total_mismatch existe';
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'v_invoice_total_mismatch';

    IF v_count = 1 THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Vue non trouvee', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Test 8.3: Fonction audit_finance_integrity existe
  v_test_name := '8.3 Fonction audit_finance_integrity existe';
  BEGIN
    SELECT COUNT(*) INTO v_count
    FROM pg_proc
    WHERE proname = 'audit_finance_integrity';

    IF v_count >= 1 THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Fonction non trouvee', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

END $$;

-- ============================================================================
-- SECTION 9: RESUME DES TESTS
-- ============================================================================

DO $$
DECLARE
  v_trigger_count INT;
  v_policy_count INT;
  v_view_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RESUME DE L''AUDIT';
  RAISE NOTICE '========================================';

  -- Compter les triggers d'invariant
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname LIKE 'trg_validate%';

  RAISE NOTICE 'Triggers de validation: %', v_trigger_count;

  -- Compter les policies RLS
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  RAISE NOTICE 'Policies RLS actives: %', v_policy_count;

  -- Compter les vues security_invoker
  SELECT COUNT(*) INTO v_view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name LIKE 'v_%';

  RAISE NOTICE 'Vues (v_*): %', v_view_count;

  -- Verifier integrite actuelle
  RAISE NOTICE '';
  RAISE NOTICE 'Problemes d''integrite actuels:';
  PERFORM * FROM v_finance_integrity_issues LIMIT 5;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIN DES TESTS';
  RAISE NOTICE '========================================';

END $$;

-- ============================================================================
-- CLEANUP: Supprimer les fonctions helper de test
-- ============================================================================

DROP FUNCTION IF EXISTS test_set_user(UUID);
DROP FUNCTION IF EXISTS test_clear_user();

-- ============================================================================
-- FIN DU FICHIER DE TESTS
-- ============================================================================
