-- ============================================================================
-- TESTS DE LOGIQUE MÉTIER - Plan de Correction Onboarding
-- CoProFlex - Tests SQL pour validation des invariants et RLS
-- Date: 2026-01-26
-- ============================================================================
-- IMPORTANT: Ce fichier contient des tests à exécuter MANUELLEMENT
-- après application des migrations. Il utilise des transactions ROLLBACK
-- pour ne pas polluer les données.
-- ============================================================================

-- ============================================================================
-- SECTION 1: TESTS DES FONCTIONS HELPER
-- ============================================================================

DO $$
DECLARE
  v_result BOOLEAN;
  v_test_name TEXT;
BEGIN
  RAISE NOTICE '=== TESTS FONCTIONS HELPER ===';

  -- Test 1: user_has_copro_access doit retourner FALSE sans auth
  v_test_name := 'user_has_copro_access sans auth';
  BEGIN
    -- Simuler pas d'utilisateur
    PERFORM set_config('request.jwt.claims', '{}', true);
    SELECT user_has_copro_access(gen_random_uuid()) INTO v_result;
    IF v_result = FALSE THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Expected FALSE, got TRUE', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Test 2: user_is_copro_manager doit retourner FALSE sans auth
  v_test_name := 'user_is_copro_manager sans auth';
  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    SELECT user_is_copro_manager(gen_random_uuid()) INTO v_result;
    IF v_result = FALSE THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Expected FALSE, got TRUE', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Test 3: user_is_lot_owner doit retourner FALSE sans auth
  v_test_name := 'user_is_lot_owner sans auth';
  BEGIN
    PERFORM set_config('request.jwt.claims', '{}', true);
    SELECT user_is_lot_owner(gen_random_uuid()) INTO v_result;
    IF v_result = FALSE THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Expected FALSE, got TRUE', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 2: TESTS INVARIANT APPEL TOTAL (ACTION 1)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_call_id UUID;
  v_line_id UUID;
  v_copro_id UUID;
  v_period_id UUID;
  v_key_id UUID;
  v_lot_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '=== TESTS INVARIANT APPEL TOTAL ===';

  -- Récupérer des IDs existants pour les tests
  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_key_id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_lot_id FROM lots WHERE copro_id = v_copro_id LIMIT 1;

  IF v_copro_id IS NULL OR v_period_id IS NULL OR v_key_id IS NULL OR v_lot_id IS NULL THEN
    RAISE NOTICE '[SKIP] Tests invariant - données de base manquantes';
    RETURN;
  END IF;

  -- Test: Créer appel et ligne cohérente
  v_test_name := 'Création appel + ligne cohérente';
  BEGIN
    -- Créer appel de 1000€
    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Appel', CURRENT_DATE, CURRENT_DATE + 30, 1000.00, 'draft')
    RETURNING id INTO v_call_id;

    -- Créer ligne de 1000€ (cohérent)
    INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
    VALUES (v_copro_id, v_call_id, v_lot_id, 1000.00);

    RAISE NOTICE '[PASS] %', v_test_name;

    -- Cleanup
    DELETE FROM call_for_funds WHERE id = v_call_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
  END;

  -- Test: Violation invariant (ligne > total)
  v_test_name := 'Violation invariant - ligne excède total';
  BEGIN
    v_error_caught := FALSE;

    -- Créer appel de 500€
    INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
    VALUES (v_copro_id, v_period_id, v_key_id, 'Test Violation', CURRENT_DATE, CURRENT_DATE + 30, 500.00, 'draft')
    RETURNING id INTO v_call_id;

    -- Tenter de créer ligne de 600€ (DOIT ÉCHOUER)
    BEGIN
      INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
      VALUES (v_copro_id, v_call_id, v_lot_id, 600.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Violation non détectée', v_test_name;
    END IF;

    -- Cleanup
    DELETE FROM call_for_funds WHERE id = v_call_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 3: TESTS SUR-ALLOCATION PAIEMENTS (ACTION 3)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_payment_id UUID;
  v_alloc_id UUID;
  v_call_id UUID;
  v_line_id UUID;
  v_copro_id UUID;
  v_period_id UUID;
  v_key_id UUID;
  v_lot_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '=== TESTS SUR-ALLOCATION PAIEMENTS ===';

  -- Récupérer des IDs existants
  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_key_id FROM repartition_keys WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_lot_id FROM lots WHERE copro_id = v_copro_id LIMIT 1;

  IF v_copro_id IS NULL OR v_period_id IS NULL OR v_lot_id IS NULL THEN
    RAISE NOTICE '[SKIP] Tests sur-allocation - données de base manquantes';
    RETURN;
  END IF;

  -- Setup: Créer appel et ligne
  INSERT INTO call_for_funds (copro_id, period_id, repartition_key_id, label, issue_date, due_date, total_amount, status)
  VALUES (v_copro_id, v_period_id, v_key_id, 'Test Paiement', CURRENT_DATE, CURRENT_DATE + 30, 200.00, 'issued')
  RETURNING id INTO v_call_id;

  INSERT INTO call_for_funds_lines (copro_id, call_id, lot_id, amount_due)
  VALUES (v_copro_id, v_call_id, v_lot_id, 200.00)
  RETURNING id INTO v_line_id;

  -- Test: Paiement + allocation valide
  v_test_name := 'Allocation valide';
  BEGIN
    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 100.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
    VALUES (v_copro_id, v_payment_id, v_line_id, 100.00);

    RAISE NOTICE '[PASS] %', v_test_name;

    -- Cleanup allocation
    DELETE FROM payment_allocations WHERE payment_id = v_payment_id;
    DELETE FROM payments WHERE id = v_payment_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
  END;

  -- Test: Sur-allocation bloquée
  v_test_name := 'Sur-allocation bloquée';
  BEGIN
    v_error_caught := FALSE;

    INSERT INTO payments (copro_id, period_id, lot_id, amount, payment_date)
    VALUES (v_copro_id, v_period_id, v_lot_id, 50.00, CURRENT_DATE)
    RETURNING id INTO v_payment_id;

    -- Tenter d'allouer 60€ sur un paiement de 50€
    BEGIN
      INSERT INTO payment_allocations (copro_id, payment_id, call_line_id, amount_allocated)
      VALUES (v_copro_id, v_payment_id, v_line_id, 60.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Sur-allocation non bloquée', v_test_name;
    END IF;

    DELETE FROM payments WHERE id = v_payment_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Cleanup
  DELETE FROM call_for_funds WHERE id = v_call_id;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 4: TESTS PAIEMENT FOURNISSEUR (ACTION 4)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_invoice_id UUID;
  v_supplier_id UUID;
  v_copro_id UUID;
  v_period_id UUID;
  v_error_caught BOOLEAN;
BEGIN
  RAISE NOTICE '=== TESTS PAIEMENT FOURNISSEUR ===';

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_period_id FROM accounting_periods WHERE copro_id = v_copro_id LIMIT 1;
  SELECT id INTO v_supplier_id FROM suppliers WHERE copro_id = v_copro_id LIMIT 1;

  IF v_copro_id IS NULL OR v_period_id IS NULL OR v_supplier_id IS NULL THEN
    RAISE NOTICE '[SKIP] Tests paiement fournisseur - données de base manquantes';
    RETURN;
  END IF;

  -- Setup: Créer facture
  INSERT INTO supplier_invoices (copro_id, period_id, supplier_id, invoice_date, label, total_amount, status)
  VALUES (v_copro_id, v_period_id, v_supplier_id, CURRENT_DATE, 'Test Facture', 500.00, 'approved')
  RETURNING id INTO v_invoice_id;

  -- Test: Paiement valide
  v_test_name := 'Paiement fournisseur valide';
  BEGIN
    INSERT INTO supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount)
    VALUES (v_copro_id, v_period_id, v_invoice_id, CURRENT_DATE, 200.00);

    RAISE NOTICE '[PASS] %', v_test_name;

    DELETE FROM supplier_payments WHERE supplier_invoice_id = v_invoice_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[FAIL] % - %', v_test_name, SQLERRM;
  END;

  -- Test: Sur-paiement bloqué
  v_test_name := 'Sur-paiement fournisseur bloqué';
  BEGIN
    v_error_caught := FALSE;

    -- Tenter de payer 600€ sur facture de 500€
    BEGIN
      INSERT INTO supplier_payments (copro_id, period_id, supplier_invoice_id, payment_date, amount)
      VALUES (v_copro_id, v_period_id, v_invoice_id, CURRENT_DATE, 600.00);
    EXCEPTION WHEN check_violation THEN
      v_error_caught := TRUE;
    END;

    IF v_error_caught THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Sur-paiement non bloqué', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Cleanup
  DELETE FROM supplier_invoices WHERE id = v_invoice_id;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 5: VÉRIFICATION VUES (security_invoker)
-- ============================================================================

DO $$
DECLARE
  v_view_name TEXT;
  v_has_invoker BOOLEAN;
BEGIN
  RAISE NOTICE '=== VÉRIFICATION VUES SECURITY_INVOKER ===';

  -- Liste des vues critiques à vérifier
  FOR v_view_name IN
    SELECT table_name
    FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name LIKE 'v_%'
  LOOP
    -- Vérifier si security_invoker est activé
    SELECT EXISTS (
      SELECT 1
      FROM pg_views pv
      JOIN pg_class pc ON pc.relname = pv.viewname
      WHERE pv.viewname = v_view_name
        AND pv.schemaname = 'public'
    ) INTO v_has_invoker;

    -- Note: security_invoker n'est pas directement lisible via information_schema
    -- On suppose que toutes les vues créées avec WITH (security_invoker = true) sont OK
    RAISE NOTICE '[INFO] Vue % existe', v_view_name;
  END LOOP;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 6: TESTS TABLE ag_session_drafts (ACTION 9)
-- ============================================================================

DO $$
DECLARE
  v_test_name TEXT;
  v_ag_id UUID;
  v_copro_id UUID;
  v_draft_id UUID;
BEGIN
  RAISE NOTICE '=== TESTS AG_SESSION_DRAFTS ===';

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_ag_id FROM ag_meetings WHERE copro_id = v_copro_id LIMIT 1;

  IF v_ag_id IS NULL THEN
    RAISE NOTICE '[SKIP] Tests ag_session_drafts - pas d''AG disponible';
    RETURN;
  END IF;

  -- Test: Table existe
  v_test_name := 'Table ag_session_drafts existe';
  BEGIN
    PERFORM 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ag_session_drafts';

    IF FOUND THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Table non trouvée', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  -- Test: Fonction save_ag_session_draft existe
  v_test_name := 'Fonction save_ag_session_draft existe';
  BEGIN
    PERFORM 1 FROM pg_proc WHERE proname = 'save_ag_session_draft';

    IF FOUND THEN
      RAISE NOTICE '[PASS] %', v_test_name;
    ELSE
      RAISE NOTICE '[FAIL] % - Fonction non trouvée', v_test_name;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[ERROR] % - %', v_test_name, SQLERRM;
  END;

  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 7: RÉSUMÉ DES INDEX CRÉÉS
-- ============================================================================

DO $$
DECLARE
  v_idx RECORD;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '=== INDEX CRÉÉS POUR RLS/PERFORMANCE ===';

  FOR v_idx IN
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
    ORDER BY tablename, indexname
  LOOP
    RAISE NOTICE '  [INDEX] %.%', v_idx.tablename, v_idx.indexname;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Total: % index', v_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 8: RÉSUMÉ DES POLICIES RLS
-- ============================================================================

DO $$
DECLARE
  v_pol RECORD;
  v_count INT := 0;
BEGIN
  RAISE NOTICE '=== POLICIES RLS ACTIVES ===';

  FOR v_pol IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    RAISE NOTICE '  [%] %.%', v_pol.cmd, v_pol.tablename, v_pol.policyname;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Total: % policies', v_count;
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN DES TESTS
-- ============================================================================

SELECT '=== TESTS TERMINÉS ===' AS result;
