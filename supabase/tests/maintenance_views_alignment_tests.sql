-- ============================================================================
-- Tests: Maintenance Views Alignment
-- Date: 2026-01-26
-- Description: Tests de validation des vues de maintenance après patch
-- ============================================================================

-- Helper pour afficher les résultats
CREATE OR REPLACE FUNCTION test_result(test_name TEXT, passed BOOLEAN)
RETURNS VOID AS $$
BEGIN
    IF passed THEN
        RAISE NOTICE '[PASS] %', test_name;
    ELSE
        RAISE EXCEPTION '[FAIL] %', test_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Test 1: Les vues existent et sont requêtables
-- ============================================================================
DO $$
BEGIN
    -- v_contracts_overview
    PERFORM 1 FROM v_contracts_overview LIMIT 1;
    PERFORM test_result('v_contracts_overview est requêtable', true);
EXCEPTION WHEN OTHERS THEN
    PERFORM test_result('v_contracts_overview est requêtable', false);
END $$;

DO $$
BEGIN
    -- v_providers_overview
    PERFORM 1 FROM v_providers_overview LIMIT 1;
    PERFORM test_result('v_providers_overview est requêtable', true);
EXCEPTION WHEN OTHERS THEN
    PERFORM test_result('v_providers_overview est requêtable', false);
END $$;

DO $$
BEGIN
    -- v_service_orders_overview
    PERFORM 1 FROM v_service_orders_overview LIMIT 1;
    PERFORM test_result('v_service_orders_overview est requêtable', true);
EXCEPTION WHEN OTHERS THEN
    PERFORM test_result('v_service_orders_overview est requêtable', false);
END $$;

DO $$
BEGIN
    -- v_logbook_overview
    PERFORM 1 FROM v_logbook_overview LIMIT 1;
    PERFORM test_result('v_logbook_overview est requêtable', true);
EXCEPTION WHEN OTHERS THEN
    PERFORM test_result('v_logbook_overview est requêtable', false);
END $$;

-- ============================================================================
-- Test 2: Colonnes requises existent
-- ============================================================================

-- v_contracts_overview.description
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_contracts_overview'
          AND column_name = 'description'
    ) INTO col_exists;

    PERFORM test_result('v_contracts_overview a colonne description', col_exists);
END $$;

-- v_providers_overview.address
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_providers_overview'
          AND column_name = 'address'
    ) INTO col_exists;

    PERFORM test_result('v_providers_overview a colonne address', col_exists);
END $$;

-- v_providers_overview.postal_code
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_providers_overview'
          AND column_name = 'postal_code'
    ) INTO col_exists;

    PERFORM test_result('v_providers_overview a colonne postal_code', col_exists);
END $$;

-- v_providers_overview.contact_role
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_providers_overview'
          AND column_name = 'contact_role'
    ) INTO col_exists;

    PERFORM test_result('v_providers_overview a colonne contact_role', col_exists);
END $$;

-- v_service_orders_overview.documents_count
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_service_orders_overview'
          AND column_name = 'documents_count'
    ) INTO col_exists;

    PERFORM test_result('v_service_orders_overview a colonne documents_count', col_exists);
END $$;

-- v_logbook_overview.is_overdue
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_logbook_overview'
          AND column_name = 'is_overdue'
    ) INTO col_exists;

    PERFORM test_result('v_logbook_overview a colonne is_overdue', col_exists);
END $$;

-- v_logbook_overview.due_alert (doit toujours exister)
DO $$
DECLARE
    col_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'v_logbook_overview'
          AND column_name = 'due_alert'
    ) INTO col_exists;

    PERFORM test_result('v_logbook_overview a colonne due_alert', col_exists);
END $$;

-- ============================================================================
-- Test 3: documents_count est cohérent
-- ============================================================================
DO $$
DECLARE
    test_os_id UUID;
    test_doc_id UUID;
    doc_count_before BIGINT;
    doc_count_after BIGINT;
    test_copro_id UUID;
    test_provider_id UUID;
BEGIN
    -- Trouver une copro et un provider existants
    SELECT copro_id, provider_id INTO test_copro_id, test_provider_id
    FROM service_orders
    LIMIT 1;

    IF test_copro_id IS NULL THEN
        -- Pas d'OS existant, on skip le test
        RAISE NOTICE '[SKIP] Test documents_count: pas d''ordre de service existant';
        RETURN;
    END IF;

    -- Trouver un OS existant
    SELECT id INTO test_os_id
    FROM service_orders
    WHERE copro_id = test_copro_id
    LIMIT 1;

    -- Compter documents avant
    SELECT COALESCE(documents_count, 0) INTO doc_count_before
    FROM v_service_orders_overview
    WHERE id = test_os_id;

    -- Créer un document lié à cet OS
    INSERT INTO documents (
        id, copro_id, service_order_id, file_name, file_path
    ) VALUES (
        gen_random_uuid(),
        test_copro_id,
        test_os_id,
        'test_doc_alignment.pdf',
        '/test/test_doc_alignment.pdf'
    ) RETURNING id INTO test_doc_id;

    -- Compter documents après
    SELECT COALESCE(documents_count, 0) INTO doc_count_after
    FROM v_service_orders_overview
    WHERE id = test_os_id;

    -- Vérifier l'incrémentation
    IF doc_count_after = doc_count_before + 1 THEN
        PERFORM test_result('documents_count s''incrémente correctement', true);
    ELSE
        PERFORM test_result('documents_count s''incrémente correctement', false);
    END IF;

    -- Cleanup
    DELETE FROM documents WHERE id = test_doc_id;
END $$;

-- ============================================================================
-- Test 4: is_overdue fonctionne correctement
-- ============================================================================
DO $$
DECLARE
    test_entry_id UUID;
    is_overdue_value BOOLEAN;
    due_alert_value BOOLEAN;
    test_copro_id UUID;
BEGIN
    -- Trouver une copro existante
    SELECT copro_id INTO test_copro_id
    FROM logbook_entries
    LIMIT 1;

    IF test_copro_id IS NULL THEN
        RAISE NOTICE '[SKIP] Test is_overdue: pas d''entrée logbook existante';
        RETURN;
    END IF;

    -- Créer une entrée avec échéance passée (overdue)
    INSERT INTO logbook_entries (
        id, copro_id, entry_type, category, title, happened_at, next_due_at, status
    ) VALUES (
        gen_random_uuid(),
        test_copro_id,
        'intervention',
        'courante',
        'Test is_overdue',
        CURRENT_DATE - 30,
        CURRENT_DATE - 7,  -- 7 jours dans le passé = overdue
        'terminee'
    ) RETURNING id INTO test_entry_id;

    -- Vérifier is_overdue = true
    SELECT is_overdue, due_alert INTO is_overdue_value, due_alert_value
    FROM v_logbook_overview
    WHERE id = test_entry_id;

    IF is_overdue_value = true THEN
        PERFORM test_result('is_overdue = true quand next_due_at < today', true);
    ELSE
        PERFORM test_result('is_overdue = true quand next_due_at < today', false);
    END IF;

    -- Cleanup
    DELETE FROM logbook_entries WHERE id = test_entry_id;

    -- Test cas non-overdue (échéance future)
    INSERT INTO logbook_entries (
        id, copro_id, entry_type, category, title, happened_at, next_due_at, status
    ) VALUES (
        gen_random_uuid(),
        test_copro_id,
        'intervention',
        'courante',
        'Test not overdue',
        CURRENT_DATE - 30,
        CURRENT_DATE + 30,  -- 30 jours dans le futur = not overdue
        'terminee'
    ) RETURNING id INTO test_entry_id;

    SELECT is_overdue INTO is_overdue_value
    FROM v_logbook_overview
    WHERE id = test_entry_id;

    IF is_overdue_value = false THEN
        PERFORM test_result('is_overdue = false quand next_due_at > today', true);
    ELSE
        PERFORM test_result('is_overdue = false quand next_due_at > today', false);
    END IF;

    -- Cleanup
    DELETE FROM logbook_entries WHERE id = test_entry_id;
END $$;

-- ============================================================================
-- Test 5: security_invoker=true sur toutes les vues
-- ============================================================================
DO $$
DECLARE
    view_rec RECORD;
    all_secure BOOLEAN := true;
BEGIN
    FOR view_rec IN
        SELECT c.relname, c.reloptions
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind = 'v'
          AND c.relname IN (
              'v_contracts_overview',
              'v_contracts_alerts',
              'v_providers_overview',
              'v_service_orders_overview',
              'v_logbook_overview',
              'v_logbook_alerts'
          )
    LOOP
        IF view_rec.reloptions IS NULL
           OR NOT ('security_invoker=true' = ANY(view_rec.reloptions)) THEN
            RAISE NOTICE '[FAIL] Vue % n''a pas security_invoker=true', view_rec.relname;
            all_secure := false;
        ELSE
            RAISE NOTICE '[PASS] Vue % a security_invoker=true', view_rec.relname;
        END IF;
    END LOOP;

    PERFORM test_result('Toutes les vues ont security_invoker=true', all_secure);
END $$;

-- ============================================================================
-- Test 6: Colonnes existantes préservées (non-régression)
-- ============================================================================
DO $$
DECLARE
    cols_count INTEGER;
BEGIN
    -- v_contracts_overview doit avoir au moins ces colonnes essentielles
    SELECT COUNT(*) INTO cols_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'v_contracts_overview'
      AND column_name IN (
          'id', 'copro_id', 'provider_id', 'provider_name',
          'contract_number', 'contract_type', 'title', 'start_date',
          'end_date', 'status', 'renewal_alert', 'days_remaining',
          'interventions_count', 'orders_count', 'description'
      );

    IF cols_count >= 14 THEN
        PERFORM test_result('v_contracts_overview conserve colonnes essentielles', true);
    ELSE
        PERFORM test_result('v_contracts_overview conserve colonnes essentielles', false);
    END IF;
END $$;

DO $$
DECLARE
    cols_count INTEGER;
BEGIN
    -- v_providers_overview doit avoir au moins ces colonnes
    SELECT COUNT(*) INTO cols_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'v_providers_overview'
      AND column_name IN (
          'id', 'copro_id', 'name', 'category', 'domains',
          'contact_name', 'email', 'phone', 'city', 'is_active',
          'address', 'postal_code', 'contact_role'
      );

    IF cols_count >= 13 THEN
        PERFORM test_result('v_providers_overview conserve colonnes essentielles', true);
    ELSE
        PERFORM test_result('v_providers_overview conserve colonnes essentielles', false);
    END IF;
END $$;

-- ============================================================================
-- Cleanup helper function
-- ============================================================================
DROP FUNCTION IF EXISTS test_result(TEXT, BOOLEAN);

-- ============================================================================
-- Résumé
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Tests maintenance_views_alignment terminés';
    RAISE NOTICE '=========================================';
END $$;
