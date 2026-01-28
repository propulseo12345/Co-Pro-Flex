-- ============================================================================
-- 🔍 RLS Audit Script — Check Row Level Security State
-- ============================================================================
-- Script: rls_audit.sql
-- Purpose: Audit RLS status on all tables in public schema
-- Usage: Run anytime to check current RLS state
-- ============================================================================

-- ============================================================================
-- 1. SUMMARY: RLS status for PUBLIC schema
-- ============================================================================
SELECT
    '📊 PUBLIC SCHEMA SUMMARY' AS section,
    COUNT(*) FILTER (WHERE c.relrowsecurity = true) AS tables_with_rls_enabled,
    COUNT(*) FILTER (WHERE c.relrowsecurity = false) AS tables_with_rls_disabled,
    COUNT(*) FILTER (WHERE c.relforcerowsecurity = true) AS tables_with_force_rls,
    COUNT(*) AS total_tables
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
  AND c.relname NOT LIKE '_rls_%'
  AND c.relname NOT LIKE 'supabase_%';

-- ============================================================================
-- 2. DETAILED: RLS status per table in PUBLIC schema
-- ============================================================================
SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls,
    CASE
        WHEN c.relrowsecurity AND c.relforcerowsecurity THEN '🔒 RLS + FORCE'
        WHEN c.relrowsecurity THEN '🔓 RLS only'
        ELSE '⚠️ NO RLS'
    END AS status,
    (
        SELECT COUNT(*)::INT
        FROM pg_catalog.pg_policy p
        WHERE p.polrelid = c.oid
    ) AS policy_count
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
  AND c.relname NOT LIKE '_rls_%'
  AND c.relname NOT LIKE 'supabase_%'
ORDER BY c.relrowsecurity DESC, c.relname;

-- ============================================================================
-- 3. POLICIES: List all RLS policies on public tables
-- ============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 4. SNAPSHOT STATUS (safe - won't crash if table missing)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_rls_state_snapshot'
    ) THEN
        RAISE NOTICE '📸 Snapshot table EXISTS - use next query to view contents';
    ELSE
        RAISE NOTICE '📸 No snapshot table - run disable_rls.sql first';
    END IF;
END $$;

-- ============================================================================
-- 5. SNAPSHOT CONTENTS (only runs if table exists)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    row_count INT := 0;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_rls_state_snapshot'
    ) THEN
        RAISE NOTICE '--- Snapshot Contents ---';
        FOR r IN
            SELECT table_name, had_rls_enabled, had_force_rls, snapshot_at
            FROM public._rls_state_snapshot
            ORDER BY table_name
        LOOP
            row_count := row_count + 1;
            RAISE NOTICE '% | rls=% | force=% | at=%',
                r.table_name, r.had_rls_enabled, r.had_force_rls, r.snapshot_at;
        END LOOP;
        RAISE NOTICE 'Total: % tables in snapshot', row_count;
    END IF;
END $$;

-- ============================================================================
-- 6. COMPARISON: Current vs Snapshot (safe query)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    diff_count INT := 0;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_rls_state_snapshot'
    ) THEN
        RAISE NOTICE 'No snapshot to compare against';
        RETURN;
    END IF;

    RAISE NOTICE '--- Differences (current vs snapshot) ---';
    FOR r IN
        SELECT
            COALESCE(s.table_name, c.relname) AS tbl,
            s.had_rls_enabled AS snap_rls,
            c.relrowsecurity AS curr_rls,
            CASE
                WHEN s.had_rls_enabled IS NULL THEN 'NEW'
                WHEN s.had_rls_enabled = c.relrowsecurity THEN 'MATCH'
                WHEN s.had_rls_enabled AND NOT c.relrowsecurity THEN 'WAS_ON_NOW_OFF'
                WHEN NOT s.had_rls_enabled AND c.relrowsecurity THEN 'WAS_OFF_NOW_ON'
            END AS status
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN public._rls_state_snapshot s ON s.table_name = c.relname
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname NOT LIKE 'pg_%'
          AND c.relname NOT LIKE '_rls_%'
          AND c.relname NOT LIKE 'supabase_%'
          AND (s.had_rls_enabled IS NULL OR s.had_rls_enabled != c.relrowsecurity)
        ORDER BY c.relname
    LOOP
        diff_count := diff_count + 1;
        RAISE NOTICE '% | snap=% | curr=% | %', r.tbl, r.snap_rls, r.curr_rls, r.status;
    END LOOP;

    IF diff_count = 0 THEN
        RAISE NOTICE 'All tables match snapshot state';
    ELSE
        RAISE NOTICE 'Total differences: %', diff_count;
    END IF;
END $$;
