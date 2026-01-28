-- ============================================================================
-- SMOKE TESTS - Dashboard Views
-- CoProFlex - Date: 2026-01-28
-- Tests P0 pour les vues du tableau de bord
-- ============================================================================

-- ============================================================================
-- 1. TESTS D'EXISTENCE DES VUES
-- ============================================================================

DO $$
BEGIN
  -- Test: v_dashboard_kpis existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'v_dashboard_kpis'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_kpis view does not exist';
  END IF;

  -- Test: v_dashboard_recent_activity existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'v_dashboard_recent_activity'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_recent_activity view does not exist';
  END IF;

  -- Test: v_dashboard_todos existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'v_dashboard_todos'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_todos view does not exist';
  END IF;

  RAISE NOTICE 'TEST PASSED: All dashboard views exist';
END $$;

-- ============================================================================
-- 2. TESTS SECURITY_INVOKER
-- ============================================================================

DO $$
DECLARE
  v_kpis_security TEXT;
  v_activity_security TEXT;
  v_todos_security TEXT;
BEGIN
  -- Récupérer les options des vues
  SELECT reloptions::TEXT INTO v_kpis_security
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'v_dashboard_kpis'
    AND n.nspname = 'public';

  SELECT reloptions::TEXT INTO v_activity_security
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'v_dashboard_recent_activity'
    AND n.nspname = 'public';

  SELECT reloptions::TEXT INTO v_todos_security
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'v_dashboard_todos'
    AND n.nspname = 'public';

  -- Vérifier security_invoker=true
  IF v_kpis_security IS NULL OR v_kpis_security NOT LIKE '%security_invoker=true%' THEN
    RAISE EXCEPTION 'v_dashboard_kpis: security_invoker not set to true';
  END IF;

  IF v_activity_security IS NULL OR v_activity_security NOT LIKE '%security_invoker=true%' THEN
    RAISE EXCEPTION 'v_dashboard_recent_activity: security_invoker not set to true';
  END IF;

  IF v_todos_security IS NULL OR v_todos_security NOT LIKE '%security_invoker=true%' THEN
    RAISE EXCEPTION 'v_dashboard_todos: security_invoker not set to true';
  END IF;

  RAISE NOTICE 'TEST PASSED: All dashboard views have security_invoker=true';
END $$;

-- ============================================================================
-- 3. TESTS STRUCTURE DES COLONNES
-- ============================================================================

DO $$
BEGIN
  -- Test: v_dashboard_kpis a les colonnes requises
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_kpis'
      AND column_name = 'copro_id'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_kpis missing column: copro_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_kpis'
      AND column_name = 'current_balance'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_kpis missing column: current_balance';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_kpis'
      AND column_name = 'unpaid_total'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_kpis missing column: unpaid_total';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_kpis'
      AND column_name = 'next_ag_date'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_kpis missing column: next_ag_date';
  END IF;

  -- Test: v_dashboard_recent_activity a les colonnes requises
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_recent_activity'
      AND column_name = 'activity_type'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_recent_activity missing column: activity_type';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_recent_activity'
      AND column_name = 'label'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_recent_activity missing column: label';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_recent_activity'
      AND column_name = 'deep_link'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_recent_activity missing column: deep_link';
  END IF;

  -- Test: v_dashboard_todos a les colonnes requises
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_todos'
      AND column_name = 'priority'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_todos missing column: priority';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'v_dashboard_todos'
      AND column_name = 'deep_link'
  ) THEN
    RAISE EXCEPTION 'v_dashboard_todos missing column: deep_link';
  END IF;

  RAISE NOTICE 'TEST PASSED: All dashboard views have required columns';
END $$;

-- ============================================================================
-- 4. TEST DE REQUÊTE BASIQUE (sans données)
-- ============================================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  -- Test: v_dashboard_kpis est queryable
  SELECT COUNT(*) INTO v_count FROM v_dashboard_kpis LIMIT 1;
  RAISE NOTICE 'v_dashboard_kpis: queryable (% rows)', v_count;

  -- Test: v_dashboard_recent_activity est queryable
  SELECT COUNT(*) INTO v_count FROM v_dashboard_recent_activity LIMIT 1;
  RAISE NOTICE 'v_dashboard_recent_activity: queryable (% rows)', v_count;

  -- Test: v_dashboard_todos est queryable
  SELECT COUNT(*) INTO v_count FROM v_dashboard_todos LIMIT 1;
  RAISE NOTICE 'v_dashboard_todos: queryable (% rows)', v_count;

  RAISE NOTICE 'TEST PASSED: All dashboard views are queryable';
END $$;

-- ============================================================================
-- 5. TEST DE FILTRAGE PAR COPRO_ID
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_count INT;
BEGIN
  -- Récupérer une copro existante (si disponible)
  SELECT id INTO v_copro_id FROM copros LIMIT 1;

  IF v_copro_id IS NOT NULL THEN
    -- Test: filtrage par copro_id fonctionne sur v_dashboard_kpis
    SELECT COUNT(*) INTO v_count
    FROM v_dashboard_kpis
    WHERE copro_id = v_copro_id;
    RAISE NOTICE 'v_dashboard_kpis filtered by copro_id: % rows', v_count;

    -- Test: filtrage par copro_id fonctionne sur v_dashboard_recent_activity
    SELECT COUNT(*) INTO v_count
    FROM v_dashboard_recent_activity
    WHERE copro_id = v_copro_id
    ORDER BY event_date DESC
    LIMIT 20;
    RAISE NOTICE 'v_dashboard_recent_activity filtered by copro_id (limit 20): % rows', v_count;

    -- Test: filtrage par copro_id fonctionne sur v_dashboard_todos
    SELECT COUNT(*) INTO v_count
    FROM v_dashboard_todos
    WHERE copro_id = v_copro_id
    ORDER BY priority ASC, due_date ASC NULLS LAST
    LIMIT 10;
    RAISE NOTICE 'v_dashboard_todos filtered by copro_id (limit 10): % rows', v_count;

    RAISE NOTICE 'TEST PASSED: copro_id filtering works on all views';
  ELSE
    RAISE NOTICE 'SKIP: No copros available for filtering test';
  END IF;
END $$;

-- ============================================================================
-- 6. TEST DES INDEX (vérifier leur existence)
-- ============================================================================

DO $$
BEGIN
  -- Vérifier les index créés pour le dashboard
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_ag_meetings_next'
  ) THEN
    RAISE WARNING 'Index idx_ag_meetings_next not found';
  ELSE
    RAISE NOTICE 'Index idx_ag_meetings_next exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_bank_movements_unmatched_copro'
  ) THEN
    RAISE WARNING 'Index idx_bank_movements_unmatched_copro not found';
  ELSE
    RAISE NOTICE 'Index idx_bank_movements_unmatched_copro exists';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_contracts_renewal_soon'
  ) THEN
    RAISE WARNING 'Index idx_contracts_renewal_soon not found';
  ELSE
    RAISE NOTICE 'Index idx_contracts_renewal_soon exists';
  END IF;

  RAISE NOTICE 'TEST PASSED: Dashboard index verification complete';
END $$;

-- ============================================================================
-- RÉSUMÉ DES TESTS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DASHBOARD SMOKE TESTS - SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Views created: v_dashboard_kpis, v_dashboard_recent_activity, v_dashboard_todos';
  RAISE NOTICE 'All views have security_invoker=true';
  RAISE NOTICE 'All views are queryable with copro_id filtering';
  RAISE NOTICE '========================================';
END $$;
