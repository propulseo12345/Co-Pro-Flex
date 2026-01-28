-- ============================================================================
-- 🔒 RESTORE RLS — Rollback Script (from snapshot)
-- ============================================================================
-- Script: enable_rls.sql
-- Purpose: Re-enable Row Level Security based on saved snapshot
-- Target: Restores RLS to state captured by disable_rls.sql
-- Behavior: Only restores tables that have a snapshot entry (skips new tables)
-- Idempotent: Safe to run multiple times
-- ============================================================================

DO $$
DECLARE
    tbl RECORD;
    original_rls BOOLEAN;
    original_force BOOLEAN;
BEGIN
    RAISE NOTICE '=== Restoring RLS on public schema tables from snapshot ===';

    -- Check if snapshot table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_rls_state_snapshot'
    ) THEN
        RAISE NOTICE 'No snapshot table found. Run disable_rls.sql first to create a snapshot.';
        RETURN;
    END IF;

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
        -- Check if we have a snapshot for this table
        SELECT had_rls_enabled, had_force_rls
        INTO original_rls, original_force
        FROM public._rls_state_snapshot
        WHERE table_name = tbl.table_name;

        IF FOUND THEN
            -- Restore RLS state
            IF original_rls THEN
                EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.table_name);
                RAISE NOTICE 'Enabled RLS on: public.%', tbl.table_name;
            ELSE
                EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.table_name);
                RAISE NOTICE 'Kept RLS disabled on: public.% (was originally disabled)', tbl.table_name;
            END IF;

            -- Restore FORCE RLS state
            IF original_force THEN
                EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl.table_name);
                RAISE NOTICE 'Forced RLS on: public.%', tbl.table_name;
            ELSE
                EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', tbl.table_name);
            END IF;
        ELSE
            -- No snapshot found - skip this table (new table created after disable)
            RAISE NOTICE 'Skipped: public.% (no snapshot found, new table?)', tbl.table_name;
        END IF;
    END LOOP;

    RAISE NOTICE '=== RLS restoration complete ===';
END $$;
