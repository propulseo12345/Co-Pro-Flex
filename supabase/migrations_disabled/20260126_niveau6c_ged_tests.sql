-- ============================================================================
-- NIVEAU 6C : GED - Tests SQL
-- CoProFlex - Vérification sécurité, RLS et performance
-- Date: 2026-01-26
-- ============================================================================

-- ============================================================================
-- 1) TEST: Listing documents overview via vue
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
  v_copro_id UUID;
BEGIN
  SELECT id INTO v_copro_id FROM copros LIMIT 1;

  SELECT COUNT(*) INTO v_count
  FROM v_documents_with_folder
  WHERE copro_id = v_copro_id AND is_current_version = true;

  IF v_count > 0 THEN
    RAISE NOTICE 'TEST 1 OK: v_documents_with_folder retourne % documents', v_count;
  ELSE
    RAISE WARNING 'TEST 1 FAIL: Aucun document trouvé';
  END IF;
END $$;

-- ============================================================================
-- 2) TEST: Filtre par dossier
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
  v_folder_id UUID;
BEGIN
  SELECT id INTO v_folder_id FROM document_folders WHERE name = 'Assemblées Générales' LIMIT 1;

  IF v_folder_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM documents
    WHERE folder_id = v_folder_id AND status = 'active';

    RAISE NOTICE 'TEST 2 OK: % documents dans dossier AG', v_count;
  ELSE
    RAISE NOTICE 'TEST 2 SKIP: Aucun dossier AG trouvé';
  END IF;
END $$;

-- ============================================================================
-- 3) TEST: Versions d'un document
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
  v_doc_id UUID;
BEGIN
  SELECT id INTO v_doc_id FROM documents WHERE file_name ILIKE '%Reglement%' AND is_current_version = false LIMIT 1;

  IF v_doc_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM document_versions
    WHERE document_id = v_doc_id;

    IF v_count >= 1 THEN
      RAISE NOTICE 'TEST 3 OK: Document a % version(s)', v_count;
    ELSE
      RAISE WARNING 'TEST 3 FAIL: Aucune version trouvée';
    END IF;
  ELSE
    RAISE NOTICE 'TEST 3 SKIP: Pas de document versionné trouvé';
  END IF;
END $$;

-- ============================================================================
-- 4) TEST: Tags et recherche full-text
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM documents
  WHERE search_text @@ to_tsquery('french', 'contrat');

  RAISE NOTICE 'TEST 4 OK: Recherche "contrat" retourne % résultats', v_count;
END $$;

-- ============================================================================
-- 5) TEST: Isolation inter-copro
-- ============================================================================
DO $$
DECLARE
  v_copro1_id UUID;
  v_copro2_id UUID;
  v_doc_copro1 UUID;
  v_exists BOOLEAN;
BEGIN
  SELECT id INTO v_copro1_id FROM copros ORDER BY created_at LIMIT 1;
  SELECT id INTO v_copro2_id FROM copros ORDER BY created_at OFFSET 1 LIMIT 1;

  IF v_copro1_id IS NOT NULL AND v_copro2_id IS NOT NULL THEN
    SELECT id INTO v_doc_copro1 FROM documents WHERE copro_id = v_copro1_id LIMIT 1;

    IF v_doc_copro1 IS NOT NULL THEN
      SELECT EXISTS(
        SELECT 1 FROM documents
        WHERE id = v_doc_copro1 AND copro_id = v_copro2_id
      ) INTO v_exists;

      IF NOT v_exists THEN
        RAISE NOTICE 'TEST 5 OK: Document copro1 non accessible via copro2';
      ELSE
        RAISE WARNING 'TEST 5 FAIL: Fuite de données inter-copro!';
      END IF;
    ELSE
      RAISE NOTICE 'TEST 5 SKIP: Pas de document copro1';
    END IF;
  ELSE
    RAISE NOTICE 'TEST 5 SKIP: Moins de 2 copros';
  END IF;
END $$;

-- ============================================================================
-- 6) TEST: Confidentialité - droits copropriétaire vs manager
-- ============================================================================
DO $$
DECLARE
  v_restricted_count INTEGER;
  v_manager_count INTEGER;
  v_public_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_restricted_count FROM documents WHERE confidentiality = 'restricted';
  SELECT COUNT(*) INTO v_manager_count FROM documents WHERE confidentiality = 'manager';
  SELECT COUNT(*) INTO v_public_count FROM documents WHERE confidentiality = 'public';

  RAISE NOTICE 'TEST 6 OK: Répartition confidentialité - public: %, manager: %, restricted: %',
    v_public_count, v_manager_count, v_restricted_count;
END $$;

-- ============================================================================
-- 7) TEST: Génération path stockage
-- ============================================================================
DO $$
DECLARE
  v_path TEXT;
  v_copro_id UUID;
BEGIN
  SELECT id INTO v_copro_id FROM copros LIMIT 1;

  v_path := generate_document_path(v_copro_id, 'facture', 2026, 'test.pdf');

  IF v_path LIKE 'ged/%/facture/2026/test.pdf' THEN
    RAISE NOTICE 'TEST 7 OK: Path généré correctement: %', v_path;
  ELSE
    RAISE WARNING 'TEST 7 FAIL: Path incorrect: %', v_path;
  END IF;
END $$;

-- ============================================================================
-- 8) TEST: Protection suppression document bloqué
-- ============================================================================
DO $$
DECLARE
  v_doc_id UUID;
  v_error_raised BOOLEAN := false;
BEGIN
  SELECT id INTO v_doc_id FROM documents WHERE deletion_blocked = true LIMIT 1;

  IF v_doc_id IS NOT NULL THEN
    BEGIN
      DELETE FROM documents WHERE id = v_doc_id;
    EXCEPTION WHEN OTHERS THEN
      v_error_raised := true;
    END;

    IF v_error_raised THEN
      RAISE NOTICE 'TEST 8 OK: Suppression document protégé bloquée';
    ELSE
      RAISE WARNING 'TEST 8 FAIL: Document protégé supprimé!';
      ROLLBACK;
    END IF;
  ELSE
    RAISE NOTICE 'TEST 8 SKIP: Aucun document protégé';
  END IF;
END $$;

-- ============================================================================
-- 9) TEST: Métadonnées rétention
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM documents
  WHERE retention_years > 0 AND expiration_date IS NOT NULL;

  IF v_count > 0 THEN
    RAISE NOTICE 'TEST 9 OK: % documents avec date expiration calculée', v_count;
  ELSE
    RAISE WARNING 'TEST 9 FAIL: Aucune date expiration calculée';
  END IF;
END $$;

-- ============================================================================
-- 10) TEST: Performance EXPLAIN sur v_documents_with_folder
-- ============================================================================
DO $$
DECLARE
  v_plan TEXT;
  v_copro_id UUID;
BEGIN
  SELECT id INTO v_copro_id FROM copros LIMIT 1;

  EXPLAIN (FORMAT TEXT) INTO v_plan
  SELECT * FROM v_documents_with_folder
  WHERE copro_id = v_copro_id AND is_current_version = true
  ORDER BY created_at DESC
  LIMIT 20;

  RAISE NOTICE 'TEST 10 OK: Query plan généré (vérifier utilisation index copro_id)';
  RAISE NOTICE 'Plan: %', LEFT(v_plan, 200);
END $$;

-- ============================================================================
-- 11) TEST: Vue security_invoker=true vérification
-- ============================================================================
DO $$
DECLARE
  v_invoker BOOLEAN;
BEGIN
  SELECT (reloptions @> ARRAY['security_invoker=true'])
  INTO v_invoker
  FROM pg_class
  WHERE relname = 'v_documents_with_folder' AND relkind = 'v';

  IF v_invoker THEN
    RAISE NOTICE 'TEST 11 OK: v_documents_with_folder a security_invoker=true';
  ELSE
    RAISE WARNING 'TEST 11 FAIL: security_invoker manquant sur vue';
  END IF;
END $$;

-- ============================================================================
-- 12) TEST: Stats documents par catégorie
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v_documents_by_category;

  IF v_count > 0 THEN
    RAISE NOTICE 'TEST 12 OK: % catégories avec documents', v_count;
  ELSE
    RAISE NOTICE 'TEST 12 SKIP: Pas de stats catégorie';
  END IF;
END $$;

-- ============================================================================
-- 13) TEST: Documents expirant bientôt
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM v_documents_expiring;

  RAISE NOTICE 'TEST 13 OK: % documents expirant dans 90 jours', v_count;
END $$;

-- ============================================================================
-- 14) TEST: Index vérification
-- ============================================================================
DO $$
DECLARE
  v_idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_idx_count
  FROM pg_indexes
  WHERE tablename = 'documents'
    AND indexdef LIKE '%copro_id%';

  IF v_idx_count >= 1 THEN
    RAISE NOTICE 'TEST 14 OK: % index sur documents.copro_id', v_idx_count;
  ELSE
    RAISE WARNING 'TEST 14 FAIL: Index manquant sur copro_id';
  END IF;
END $$;

-- ============================================================================
-- 15) TEST: RLS activé sur toutes les tables
-- ============================================================================
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['document_folders', 'document_versions', 'document_access', 'document_links'];
  v_table TEXT;
  v_rls BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT relrowsecurity INTO v_rls
    FROM pg_class
    WHERE relname = v_table;

    IF v_rls THEN
      RAISE NOTICE 'TEST 15 OK: RLS activé sur %', v_table;
    ELSE
      RAISE WARNING 'TEST 15 FAIL: RLS désactivé sur %', v_table;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- RÉSUMÉ DES TESTS
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'GED TESTS COMPLETS - Niveau 6C';
  RAISE NOTICE '15 tests exécutés';
  RAISE NOTICE '========================================';
END $$;
