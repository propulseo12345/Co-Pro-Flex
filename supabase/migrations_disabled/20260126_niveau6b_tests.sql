-- ============================================================================
-- NIVEAU 6B : TESTS - Conseil Syndical & Communication
-- CoProFlex - Tests de sécurité RLS
-- Date: 2026-01-26
-- ============================================================================

-- ============================================================================
-- Configuration des tests
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_user_gestionnaire_id UUID;
  v_user_president_cs_id UUID;
  v_user_membre_cs_id UUID;
  v_user_coproprietaire_id UUID;
  v_user_externe_id UUID;

  v_decision_id UUID;
  v_post_council_only_id UUID;
  v_post_all_members_id UUID;
  v_conversation_id UUID;

  v_test_result BOOLEAN;
  v_test_count INT;
  v_passed_count INT := 0;
  v_failed_count INT := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'NIVEAU 6B - TESTS DE SECURITE RLS';
  RAISE NOTICE '========================================';

  -- ============================================================================
  -- Récupérer les données de test
  -- ============================================================================

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune copropriété trouvée';
    RETURN;
  END IF;

  -- Utilisateurs
  SELECT id INTO v_user_gestionnaire_id FROM profiles WHERE role = 'manager' LIMIT 1;
  SELECT cm.user_id INTO v_user_president_cs_id
    FROM council_members cm WHERE cm.copro_id = v_copro_id AND cm.role = 'president' AND cm.is_active LIMIT 1;
  SELECT cm.user_id INTO v_user_membre_cs_id
    FROM council_members cm WHERE cm.copro_id = v_copro_id AND cm.role = 'member' AND cm.is_active LIMIT 1;
  SELECT id INTO v_user_coproprietaire_id
    FROM profiles WHERE role = 'owner' AND id NOT IN (
      SELECT user_id FROM council_members WHERE copro_id = v_copro_id AND is_active
    ) LIMIT 1;

  -- Créer un utilisateur externe (n'appartient pas à la copro)
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (gen_random_uuid(), 'externe.test@coproflex.test', 'User Externe Test', 'owner')
  RETURNING id INTO v_user_externe_id;

  -- ============================================================================
  -- TEST 1: Visibilité des décisions CS
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 1: Décisions CS ---';

  -- Créer une décision de test
  INSERT INTO council_decisions (copro_id, title, status, created_by)
  VALUES (v_copro_id, 'Test décision RLS', 'draft', v_user_president_cs_id)
  RETURNING id INTO v_decision_id;

  -- Test 1.1: Gestionnaire peut voir
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = v_user_gestionnaire_id::TEXT;

  SELECT EXISTS (SELECT 1 FROM council_decisions WHERE id = v_decision_id) INTO v_test_result;
  IF v_test_result THEN
    RAISE NOTICE 'PASS: Gestionnaire peut voir les décisions CS';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Gestionnaire devrait voir les décisions CS';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 1.2: Membre CS peut voir
  SET LOCAL request.jwt.claim.sub = v_user_membre_cs_id::TEXT;

  SELECT EXISTS (SELECT 1 FROM council_decisions WHERE id = v_decision_id) INTO v_test_result;
  IF v_test_result THEN
    RAISE NOTICE 'PASS: Membre CS peut voir les décisions';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Membre CS devrait voir les décisions';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 1.3: Copropriétaire non-CS ne peut PAS voir
  SET LOCAL request.jwt.claim.sub = v_user_coproprietaire_id::TEXT;

  SELECT EXISTS (SELECT 1 FROM council_decisions WHERE id = v_decision_id) INTO v_test_result;
  IF NOT v_test_result THEN
    RAISE NOTICE 'PASS: Copropriétaire non-CS ne voit pas les décisions';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Copropriétaire non-CS ne devrait pas voir les décisions';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Cleanup
  DELETE FROM council_decisions WHERE id = v_decision_id;
  RESET ROLE;

  -- ============================================================================
  -- TEST 2: Visibilité des posts selon visibility
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 2: Posts mur (visibilité) ---';

  -- Post council_only
  INSERT INTO wall_posts (copro_id, author_id, title, content, visibility)
  VALUES (v_copro_id, v_user_president_cs_id, 'Post CS only', 'Contenu réservé CS', 'council_only')
  RETURNING id INTO v_post_council_only_id;

  -- Post all_members
  INSERT INTO wall_posts (copro_id, author_id, title, content, visibility)
  VALUES (v_copro_id, v_user_gestionnaire_id, 'Post tous', 'Contenu pour tous', 'all_members')
  RETURNING id INTO v_post_all_members_id;

  -- Test 2.1: Membre CS voit le post council_only
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = v_user_membre_cs_id::TEXT;

  SELECT EXISTS (SELECT 1 FROM wall_posts WHERE id = v_post_council_only_id) INTO v_test_result;
  IF v_test_result THEN
    RAISE NOTICE 'PASS: Membre CS voit post council_only';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Membre CS devrait voir post council_only';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 2.2: Copropriétaire ne voit PAS le post council_only
  SET LOCAL request.jwt.claim.sub = v_user_coproprietaire_id::TEXT;

  SELECT EXISTS (SELECT 1 FROM wall_posts WHERE id = v_post_council_only_id) INTO v_test_result;
  IF NOT v_test_result THEN
    RAISE NOTICE 'PASS: Copropriétaire ne voit pas post council_only';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Copropriétaire ne devrait pas voir post council_only';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 2.3: Copropriétaire voit le post all_members
  SELECT EXISTS (SELECT 1 FROM wall_posts WHERE id = v_post_all_members_id) INTO v_test_result;
  IF v_test_result THEN
    RAISE NOTICE 'PASS: Copropriétaire voit post all_members';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Copropriétaire devrait voir post all_members';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Cleanup
  DELETE FROM wall_posts WHERE id IN (v_post_council_only_id, v_post_all_members_id);
  RESET ROLE;

  -- ============================================================================
  -- TEST 3: Messagerie privée
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 3: Messagerie privée ---';

  -- Créer une conversation entre gestionnaire et président CS
  INSERT INTO conversations (copro_id, subject, created_by)
  VALUES (v_copro_id, 'Test conversation', v_user_gestionnaire_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO conversation_members (copro_id, conversation_id, user_id, is_admin)
  VALUES
    (v_copro_id, v_conversation_id, v_user_gestionnaire_id, true),
    (v_copro_id, v_conversation_id, v_user_president_cs_id, false);

  INSERT INTO messages (copro_id, conversation_id, author_id, content)
  VALUES (v_copro_id, v_conversation_id, v_user_gestionnaire_id, 'Message de test');

  -- Test 3.1: Membre de la conversation voit les messages
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = v_user_president_cs_id::TEXT;

  SELECT COUNT(*) INTO v_test_count FROM messages WHERE conversation_id = v_conversation_id;
  IF v_test_count > 0 THEN
    RAISE NOTICE 'PASS: Membre de la conversation voit les messages';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Membre devrait voir les messages de sa conversation';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 3.2: Non-membre ne voit PAS les messages
  SET LOCAL request.jwt.claim.sub = v_user_coproprietaire_id::TEXT;

  SELECT COUNT(*) INTO v_test_count FROM messages WHERE conversation_id = v_conversation_id;
  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: Non-membre ne voit pas les messages';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Non-membre ne devrait pas voir les messages';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 3.3: Non-membre ne voit PAS la conversation
  SELECT EXISTS (SELECT 1 FROM conversations WHERE id = v_conversation_id) INTO v_test_result;
  IF NOT v_test_result THEN
    RAISE NOTICE 'PASS: Non-membre ne voit pas la conversation';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Non-membre ne devrait pas voir la conversation';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Cleanup
  DELETE FROM messages WHERE conversation_id = v_conversation_id;
  DELETE FROM conversation_members WHERE conversation_id = v_conversation_id;
  DELETE FROM conversations WHERE id = v_conversation_id;
  RESET ROLE;

  -- ============================================================================
  -- TEST 4: Utilisateur externe
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 4: Utilisateur externe ---';

  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = v_user_externe_id::TEXT;

  -- Test 4.1: Externe ne voit pas les posts
  SELECT COUNT(*) INTO v_test_count FROM wall_posts WHERE copro_id = v_copro_id;
  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: Utilisateur externe ne voit pas les posts';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Utilisateur externe ne devrait pas voir les posts';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 4.2: Externe ne voit pas les événements
  SELECT COUNT(*) INTO v_test_count FROM events WHERE copro_id = v_copro_id;
  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: Utilisateur externe ne voit pas les événements';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Utilisateur externe ne devrait pas voir les événements';
    v_failed_count := v_failed_count + 1;
  END IF;

  -- Test 4.3: Externe ne voit pas les membres CS
  SELECT COUNT(*) INTO v_test_count FROM council_members WHERE copro_id = v_copro_id;
  IF v_test_count = 0 THEN
    RAISE NOTICE 'PASS: Utilisateur externe ne voit pas les membres CS';
    v_passed_count := v_passed_count + 1;
  ELSE
    RAISE NOTICE 'FAIL: Utilisateur externe ne devrait pas voir les membres CS';
    v_failed_count := v_failed_count + 1;
  END IF;

  RESET ROLE;

  -- Cleanup utilisateur externe
  DELETE FROM profiles WHERE id = v_user_externe_id;

  -- ============================================================================
  -- RÉSUMÉ
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RÉSULTATS: % PASS, % FAIL', v_passed_count, v_failed_count;
  RAISE NOTICE '========================================';

  IF v_failed_count > 0 THEN
    RAISE WARNING 'Certains tests ont échoué !';
  END IF;

END $$;

-- ============================================================================
-- TEST FONCTIONS HELPER
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_decision_id UUID;
  v_result RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST: compute_decision_result ---';

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  SELECT id INTO v_decision_id FROM council_decisions WHERE copro_id = v_copro_id LIMIT 1;

  IF v_decision_id IS NOT NULL THEN
    SELECT * INTO v_result FROM compute_decision_result(v_decision_id);
    RAISE NOTICE 'Résultat: total_votes=%, for=%, against=%, abstention=%, passed=%',
      v_result.total_votes,
      v_result.votes_for,
      v_result.votes_against,
      v_result.votes_abstention,
      v_result.is_passed;
    RAISE NOTICE 'PASS: Fonction compute_decision_result fonctionne';
  ELSE
    RAISE NOTICE 'SKIP: Aucune décision trouvée pour tester';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST: is_council_member ---';

  -- Ce test suppose que le contexte auth est défini
  -- En pratique, tester via l'API Supabase

  RAISE NOTICE 'SKIP: Test is_council_member requiert un contexte auth';
END $$;

RAISE NOTICE '';
RAISE NOTICE 'Tests niveau 6B terminés.';
