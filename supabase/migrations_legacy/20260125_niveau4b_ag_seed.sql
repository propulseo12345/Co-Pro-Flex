-- ============================================
-- SEED: NIVEAU 4B - ASSEMBLÉES GÉNÉRALES (AG)
-- Date: 2026-01-25
-- Description: Données de test pour le module AG
-- ============================================

-- Utiliser la copropriété de test existante
DO $$
DECLARE
  v_copro_id UUID;
  v_period_id UUID;
  v_ag_id UUID;
  v_resolution1_id UUID;
  v_resolution2_id UUID;
  v_resolution3_id UUID;
  v_resolution4_id UUID;
  v_coproprietaire_ids UUID[];
  v_lot_ids UUID[];
  v_i INT;
BEGIN
  -- 1. Récupérer la copropriété de test
  SELECT id INTO v_copro_id FROM copros WHERE name ILIKE '%Jardins%' OR name ILIKE '%test%' LIMIT 1;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'No test copro found, skipping AG seed';
    RETURN;
  END IF;

  RAISE NOTICE 'Using copro_id: %', v_copro_id;

  -- 2. Récupérer quelques copropriétaires pour les tests
  SELECT array_agg(id ORDER BY last_name)
  INTO v_coproprietaire_ids
  FROM coproprietaires
  WHERE copro_id = v_copro_id
  LIMIT 5;

  IF array_length(v_coproprietaire_ids, 1) < 3 THEN
    RAISE NOTICE 'Not enough coproprietaires, skipping AG seed';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % coproprietaires', array_length(v_coproprietaire_ids, 1);

  -- 3. Créer une AG de test
  INSERT INTO ag_meetings (
    copro_id,
    title,
    meeting_type,
    meeting_date,
    location,
    status,
    convocation_date,
    president_name,
    secretary_name,
    session_started_at,
    opening_notes
  ) VALUES (
    v_copro_id,
    'Assemblée Générale Ordinaire 2026',
    'ordinary',
    NOW() + INTERVAL '30 days',
    'Salle des fêtes, 15 rue de la Mairie, 75001 Paris',
    'in_progress',
    NOW() - INTERVAL '21 days',
    'M. Jean DUPONT',
    'Syndic CoProFlex',
    NOW(),
    'L''assemblée est ouverte à 18h00. Le quorum est atteint.'
  )
  RETURNING id INTO v_ag_id;

  RAISE NOTICE 'Created AG: %', v_ag_id;

  -- 4. Créer des résolutions de test avec différentes majorités

  -- Résolution 1: Art. 24 (majorité simple)
  INSERT INTO ag_resolutions (
    ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type, status
  ) VALUES (
    v_ag_id, v_copro_id, 1,
    'Approbation des comptes de l''exercice 2025',
    'L''assemblée est appelée à approuver les comptes de gestion de l''exercice 2025 présentés par le syndic.',
    'art24', 'accounts', 'pending'
  )
  RETURNING id INTO v_resolution1_id;

  -- Résolution 2: Art. 25 (majorité absolue)
  INSERT INTO ag_resolutions (
    ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type, status
  ) VALUES (
    v_ag_id, v_copro_id, 2,
    'Travaux de ravalement de façade',
    'L''assemblée est appelée à décider de l''exécution de travaux de ravalement de la façade principale pour un montant estimé de 45 000 euros.',
    'art25', 'works', 'pending'
  )
  RETURNING id INTO v_resolution2_id;

  -- Résolution 3: Art. 26 (double majorité)
  INSERT INTO ag_resolutions (
    ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type, status
  ) VALUES (
    v_ag_id, v_copro_id, 3,
    'Modification du règlement de copropriété',
    'L''assemblée est appelée à modifier l''article 15 du règlement de copropriété concernant les conditions d''utilisation des parties communes.',
    'art26', 'rules', 'pending'
  )
  RETURNING id INTO v_resolution3_id;

  -- Résolution 4: Unanimité
  INSERT INTO ag_resolutions (
    ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type, status
  ) VALUES (
    v_ag_id, v_copro_id, 4,
    'Aliénation d''une partie commune',
    'L''assemblée est appelée à autoriser la vente d''une portion de la loge de concierge (partie commune) au copropriétaire du lot n°12.',
    'unanimity', 'other', 'pending'
  )
  RETURNING id INTO v_resolution4_id;

  RAISE NOTICE 'Created 4 resolutions';

  -- 5. Enregistrer les présences avec lots

  -- Copropriétaire 1: Présent
  INSERT INTO ag_attendance (
    ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, signed, signed_at, arrived_at
  )
  SELECT
    v_ag_id,
    v_copro_id,
    v_coproprietaire_ids[1],
    ARRAY(SELECT lot_id FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[1] AND end_date IS NULL),
    'present',
    true,
    NOW(),
    NOW() - INTERVAL '10 minutes'
  WHERE EXISTS (SELECT 1 FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[1]);

  -- Copropriétaire 2: Présent
  INSERT INTO ag_attendance (
    ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, signed, signed_at, arrived_at
  )
  SELECT
    v_ag_id,
    v_copro_id,
    v_coproprietaire_ids[2],
    ARRAY(SELECT lot_id FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[2] AND end_date IS NULL),
    'present',
    true,
    NOW(),
    NOW() - INTERVAL '8 minutes'
  WHERE EXISTS (SELECT 1 FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[2]);

  -- Copropriétaire 3: Représenté par procuration
  INSERT INTO ag_attendance (
    ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, represented_by_name, signed
  )
  SELECT
    v_ag_id,
    v_copro_id,
    v_coproprietaire_ids[3],
    ARRAY(SELECT lot_id FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[3] AND end_date IS NULL),
    'proxy',
    'M. Jean DUPONT (pouvoir)',
    true
  WHERE EXISTS (SELECT 1 FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[3]);

  -- Copropriétaire 4: Vote par correspondance
  IF array_length(v_coproprietaire_ids, 1) >= 4 THEN
    INSERT INTO ag_attendance (
      ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, signed
    )
    SELECT
      v_ag_id,
      v_copro_id,
      v_coproprietaire_ids[4],
      ARRAY(SELECT lot_id FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[4] AND end_date IS NULL),
      'correspondence',
      true
    WHERE EXISTS (SELECT 1 FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[4]);
  END IF;

  -- Copropriétaire 5: Présent
  IF array_length(v_coproprietaire_ids, 1) >= 5 THEN
    INSERT INTO ag_attendance (
      ag_id, copro_id, coproprietaire_id, lot_ids, presence_type, signed, arrived_at
    )
    SELECT
      v_ag_id,
      v_copro_id,
      v_coproprietaire_ids[5],
      ARRAY(SELECT lot_id FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[5] AND end_date IS NULL),
      'present',
      true,
      NOW() - INTERVAL '5 minutes'
    WHERE EXISTS (SELECT 1 FROM lot_owners WHERE coproprietaire_id = v_coproprietaire_ids[5]);
  END IF;

  RAISE NOTICE 'Registered attendances';

  -- 6. Enregistrer des votes pour la résolution 1 (Art. 24 - devrait passer)

  -- Vote POUR des copropriétaires 1, 2, 3
  FOR v_i IN 1..3 LOOP
    INSERT INTO ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
    SELECT
      v_resolution1_id,
      v_copro_id,
      v_coproprietaire_ids[v_i],
      'for',
      a.tantiemes,
      CASE WHEN a.presence_type = 'correspondence' THEN 'correspondence' ELSE 'live' END
    FROM ag_attendance a
    WHERE a.ag_id = v_ag_id AND a.coproprietaire_id = v_coproprietaire_ids[v_i];
  END LOOP;

  -- Vote CONTRE du copropriétaire 4
  IF array_length(v_coproprietaire_ids, 1) >= 4 THEN
    INSERT INTO ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
    SELECT
      v_resolution1_id,
      v_copro_id,
      v_coproprietaire_ids[4],
      'against',
      a.tantiemes,
      'correspondence'
    FROM ag_attendance a
    WHERE a.ag_id = v_ag_id AND a.coproprietaire_id = v_coproprietaire_ids[4];
  END IF;

  -- Abstention du copropriétaire 5
  IF array_length(v_coproprietaire_ids, 1) >= 5 THEN
    INSERT INTO ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
    SELECT
      v_resolution1_id,
      v_copro_id,
      v_coproprietaire_ids[5],
      'abstention',
      a.tantiemes,
      'live'
    FROM ag_attendance a
    WHERE a.ag_id = v_ag_id AND a.coproprietaire_id = v_coproprietaire_ids[5];
  END IF;

  RAISE NOTICE 'Recorded votes for resolution 1';

  -- 7. Enregistrer des votes pour la résolution 2 (Art. 25 - potentiellement rejetée, passerelle possible)

  -- Vote POUR des copropriétaires 1, 2
  FOR v_i IN 1..2 LOOP
    INSERT INTO ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
    SELECT
      v_resolution2_id,
      v_copro_id,
      v_coproprietaire_ids[v_i],
      'for',
      a.tantiemes,
      'live'
    FROM ag_attendance a
    WHERE a.ag_id = v_ag_id AND a.coproprietaire_id = v_coproprietaire_ids[v_i];
  END LOOP;

  -- Vote CONTRE des copropriétaires 3, 4, 5
  FOR v_i IN 3..LEAST(5, array_length(v_coproprietaire_ids, 1)) LOOP
    INSERT INTO ag_votes (resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source)
    SELECT
      v_resolution2_id,
      v_copro_id,
      v_coproprietaire_ids[v_i],
      'against',
      a.tantiemes,
      CASE WHEN a.presence_type = 'correspondence' THEN 'correspondence' ELSE 'live' END
    FROM ag_attendance a
    WHERE a.ag_id = v_ag_id AND a.coproprietaire_id = v_coproprietaire_ids[v_i];
  END LOOP;

  RAISE NOTICE 'Recorded votes for resolution 2';

  -- 8. Créer un enregistrement de vote par correspondance
  IF array_length(v_coproprietaire_ids, 1) >= 4 THEN
    INSERT INTO ag_correspondence_votes (
      ag_id, copro_id, coproprietaire_id, received_at, validated, validated_at, integrated_at, notes
    ) VALUES (
      v_ag_id,
      v_copro_id,
      v_coproprietaire_ids[4],
      NOW() - INTERVAL '5 days',
      true,
      NOW() - INTERVAL '3 days',
      NOW(),
      'Formulaire reçu par courrier recommandé'
    );
  END IF;

  RAISE NOTICE 'AG seed completed successfully';
  RAISE NOTICE 'AG ID: %', v_ag_id;
  RAISE NOTICE 'Resolution 1 (Art. 24): %', v_resolution1_id;
  RAISE NOTICE 'Resolution 2 (Art. 25): %', v_resolution2_id;
  RAISE NOTICE 'Resolution 3 (Art. 26): %', v_resolution3_id;
  RAISE NOTICE 'Resolution 4 (Unanimité): %', v_resolution4_id;

END $$;
