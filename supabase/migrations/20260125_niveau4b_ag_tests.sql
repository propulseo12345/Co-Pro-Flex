-- ============================================
-- TESTS: NIVEAU 4B - ASSEMBLÉES GÉNÉRALES (AG)
-- Date: 2026-01-25
-- Description: Tests unitaires pour le module AG
-- ============================================

-- ============================================
-- Exécution: Ces tests doivent être exécutés APRÈS
-- les migrations et le seed
-- ============================================

DO $$
DECLARE
  v_copro_id UUID;
  v_ag_id UUID;
  v_resolution_id UUID;
  v_coproprietaire_id UUID;
  v_test_passed BOOLEAN;
  v_quorum_result RECORD;
  v_resolution_result RECORD;
  v_threshold_result RECORD;
  v_total_tantiemes INT;
  v_present_tantiemes INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DÉMARRAGE DES TESTS NIVEAU 4B - AG';
  RAISE NOTICE '========================================';

  -- ========================================
  -- PRÉPARATION: Récupérer les données de test
  -- ========================================

  SELECT id INTO v_copro_id FROM copros WHERE name ILIKE '%Jardins%' OR name ILIKE '%test%' LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: No test copro found';
  END IF;

  SELECT id INTO v_ag_id FROM ag_meetings WHERE copro_id = v_copro_id LIMIT 1;

  IF v_ag_id IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: No test AG found. Run seed first.';
  END IF;

  SELECT id INTO v_resolution_id FROM ag_resolutions WHERE ag_id = v_ag_id AND resolution_number = 1 LIMIT 1;

  IF v_resolution_id IS NULL THEN
    RAISE EXCEPTION 'TEST SETUP FAILED: No test resolution found. Run seed first.';
  END IF;

  SELECT coproprietaire_id INTO v_coproprietaire_id FROM ag_attendance WHERE ag_id = v_ag_id LIMIT 1;

  RAISE NOTICE 'Setup OK - copro_id: %, ag_id: %, resolution_id: %', v_copro_id, v_ag_id, v_resolution_id;

  -- ========================================
  -- TEST 1: compute_ag_quorum - Quorum OK
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 1: compute_ag_quorum (Quorum OK) ---';

  SELECT * INTO v_quorum_result FROM compute_ag_quorum(v_ag_id);

  IF v_quorum_result.tantiemes_present > 0 THEN
    RAISE NOTICE '✅ TEST 1 PASSED: Quorum calculé';
    RAISE NOTICE '   - Tantièmes présents: %', v_quorum_result.tantiemes_present;
    RAISE NOTICE '   - Tantièmes totaux: %', v_quorum_result.tantiemes_total;
    RAISE NOTICE '   - Pourcentage: %%', ROUND(v_quorum_result.quorum_percentage::NUMERIC, 2);
    RAISE NOTICE '   - Quorum atteint: %', v_quorum_result.quorum_reached;
  ELSE
    RAISE NOTICE '❌ TEST 1 FAILED: Quorum non calculé';
  END IF;

  -- ========================================
  -- TEST 2: compute_ag_quorum - Quorum KO (AG inexistante)
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 2: compute_ag_quorum (AG inexistante) ---';

  SELECT * INTO v_quorum_result FROM compute_ag_quorum('00000000-0000-0000-0000-000000000000'::UUID);

  IF v_quorum_result.tantiemes_total = 0 AND v_quorum_result.quorum_reached = FALSE THEN
    RAISE NOTICE '✅ TEST 2 PASSED: AG inexistante gérée correctement';
  ELSE
    RAISE NOTICE '❌ TEST 2 FAILED: AG inexistante non gérée';
  END IF;

  -- ========================================
  -- TEST 3: compute_majority_threshold - Article 24
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 3: compute_majority_threshold (Art. 24) ---';

  -- Récupérer les tantièmes
  SELECT
    COALESCE(SUM(tantiemes), 0),
    (SELECT SUM(tantiemes) FROM lots WHERE copro_id = v_copro_id)
  INTO v_present_tantiemes, v_total_tantiemes
  FROM ag_attendance
  WHERE ag_id = v_ag_id AND presence_type IN ('present', 'proxy', 'correspondence');

  SELECT * INTO v_threshold_result FROM compute_majority_threshold(
    'art24'::majority_type,
    v_total_tantiemes,
    v_present_tantiemes,
    5 -- nombre copropriétaires
  );

  IF v_threshold_result.threshold_tantiemes = (v_present_tantiemes / 2) + 1 THEN
    RAISE NOTICE '✅ TEST 3 PASSED: Art. 24 = majorité simple des présents';
    RAISE NOTICE '   - Seuil: % tantièmes (>50%% de % présents)', v_threshold_result.threshold_tantiemes, v_present_tantiemes;
  ELSE
    RAISE NOTICE '❌ TEST 3 FAILED: Art. 24 mal calculé';
    RAISE NOTICE '   - Attendu: %, Obtenu: %', (v_present_tantiemes / 2) + 1, v_threshold_result.threshold_tantiemes;
  END IF;

  -- ========================================
  -- TEST 4: compute_majority_threshold - Article 25
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 4: compute_majority_threshold (Art. 25) ---';

  SELECT * INTO v_threshold_result FROM compute_majority_threshold(
    'art25'::majority_type,
    v_total_tantiemes,
    v_present_tantiemes,
    5
  );

  IF v_threshold_result.threshold_tantiemes = (v_total_tantiemes / 2) + 1 THEN
    RAISE NOTICE '✅ TEST 4 PASSED: Art. 25 = majorité absolue de tous';
    RAISE NOTICE '   - Seuil: % tantièmes (>50%% de % total)', v_threshold_result.threshold_tantiemes, v_total_tantiemes;
  ELSE
    RAISE NOTICE '❌ TEST 4 FAILED: Art. 25 mal calculé';
    RAISE NOTICE '   - Attendu: %, Obtenu: %', (v_total_tantiemes / 2) + 1, v_threshold_result.threshold_tantiemes;
  END IF;

  -- ========================================
  -- TEST 5: compute_majority_threshold - Article 26
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 5: compute_majority_threshold (Art. 26) ---';

  SELECT * INTO v_threshold_result FROM compute_majority_threshold(
    'art26'::majority_type,
    v_total_tantiemes,
    v_present_tantiemes,
    5
  );

  IF v_threshold_result.threshold_tantiemes = (v_total_tantiemes * 2 / 3) + 1
     AND v_threshold_result.threshold_owners = 3 THEN
    RAISE NOTICE '✅ TEST 5 PASSED: Art. 26 = double majorité (2/3 tantièmes + majorité copros)';
    RAISE NOTICE '   - Seuil tantièmes: % (>2/3 de %)', v_threshold_result.threshold_tantiemes, v_total_tantiemes;
    RAISE NOTICE '   - Seuil copropriétaires: % (>50%% de 5)', v_threshold_result.threshold_owners;
  ELSE
    RAISE NOTICE '❌ TEST 5 FAILED: Art. 26 mal calculé';
  END IF;

  -- ========================================
  -- TEST 6: compute_majority_threshold - Unanimité
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 6: compute_majority_threshold (Unanimité) ---';

  SELECT * INTO v_threshold_result FROM compute_majority_threshold(
    'unanimity'::majority_type,
    v_total_tantiemes,
    v_present_tantiemes,
    5
  );

  IF v_threshold_result.threshold_tantiemes = v_total_tantiemes THEN
    RAISE NOTICE '✅ TEST 6 PASSED: Unanimité = 100%% des tantièmes';
    RAISE NOTICE '   - Seuil: % tantièmes (100%%)', v_threshold_result.threshold_tantiemes;
  ELSE
    RAISE NOTICE '❌ TEST 6 FAILED: Unanimité mal calculée';
  END IF;

  -- ========================================
  -- TEST 7: calculate_resolution_result - Résolution OK
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 7: calculate_resolution_result (Adoptée) ---';

  SELECT * INTO v_resolution_result FROM calculate_resolution_result(v_resolution_id);

  RAISE NOTICE '   Résultat: %', v_resolution_result.result;
  RAISE NOTICE '   - Votes POUR: % (% tantièmes)', v_resolution_result.votes_for, v_resolution_result.tantiemes_for;
  RAISE NOTICE '   - Votes CONTRE: % (% tantièmes)', v_resolution_result.votes_against, v_resolution_result.tantiemes_against;
  RAISE NOTICE '   - Abstentions: % (% tantièmes)', v_resolution_result.votes_abstention, v_resolution_result.tantiemes_abstention;
  RAISE NOTICE '   - Seuil requis: % tantièmes', v_resolution_result.threshold_required;

  IF v_resolution_result.result IS NOT NULL THEN
    RAISE NOTICE '✅ TEST 7 PASSED: Résultat calculé';
  ELSE
    RAISE NOTICE '❌ TEST 7 FAILED: Résultat non calculé';
  END IF;

  -- ========================================
  -- TEST 8: Double vote rejeté
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 8: Double vote (doit être rejeté) ---';

  BEGIN
    -- Tenter un double vote
    PERFORM cast_vote(v_resolution_id, v_coproprietaire_id, 'for', 'live');
    RAISE NOTICE '❌ TEST 8 FAILED: Double vote accepté (ne devrait pas arriver)';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%already voted%' THEN
        RAISE NOTICE '✅ TEST 8 PASSED: Double vote correctement rejeté';
        RAISE NOTICE '   Message: %', SQLERRM;
      ELSE
        RAISE NOTICE '❌ TEST 8 FAILED: Erreur inattendue: %', SQLERRM;
      END IF;
  END;

  -- ========================================
  -- TEST 9: Vue v_ag_overview
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 9: Vue v_ag_overview ---';

  DECLARE
    v_overview RECORD;
  BEGIN
    SELECT * INTO v_overview FROM v_ag_overview WHERE ag_id = v_ag_id;

    IF v_overview.ag_id IS NOT NULL THEN
      RAISE NOTICE '✅ TEST 9 PASSED: Vue v_ag_overview fonctionne';
      RAISE NOTICE '   - AG: %', v_overview.title;
      RAISE NOTICE '   - Statut: %', v_overview.status;
      RAISE NOTICE '   - Présents: %', v_overview.attendees_present;
      RAISE NOTICE '   - Procurations: %', v_overview.attendees_proxy;
      RAISE NOTICE '   - Correspondance: %', v_overview.attendees_correspondence;
      RAISE NOTICE '   - Résolutions: %', v_overview.total_resolutions;
    ELSE
      RAISE NOTICE '❌ TEST 9 FAILED: Vue v_ag_overview ne retourne pas de données';
    END IF;
  END;

  -- ========================================
  -- TEST 10: Vue v_ag_resolutions_results
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 10: Vue v_ag_resolutions_results ---';

  DECLARE
    v_res_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_res_count FROM v_ag_resolutions_results WHERE ag_id = v_ag_id;

    IF v_res_count > 0 THEN
      RAISE NOTICE '✅ TEST 10 PASSED: Vue v_ag_resolutions_results retourne % résolutions', v_res_count;
    ELSE
      RAISE NOTICE '❌ TEST 10 FAILED: Vue v_ag_resolutions_results vide';
    END IF;
  END;

  -- ========================================
  -- TEST 11: Vue v_ag_attendance_summary
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 11: Vue v_ag_attendance_summary ---';

  DECLARE
    v_att_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_att_count FROM v_ag_attendance_summary WHERE ag_id = v_ag_id;

    IF v_att_count > 0 THEN
      RAISE NOTICE '✅ TEST 11 PASSED: Vue v_ag_attendance_summary retourne % présences', v_att_count;
    ELSE
      RAISE NOTICE '❌ TEST 11 FAILED: Vue v_ag_attendance_summary vide';
    END IF;
  END;

  -- ========================================
  -- TEST 12: Vue v_ag_votes_detailed
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 12: Vue v_ag_votes_detailed ---';

  DECLARE
    v_votes_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_votes_count FROM v_ag_votes_detailed WHERE ag_id = v_ag_id;

    IF v_votes_count > 0 THEN
      RAISE NOTICE '✅ TEST 12 PASSED: Vue v_ag_votes_detailed retourne % votes', v_votes_count;
    ELSE
      RAISE NOTICE '❌ TEST 12 FAILED: Vue v_ag_votes_detailed vide';
    END IF;
  END;

  -- ========================================
  -- TEST 13: Passerelle Art. 25-1
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '--- TEST 13: Passerelle Art. 25-1 ---';

  -- Simuler un vote Art. 25 avec >1/3 des voix
  DECLARE
    v_res_art25_id UUID;
    v_passerelle_result RECORD;
  BEGIN
    -- Trouver la résolution Art. 25
    SELECT id INTO v_res_art25_id
    FROM ag_resolutions
    WHERE ag_id = v_ag_id AND majority_type = 'art25'
    LIMIT 1;

    IF v_res_art25_id IS NOT NULL THEN
      SELECT * INTO v_passerelle_result FROM calculate_resolution_result(v_res_art25_id);

      IF v_passerelle_result.passerelle_eligible IS NOT NULL THEN
        RAISE NOTICE '✅ TEST 13 PASSED: Calcul passerelle Art. 25-1 effectué';
        RAISE NOTICE '   - Éligible passerelle: %', v_passerelle_result.passerelle_eligible;
        RAISE NOTICE '   - Pourcentage votes POUR: %%', ROUND((v_passerelle_result.tantiemes_for::NUMERIC / NULLIF(v_total_tantiemes, 0) * 100), 2);
      ELSE
        RAISE NOTICE '⚠️ TEST 13 SKIPPED: Pas de données passerelle';
      END IF;
    ELSE
      RAISE NOTICE '⚠️ TEST 13 SKIPPED: Pas de résolution Art. 25 trouvée';
    END IF;
  END;

  -- ========================================
  -- RÉSUMÉ FINAL
  -- ========================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FIN DES TESTS NIVEAU 4B - AG';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Vérifiez les résultats ci-dessus.';
  RAISE NOTICE 'Les tests avec ✅ ont réussi.';
  RAISE NOTICE 'Les tests avec ❌ ont échoué.';
  RAISE NOTICE 'Les tests avec ⚠️ ont été ignorés.';

END $$;
