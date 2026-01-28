-- ============================================================================
-- ⚠️  DEV ONLY — DO NOT RUN IN PRODUCTION ⚠️
-- ============================================================================
-- Script: disable_rls.sql
-- Purpose: Disable Row Level Security on ALL tables in the 'public' schema
-- Target: Supabase development environment only
-- Reversible: Use enable_rls.sql to restore
-- Idempotent: Safe to run multiple times (checks state before altering)
-- ============================================================================

-- Create snapshot table to save original RLS state for rollback
CREATE TABLE IF NOT EXISTS public._rls_state_snapshot (
    table_name TEXT PRIMARY KEY,
    had_rls_enabled BOOLEAN NOT NULL,
    had_force_rls BOOLEAN NOT NULL,
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- Save current RLS state before disabling (only if not already captured)
INSERT INTO public._rls_state_snapshot (table_name, had_rls_enabled, had_force_rls)
SELECT
    c.relname::TEXT,
    c.relrowsecurity,
    c.relforcerowsecurity
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname NOT LIKE 'pg_%'
  AND c.relname NOT LIKE '_rls_%'
  AND c.relname NOT LIKE 'supabase_%'
ON CONFLICT (table_name) DO NOTHING;

-- Dynamic PL/pgSQL block to disable RLS on all public tables
DO $$
DECLARE
    tbl RECORD;
BEGIN
    RAISE NOTICE '=== Disabling RLS on public schema tables ===';

    FOR tbl IN
        SELECT c.relname AS table_name
        FROM pg_catalog.pg_class c
        JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'r'
          AND c.relname NOT LIKE 'pg_%'
          AND c.relname NOT LIKE '_rls_%'
          AND c.relname NOT LIKE 'supabase_%'
        ORDER BY c.relname
    LOOP
        -- Disable RLS only if currently enabled
        IF EXISTS (
            SELECT 1 FROM pg_class c2
            JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
            WHERE n2.nspname = 'public'
              AND c2.relname = tbl.table_name
              AND c2.relrowsecurity = true
        ) THEN
            EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.table_name);
            RAISE NOTICE 'Disabled RLS on: public.%', tbl.table_name;
        END IF;

        -- Disable FORCE RLS only if currently forced
        IF EXISTS (
            SELECT 1 FROM pg_class c2
            JOIN pg_namespace n2 ON n2.oid = c2.relnamespace
            WHERE n2.nspname = 'public'
              AND c2.relname = tbl.table_name
              AND c2.relforcerowsecurity = true
        ) THEN
            EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', tbl.table_name);
            RAISE NOTICE 'Removed FORCE RLS on: public.%', tbl.table_name;
        END IF;
    END LOOP;

    RAISE NOTICE '=== RLS disabled on all public tables ===';
END $$;
