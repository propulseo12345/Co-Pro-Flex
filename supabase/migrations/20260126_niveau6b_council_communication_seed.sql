-- ============================================================================
-- NIVEAU 6B : SEED DATA - Conseil Syndical & Communication
-- CoProFlex - Données de test
-- Date: 2026-01-26
-- ============================================================================

-- Récupérer les IDs de référence
DO $$
DECLARE
  v_copro_id UUID;
  v_user_gestionnaire_id UUID;
  v_user_president_cs_id UUID;
  v_user_membre_cs_1_id UUID;
  v_user_membre_cs_2_id UUID;
  v_user_coproprietaire_id UUID;
  v_copro_1_id UUID;
  v_copro_2_id UUID;
  v_copro_3_id UUID;

  -- IDs créés
  v_member_president_id UUID;
  v_member_1_id UUID;
  v_member_2_id UUID;
  v_decision_1_id UUID;
  v_decision_2_id UUID;
  v_post_1_id UUID;
  v_post_2_id UUID;
  v_post_3_id UUID;
  v_event_1_id UUID;
  v_event_2_id UUID;
  v_conversation_1_id UUID;
BEGIN
  -- ============================================================================
  -- Récupérer la copropriété de démo
  -- ============================================================================

  SELECT id INTO v_copro_id FROM copros WHERE name ILIKE '%démo%' OR name ILIKE '%demo%' LIMIT 1;

  IF v_copro_id IS NULL THEN
    SELECT id INTO v_copro_id FROM copros LIMIT 1;
  END IF;

  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'Aucune copropriété trouvée - skip seed';
    RETURN;
  END IF;

  RAISE NOTICE 'Copropriété ID: %', v_copro_id;

  -- ============================================================================
  -- Récupérer ou créer des utilisateurs de test
  -- ============================================================================

  -- Gestionnaire
  SELECT id INTO v_user_gestionnaire_id FROM profiles WHERE role = 'manager' LIMIT 1;
  IF v_user_gestionnaire_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'gestionnaire@coproflex.test', 'Marie Gestionnaire', 'manager')
    RETURNING id INTO v_user_gestionnaire_id;
  END IF;

  -- Président CS
  SELECT id INTO v_user_president_cs_id FROM profiles WHERE full_name ILIKE '%président%' OR full_name ILIKE '%dupont%' LIMIT 1;
  IF v_user_president_cs_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'president.cs@coproflex.test', 'Jean Dupont (Président CS)', 'owner')
    RETURNING id INTO v_user_president_cs_id;
  END IF;

  -- Membre CS 1
  SELECT id INTO v_user_membre_cs_1_id FROM profiles WHERE full_name ILIKE '%martin%' LIMIT 1;
  IF v_user_membre_cs_1_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'membre.cs1@coproflex.test', 'Sophie Martin', 'owner')
    RETURNING id INTO v_user_membre_cs_1_id;
  END IF;

  -- Membre CS 2
  SELECT id INTO v_user_membre_cs_2_id FROM profiles WHERE full_name ILIKE '%bernard%' LIMIT 1;
  IF v_user_membre_cs_2_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'membre.cs2@coproflex.test', 'Pierre Bernard', 'owner')
    RETURNING id INTO v_user_membre_cs_2_id;
  END IF;

  -- Copropriétaire simple
  SELECT id INTO v_user_coproprietaire_id FROM profiles WHERE role = 'owner' AND id NOT IN (v_user_president_cs_id, v_user_membre_cs_1_id, v_user_membre_cs_2_id) LIMIT 1;
  IF v_user_coproprietaire_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'coproprietaire@coproflex.test', 'Alice Coproprietaire', 'owner')
    RETURNING id INTO v_user_coproprietaire_id;
  END IF;

  -- ============================================================================
  -- 1) CONSEIL SYNDICAL - Membres
  -- ============================================================================

  -- Président du CS
  INSERT INTO council_members (copro_id, user_id, role, start_date)
  VALUES (v_copro_id, v_user_president_cs_id, 'president', '2025-06-15')
  ON CONFLICT (copro_id, coproprietaire_id, start_date) DO NOTHING
  RETURNING id INTO v_member_president_id;

  IF v_member_president_id IS NULL THEN
    SELECT id INTO v_member_president_id FROM council_members
    WHERE copro_id = v_copro_id AND user_id = v_user_president_cs_id AND is_active = true;
  END IF;

  -- Membre 1
  INSERT INTO council_members (copro_id, user_id, role, start_date)
  VALUES (v_copro_id, v_user_membre_cs_1_id, 'member', '2025-06-15')
  ON CONFLICT (copro_id, coproprietaire_id, start_date) DO NOTHING
  RETURNING id INTO v_member_1_id;

  IF v_member_1_id IS NULL THEN
    SELECT id INTO v_member_1_id FROM council_members
    WHERE copro_id = v_copro_id AND user_id = v_user_membre_cs_1_id AND is_active = true;
  END IF;

  -- Membre 2
  INSERT INTO council_members (copro_id, user_id, role, start_date)
  VALUES (v_copro_id, v_user_membre_cs_2_id, 'member', '2025-06-15')
  ON CONFLICT (copro_id, coproprietaire_id, start_date) DO NOTHING
  RETURNING id INTO v_member_2_id;

  IF v_member_2_id IS NULL THEN
    SELECT id INTO v_member_2_id FROM council_members
    WHERE copro_id = v_copro_id AND user_id = v_user_membre_cs_2_id AND is_active = true;
  END IF;

  RAISE NOTICE 'Membres CS créés: président=%, membre1=%, membre2=%', v_member_president_id, v_member_1_id, v_member_2_id;

  -- ============================================================================
  -- 2) CONSEIL SYNDICAL - Décisions
  -- ============================================================================

  -- Décision 1: Brouillon
  INSERT INTO council_decisions (copro_id, title, description, status, created_by)
  VALUES (
    v_copro_id,
    'Choix du prestataire pour ravalement façade',
    'Le conseil syndical doit se prononcer sur le choix du prestataire pour les travaux de ravalement prévus en 2026. Trois devis ont été reçus.',
    'draft',
    v_user_president_cs_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_decision_1_id;

  -- Décision 2: Soumise (en cours de vote)
  INSERT INTO council_decisions (copro_id, title, description, status, created_by, submitted_at, submitted_by)
  VALUES (
    v_copro_id,
    'Avis sur remplacement de la chaudière collective',
    'Suite à l''expertise technique, le CS doit donner un avis sur l''opportunité de remplacer la chaudière actuelle. Le coût estimé est de 45 000 EUR.',
    'submitted',
    v_user_membre_cs_1_id,
    NOW() - INTERVAL '3 days',
    v_user_membre_cs_1_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_decision_2_id;

  -- Votes sur la décision 2
  IF v_decision_2_id IS NOT NULL AND v_member_president_id IS NOT NULL THEN
    INSERT INTO council_votes (copro_id, decision_id, council_member_id, vote, comment)
    VALUES
      (v_copro_id, v_decision_2_id, v_member_president_id, 'for', 'D''accord, la chaudière est vétuste'),
      (v_copro_id, v_decision_2_id, v_member_1_id, 'for', NULL)
    ON CONFLICT (decision_id, council_member_id) DO NOTHING;
  END IF;

  -- ============================================================================
  -- 3) MUR - Publications
  -- ============================================================================

  -- Post 1: Information générale (épinglé)
  INSERT INTO wall_posts (copro_id, author_id, title, content, category, visibility, is_pinned, pinned_at, pinned_by)
  VALUES (
    v_copro_id,
    v_user_gestionnaire_id,
    'Bienvenue sur le mur de la copropriété Les Jardins du Parc',
    'Chers copropriétaires,

Ce mur vous permet de partager des informations, poser des questions et rester informés de la vie de votre copropriété.

N''hésitez pas à consulter régulièrement les publications et à participer aux discussions.

Cordialement,
Votre syndic',
    'information',
    'all_members',
    true,
    NOW() - INTERVAL '30 days',
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_post_1_id;

  -- Post 2: Annonce urgente
  INSERT INTO wall_posts (copro_id, author_id, title, content, category, visibility)
  VALUES (
    v_copro_id,
    v_user_gestionnaire_id,
    'Coupure d''eau prévue le 28 janvier',
    'Une intervention sur la colonne montante du bâtiment A nécessite une coupure d''eau de 9h à 12h le mardi 28 janvier.

Pensez à faire vos réserves d''eau la veille.

Nous vous prions de nous excuser pour la gêne occasionnée.',
    'urgent',
    'all_members'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_post_2_id;

  -- Post 3: Question d'un copropriétaire
  INSERT INTO wall_posts (copro_id, author_id, title, content, category, visibility)
  VALUES (
    v_copro_id,
    v_user_coproprietaire_id,
    'Horaires de passage du jardinier ?',
    'Bonjour à tous,

Est-ce que quelqu''un sait quels jours passe le jardinier pour l''entretien des espaces verts ?

J''aimerais lui signaler quelques arbustes à tailler devant le bâtiment C.

Merci !',
    'question',
    'all_members'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_post_3_id;

  -- Commentaires sur le post 3
  IF v_post_3_id IS NOT NULL THEN
    INSERT INTO wall_comments (copro_id, post_id, author_id, content)
    VALUES
      (v_copro_id, v_post_3_id, v_user_membre_cs_1_id, 'Le jardinier passe normalement les mardis et vendredis matin. Vous pouvez lui laisser un mot dans la loge du gardien.'),
      (v_copro_id, v_post_3_id, v_user_coproprietaire_id, 'Merci pour l''info !')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Likes
  IF v_post_2_id IS NOT NULL THEN
    INSERT INTO wall_likes (copro_id, post_id, user_id)
    VALUES
      (v_copro_id, v_post_2_id, v_user_president_cs_id),
      (v_copro_id, v_post_2_id, v_user_coproprietaire_id)
    ON CONFLICT (post_id, user_id) DO NOTHING;
  END IF;

  -- ============================================================================
  -- 4) ÉVÉNEMENTS
  -- ============================================================================

  -- Événement 1: AG à venir
  INSERT INTO events (copro_id, title, description, event_type, location, starts_at, ends_at, visibility, created_by)
  VALUES (
    v_copro_id,
    'Assemblée Générale Ordinaire 2026',
    'L''AG annuelle se tiendra dans la salle de réunion du syndic. Ordre du jour : approbation des comptes, élection du CS, travaux façade.',
    'ag',
    'Salle de réunion - 15 rue des Lilas, Paris',
    '2026-03-15 18:00:00+01',
    '2026-03-15 21:00:00+01',
    'all_members',
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_event_1_id;

  -- Événement 2: Réunion CS
  INSERT INTO events (copro_id, title, description, event_type, location, starts_at, ends_at, visibility, created_by)
  VALUES (
    v_copro_id,
    'Réunion du Conseil Syndical',
    'Ordre du jour : préparation de l''AG, examen des devis ravalement, point sur les impayés.',
    'reunion_cs',
    'Bureaux du syndic',
    '2026-02-10 18:30:00+01',
    '2026-02-10 20:00:00+01',
    'council_only',
    v_user_president_cs_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_event_2_id;

  -- Événement 3: Travaux passés
  INSERT INTO events (copro_id, title, description, event_type, location, starts_at, ends_at, visibility, created_by)
  VALUES (
    v_copro_id,
    'Entretien ascenseur - Maintenance préventive',
    'Intervention du technicien OTIS pour la maintenance trimestrielle de l''ascenseur.',
    'intervention',
    'Hall d''entrée - Bâtiment A',
    '2026-01-20 09:00:00+01',
    '2026-01-20 12:00:00+01',
    'all_members',
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- 5) MESSAGERIE PRIVÉE
  -- ============================================================================

  -- Conversation 1: Entre gestionnaire et président CS
  INSERT INTO conversations (copro_id, subject, is_group, created_by, last_message_at, last_message_preview)
  VALUES (
    v_copro_id,
    'Préparation ordre du jour AG',
    false,
    v_user_gestionnaire_id,
    NOW() - INTERVAL '2 hours',
    'Parfait, je vous envoie le projet d''ordre du jour ce soir.'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_conversation_1_id;

  IF v_conversation_1_id IS NOT NULL THEN
    -- Membres de la conversation
    INSERT INTO conversation_members (copro_id, conversation_id, user_id, is_admin, joined_at)
    VALUES
      (v_copro_id, v_conversation_1_id, v_user_gestionnaire_id, true, NOW() - INTERVAL '1 day'),
      (v_copro_id, v_conversation_1_id, v_user_president_cs_id, false, NOW() - INTERVAL '1 day')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;

    -- Messages
    INSERT INTO messages (copro_id, conversation_id, author_id, content, created_at)
    VALUES
      (v_copro_id, v_conversation_1_id, v_user_gestionnaire_id, 'Bonjour M. Dupont, j''aimerais préparer l''ordre du jour de l''AG avec vous. Quelles résolutions souhaitez-vous inscrire de la part du CS ?', NOW() - INTERVAL '1 day'),
      (v_copro_id, v_conversation_1_id, v_user_president_cs_id, 'Bonjour, nous souhaiterions ajouter une résolution pour l''installation de bornes de recharge électrique au parking.', NOW() - INTERVAL '12 hours'),
      (v_copro_id, v_conversation_1_id, v_user_gestionnaire_id, 'Très bien, je l''ajoute. Avez-vous d''autres points ?', NOW() - INTERVAL '6 hours'),
      (v_copro_id, v_conversation_1_id, v_user_president_cs_id, 'Oui, aussi un point sur la mise en concurrence du contrat d''ascenseur qui arrive à échéance.', NOW() - INTERVAL '4 hours'),
      (v_copro_id, v_conversation_1_id, v_user_gestionnaire_id, 'Parfait, je vous envoie le projet d''ordre du jour ce soir.', NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Seed niveau 6B terminé avec succès';

END $$;
