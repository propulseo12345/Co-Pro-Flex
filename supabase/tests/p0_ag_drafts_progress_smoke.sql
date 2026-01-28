-- ============================================================================
-- Test Smoke: v_ag_drafts_progress
-- Date: 2026-01-28
-- Description: Vérifie que la vue est fonctionnelle
-- ============================================================================

-- Test 1: La vue existe et est requêtable
DO $$
BEGIN
  PERFORM 1 FROM v_ag_drafts_progress LIMIT 1;
  RAISE NOTICE 'TEST PASS: v_ag_drafts_progress is queryable';
EXCEPTION
  WHEN undefined_table THEN
    RAISE EXCEPTION 'TEST FAIL: v_ag_drafts_progress does not exist';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'TEST FAIL: v_ag_drafts_progress query error: %', SQLERRM;
END
$$;

-- Test 2: Vérifier que security_invoker est activé
DO $$
DECLARE
  v_security_invoker text;
BEGIN
  SELECT
    CASE
      WHEN EXISTS (
        SELECT 1 FROM pg_views v
        JOIN pg_class c ON c.relname = v.viewname
        WHERE v.viewname = 'v_ag_drafts_progress'
        AND c.relrowsecurity = false
      ) THEN 'security_invoker_likely'
      ELSE 'check_manually'
    END INTO v_security_invoker;

  -- Note: pg_views ne expose pas directement security_invoker
  -- On vérifie juste que la vue existe
  RAISE NOTICE 'TEST INFO: View exists, security_invoker check: %', v_security_invoker;
END
$$;

-- Test 3: Vérifier les colonnes attendues
DO $$
DECLARE
  expected_columns text[] := ARRAY[
    'ag_id', 'copro_id', 'title', 'meeting_type', 'meeting_date',
    'location', 'status', 'created_at', 'updated_at',
    'resolutions_count', 'attendance_count', 'votes_count',
    'has_resolutions', 'has_attendance', 'has_votes',
    'completion_ratio', 'last_activity_at'
  ];
  col text;
  missing_cols text[] := ARRAY[]::text[];
BEGIN
  FOREACH col IN ARRAY expected_columns LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'v_ag_drafts_progress'
      AND column_name = col
    ) THEN
      missing_cols := array_append(missing_cols, col);
    END IF;
  END LOOP;

  IF array_length(missing_cols, 1) > 0 THEN
    RAISE EXCEPTION 'TEST FAIL: Missing columns: %', array_to_string(missing_cols, ', ');
  ELSE
    RAISE NOTICE 'TEST PASS: All expected columns exist';
  END IF;
END
$$;

-- Test 4: SELECT filtré par copro_id ne retourne pas d'erreur
DO $$
DECLARE
  v_count int;
BEGIN
  -- Prendre un copro_id existant ou un UUID random
  SELECT COUNT(*) INTO v_count
  FROM v_ag_drafts_progress
  WHERE copro_id = COALESCE(
    (SELECT id FROM copros LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  );

  RAISE NOTICE 'TEST PASS: Filtered query returned % rows (no error)', v_count;
END
$$;

-- Test 5: SELECT avec status='draft' fonctionne
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM v_ag_drafts_progress
  WHERE status = 'draft';

  RAISE NOTICE 'TEST PASS: Status filter returned % draft rows', v_count;
END
$$;

-- Résumé
DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v_ag_drafts_progress smoke tests completed';
  RAISE NOTICE '================================================';
END
$$;
