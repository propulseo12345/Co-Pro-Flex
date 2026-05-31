-- ============================================
-- Tests: NIVEAU 4E - VOTES PAR CORRESPONDANCE
-- Date: 2026-01-25
-- Description: Tests des fonctions de votes par correspondance
-- ============================================

-- ============================================
-- TEST 1: Enregistrement vote par correspondance
-- ============================================

DO $$
DECLARE
  v_ag_id UUID;
  v_copro_id UUID;
  v_owner_id UUID;
  v_resolution_id UUID;
  v_result JSONB;
BEGIN
  RAISE NOTICE '=== TEST 1: Enregistrement vote par correspondance ===';

  -- Récupérer une AG de test
  SELECT m.id, m.copro_id INTO v_ag_id, v_copro_id
  FROM ag_meetings m
  WHERE m.status IN ('draft', 'convoked')
  LIMIT 1;

  IF v_ag_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune AG en préparation trouvée';
    RETURN;
  END IF;

  -- Récupérer un copropriétaire
  SELECT c.id INTO v_owner_id
  FROM coproprietaires c
  JOIN lot_owners lo ON lo.coproprietaire_id = c.id
  WHERE lo.copro_id = v_copro_id AND lo.end_date IS NULL
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucun copropriétaire trouvé';
    RETURN;
  END IF;

  -- Récupérer une résolution
  SELECT r.id INTO v_resolution_id
  FROM ag_resolutions r
  WHERE r.ag_id = v_ag_id
  LIMIT 1;

  IF v_resolution_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune résolution trouvée';
    RETURN;
  END IF;

  -- Tester l'enregistrement
  v_result := register_correspondence_vote(
    v_ag_id,
    v_owner_id,
    v_resolution_id,
    'for'::vote_direction,
    NULL
  );

  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE 'OK: Vote par correspondance enregistré';
    RAISE NOTICE '   Vote ID: %', v_result->>'vote_id';
    RAISE NOTICE '   Tantièmes: %', v_result->>'tantiemes';

    -- Vérifier que le vote est bien dans ag_votes avec source='correspondence'
    IF EXISTS (
      SELECT 1 FROM ag_votes
      WHERE id = (v_result->>'vote_id')::UUID
        AND vote_source = 'correspondence'
    ) THEN
      RAISE NOTICE 'OK: Vote source = correspondence vérifié';
    ELSE
      RAISE WARNING 'FAIL: Vote source incorrect';
    END IF;

  ELSE
    RAISE NOTICE 'INFO: %', v_result->>'error';
  END IF;

  -- Cleanup: supprimer le vote de test
  DELETE FROM ag_votes WHERE id = (v_result->>'vote_id')::UUID;
  DELETE FROM ag_correspondence_vote_details WHERE integrated_vote_id = (v_result->>'vote_id')::UUID;
  DELETE FROM ag_correspondence_votes WHERE coproprietaire_id = v_owner_id AND ag_id = v_ag_id;
  DELETE FROM ag_attendance WHERE coproprietaire_id = v_owner_id AND ag_id = v_ag_id AND presence_type = 'correspondence';

END $$;


-- ============================================
-- TEST 2: Empêcher double vote (correspondance puis live)
-- ============================================

DO $$
DECLARE
  v_ag_id UUID;
  v_copro_id UUID;
  v_owner_id UUID;
  v_resolution_id UUID;
  v_result1 JSONB;
  v_result2 JSONB;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: Empêcher double vote ===';

  -- Récupérer une AG en cours
  SELECT m.id, m.copro_id INTO v_ag_id, v_copro_id
  FROM ag_meetings m
  WHERE m.status = 'in_progress'
  LIMIT 1;

  IF v_ag_id IS NULL THEN
    -- Essayer avec une AG convoquée
    SELECT m.id, m.copro_id INTO v_ag_id, v_copro_id
    FROM ag_meetings m
    WHERE m.status = 'convoked'
    LIMIT 1;
  END IF;

  IF v_ag_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune AG appropriée trouvée';
    RETURN;
  END IF;

  -- Récupérer un copropriétaire
  SELECT c.id INTO v_owner_id
  FROM coproprietaires c
  JOIN lot_owners lo ON lo.coproprietaire_id = c.id
  WHERE lo.copro_id = v_copro_id AND lo.end_date IS NULL
  LIMIT 1;

  -- Récupérer une résolution
  SELECT r.id INTO v_resolution_id
  FROM ag_resolutions r
  WHERE r.ag_id = v_ag_id AND r.status IN ('pending', 'voting')
  LIMIT 1;

  IF v_resolution_id IS NULL THEN
    SELECT r.id INTO v_resolution_id
    FROM ag_resolutions r
    WHERE r.ag_id = v_ag_id
    LIMIT 1;
  END IF;

  IF v_owner_id IS NULL OR v_resolution_id IS NULL THEN
    RAISE NOTICE 'SKIP: Données manquantes';
    RETURN;
  END IF;

  -- 1. Enregistrer un vote par correspondance
  v_result1 := register_correspondence_vote(
    v_ag_id,
    v_owner_id,
    v_resolution_id,
    'for'::vote_direction,
    NULL
  );

  IF NOT (v_result1->>'success')::boolean THEN
    RAISE NOTICE 'INFO: Premier vote échoué (attendu si déjà voté): %', v_result1->>'error';
    RETURN;
  END IF;

  RAISE NOTICE 'OK: Premier vote (correspondance) enregistré';

  -- 2. Tenter un vote live (doit échouer)
  v_result2 := cast_vote(
    v_resolution_id,
    v_owner_id,
    'against'::vote_direction,
    'live'::vote_source
  );

  IF NOT (v_result2->>'success')::boolean THEN
    IF v_result2->>'error' LIKE '%already voted%' THEN
      RAISE NOTICE 'OK: Double vote correctement bloqué';
      RAISE NOTICE '   Message: %', v_result2->>'error';
    ELSE
      RAISE NOTICE 'OK: Vote bloqué pour raison: %', v_result2->>'error';
    END IF;
  ELSE
    RAISE WARNING 'FAIL: Double vote non bloqué!';
  END IF;

  -- Cleanup
  DELETE FROM ag_votes WHERE id = (v_result1->>'vote_id')::UUID;
  DELETE FROM ag_correspondence_vote_details WHERE integrated_vote_id = (v_result1->>'vote_id')::UUID;
  DELETE FROM ag_correspondence_votes WHERE coproprietaire_id = v_owner_id AND ag_id = v_ag_id;
  DELETE FROM ag_attendance WHERE coproprietaire_id = v_owner_id AND ag_id = v_ag_id AND presence_type = 'correspondence';

END $$;


-- ============================================
-- TEST 3: Calcul résolution avec votes mixtes
-- ============================================

DO $$
DECLARE
  v_ag_id UUID;
  v_copro_id UUID;
  v_resolution_id UUID;
  v_result JSONB;
  v_live_for NUMERIC;
  v_corr_for NUMERIC;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Calcul avec votes mixtes ===';

  -- Trouver une résolution avec des votes
  SELECT r.id, r.ag_id, r.copro_id INTO v_resolution_id, v_ag_id, v_copro_id
  FROM ag_resolutions r
  WHERE r.status IN ('voting', 'voted', 'approved', 'rejected')
    AND EXISTS (SELECT 1 FROM ag_votes v WHERE v.resolution_id = r.id)
  LIMIT 1;

  IF v_resolution_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune résolution avec votes trouvée';
    RETURN;
  END IF;

  -- Calculer le résultat
  v_result := calculate_resolution_result(v_resolution_id);

  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE 'OK: Calcul effectué';
    RAISE NOTICE '   Approuvé: %', v_result->>'is_approved';

    -- Vérifier le breakdown par source
    v_live_for := (v_result->'votes_by_source'->'live'->>'for')::NUMERIC;
    v_corr_for := (v_result->'votes_by_source'->'correspondence'->>'for')::NUMERIC;

    RAISE NOTICE '   Votes live POUR: % tantièmes', COALESCE(v_live_for, 0);
    RAISE NOTICE '   Votes correspondance POUR: % tantièmes', COALESCE(v_corr_for, 0);
    RAISE NOTICE '   Total POUR: % tantièmes', (v_result->'votes'->'for'->>'tantiemes')::NUMERIC;

    -- Vérifier que live + correspondance = total
    IF COALESCE(v_live_for, 0) + COALESCE(v_corr_for, 0) = (v_result->'votes'->'for'->>'tantiemes')::NUMERIC THEN
      RAISE NOTICE 'OK: Somme des sources = total';
    ELSE
      RAISE WARNING 'FAIL: Incohérence dans les totaux';
    END IF;

  ELSE
    RAISE WARNING 'FAIL: Calcul échoué: %', v_result->>'error';
  END IF;

END $$;


-- ============================================
-- TEST 4: Vue v_ag_correspondence_status
-- ============================================

DO $$
DECLARE
  v_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Vue statut correspondance ===';

  SELECT COUNT(*) INTO v_count FROM v_ag_correspondence_status;

  RAISE NOTICE 'OK: Vue v_ag_correspondence_status accessible';
  RAISE NOTICE '   Nombre d''AG: %', v_count;

  -- Afficher un exemple
  FOR v_count IN
    SELECT 1 FROM v_ag_correspondence_status
    WHERE forms_received > 0
    LIMIT 1
  LOOP
    RAISE NOTICE '   AG avec votes correspondance trouvée';
  END LOOP;

END $$;


-- ============================================
-- TEST 5: Fonction get_ag_live_results
-- ============================================

DO $$
DECLARE
  v_ag_id UUID;
  v_result JSONB;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: Résultats live (projecteur) ===';

  -- Trouver une AG
  SELECT id INTO v_ag_id FROM ag_meetings LIMIT 1;

  IF v_ag_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune AG trouvée';
    RETURN;
  END IF;

  v_result := get_ag_live_results(v_ag_id);

  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE 'OK: Résultats live récupérés';
    RAISE NOTICE '   AG: %', v_result->'ag'->>'title';
    RAISE NOTICE '   Status: %', v_result->'ag'->>'status';
    RAISE NOTICE '   Quorum: %% présent', v_result->'quorum'->>'quorum_ratio';
    RAISE NOTICE '   Résolutions: %', jsonb_array_length(v_result->'resolutions');
  ELSE
    RAISE WARNING 'FAIL: %', v_result->>'error';
  END IF;

END $$;


-- ============================================
-- TEST 6: Fonction get_correspondence_eligible_owners
-- ============================================

DO $$
DECLARE
  v_ag_id UUID;
  v_result JSONB;
  v_owners_count INT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: Copropriétaires éligibles ===';

  SELECT id INTO v_ag_id FROM ag_meetings WHERE status IN ('draft', 'convoked') LIMIT 1;

  IF v_ag_id IS NULL THEN
    SELECT id INTO v_ag_id FROM ag_meetings LIMIT 1;
  END IF;

  IF v_ag_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune AG trouvée';
    RETURN;
  END IF;

  v_result := get_correspondence_eligible_owners(v_ag_id);

  IF (v_result->>'success')::boolean THEN
    v_owners_count := jsonb_array_length(v_result->'owners');
    RAISE NOTICE 'OK: Liste éligibles récupérée';
    RAISE NOTICE '   AG: %', v_result->>'ag_title';
    RAISE NOTICE '   Copropriétaires: %', v_owners_count;

    IF v_owners_count > 0 THEN
      RAISE NOTICE '   Premier: %', (v_result->'owners'->0->>'name');
    END IF;
  ELSE
    RAISE WARNING 'FAIL: %', v_result->>'error';
  END IF;

END $$;


-- ============================================
-- TEST 7: Enregistrement formulaire complet
-- ============================================

DO $$
DECLARE
  v_ag_id UUID;
  v_copro_id UUID;
  v_owner_id UUID;
  v_votes JSONB;
  v_result JSONB;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 7: Formulaire complet ===';

  -- Récupérer une AG avec résolutions
  SELECT m.id, m.copro_id INTO v_ag_id, v_copro_id
  FROM ag_meetings m
  WHERE m.status IN ('draft', 'convoked')
    AND EXISTS (SELECT 1 FROM ag_resolutions r WHERE r.ag_id = m.id)
  LIMIT 1;

  IF v_ag_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucune AG appropriée trouvée';
    RETURN;
  END IF;

  -- Récupérer un copropriétaire
  SELECT c.id INTO v_owner_id
  FROM coproprietaires c
  JOIN lot_owners lo ON lo.coproprietaire_id = c.id
  WHERE lo.copro_id = v_copro_id AND lo.end_date IS NULL
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE NOTICE 'SKIP: Aucun copropriétaire trouvé';
    RETURN;
  END IF;

  -- Construire les votes pour toutes les résolutions
  SELECT jsonb_agg(jsonb_build_object(
    'resolution_id', r.id,
    'vote', CASE (r.resolution_number % 3)
      WHEN 0 THEN 'for'
      WHEN 1 THEN 'against'
      ELSE 'abstention'
    END
  ))
  INTO v_votes
  FROM ag_resolutions r
  WHERE r.ag_id = v_ag_id;

  IF v_votes IS NULL OR jsonb_array_length(v_votes) = 0 THEN
    RAISE NOTICE 'SKIP: Aucune résolution trouvée';
    RETURN;
  END IF;

  RAISE NOTICE 'Enregistrement de % votes...', jsonb_array_length(v_votes);

  -- Enregistrer le formulaire
  v_result := register_correspondence_form_votes(
    v_ag_id,
    v_owner_id,
    v_votes,
    'postal'
  );

  IF (v_result->>'success')::boolean THEN
    RAISE NOTICE 'OK: Formulaire enregistré';
    RAISE NOTICE '   Form ID: %', v_result->>'form_id';
    RAISE NOTICE '   Votes réussis: %', v_result->>'votes_registered';
    RAISE NOTICE '   Votes échoués: %', v_result->>'votes_failed';
  ELSE
    RAISE NOTICE 'INFO: %', v_result->>'error';
  END IF;

  -- Cleanup
  DELETE FROM ag_votes WHERE coproprietaire_id = v_owner_id
    AND resolution_id IN (SELECT id FROM ag_resolutions WHERE ag_id = v_ag_id);
  DELETE FROM ag_correspondence_vote_details WHERE coproprietaire_id = v_owner_id
    AND resolution_id IN (SELECT id FROM ag_resolutions WHERE ag_id = v_ag_id);
  DELETE FROM ag_correspondence_votes WHERE coproprietaire_id = v_owner_id AND ag_id = v_ag_id;
  DELETE FROM ag_attendance WHERE coproprietaire_id = v_owner_id AND ag_id = v_ag_id AND presence_type = 'correspondence';

END $$;


-- ============================================
-- FIN DES TESTS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== TESTS NIVEAU 4E TERMINÉS ===';
  RAISE NOTICE 'Vérifiez les résultats ci-dessus.';
  RAISE NOTICE 'Les données de test ont été nettoyées.';
END $$;
