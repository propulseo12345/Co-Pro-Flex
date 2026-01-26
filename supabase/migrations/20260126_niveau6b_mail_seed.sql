-- ============================================================================
-- NIVEAU 6B : SEED DATA - Module Mail
-- CoProFlex - Données de test mailing
-- Date: 2026-01-26
-- ============================================================================

DO $$
DECLARE
  v_copro_id UUID;
  v_user_gestionnaire_id UUID;
  v_template_convocation_id UUID;
  v_template_rappel_id UUID;
  v_template_info_id UUID;
  v_campaign_sent_id UUID;
  v_campaign_draft_id UUID;
  v_folder_inbox_id UUID;
  v_folder_sent_id UUID;
BEGIN
  -- ============================================================================
  -- Récupérer les données de référence
  -- ============================================================================

  SELECT id INTO v_copro_id FROM copros LIMIT 1;
  IF v_copro_id IS NULL THEN
    RAISE NOTICE 'Aucune copropriété trouvée - skip seed mail';
    RETURN;
  END IF;

  SELECT id INTO v_user_gestionnaire_id FROM profiles WHERE role = 'manager' LIMIT 1;
  IF v_user_gestionnaire_id IS NULL THEN
    RAISE NOTICE 'Aucun gestionnaire trouvé - skip seed mail';
    RETURN;
  END IF;

  -- ============================================================================
  -- 1) TEMPLATES
  -- ============================================================================

  -- Template: Convocation AG
  INSERT INTO mail_templates (copro_id, name, subject, body, category, variables, is_system, created_by)
  VALUES (
    v_copro_id,
    'Convocation Assemblée Générale',
    'Convocation à l''Assemblée Générale du {{date}}',
    'Madame, Monsieur {{nom}},

Vous êtes convoqué(e) à l''Assemblée Générale Ordinaire de la copropriété {{copropriete}} qui se tiendra :

📅 Date : {{date}}
🕐 Heure : {{heure}}
📍 Lieu : {{lieu}}

L''ordre du jour est joint au présent courrier.

En cas d''absence, vous pouvez vous faire représenter par un autre copropriétaire muni d''un pouvoir.

Nous vous rappelons que votre présence est importante pour le bon fonctionnement de la copropriété.

Cordialement,
Le Syndic',
    'convocation',
    '["{{nom}}", "{{copropriete}}", "{{date}}", "{{heure}}", "{{lieu}}"]'::JSONB,
    true,
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_template_convocation_id;

  -- Template: Rappel échéances
  INSERT INTO mail_templates (copro_id, name, subject, body, category, variables, is_system, created_by)
  VALUES (
    v_copro_id,
    'Rappel échéance appel de fonds',
    'Rappel : Appel de fonds du {{trimestre}} à régler',
    'Madame, Monsieur {{nom}},

Nous vous rappelons que l''appel de fonds du {{trimestre}} d''un montant de {{montant}} € reste à ce jour impayé.

Date d''échéance : {{date_echeance}}
Référence : {{reference}}

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Modes de paiement acceptés :
- Virement bancaire (IBAN : {{iban}})
- Prélèvement automatique (demandez le formulaire)
- Chèque à l''ordre de {{syndic}}

Pour toute question, n''hésitez pas à nous contacter.

Cordialement,
Le Syndic',
    'rappel',
    '["{{nom}}", "{{trimestre}}", "{{montant}}", "{{date_echeance}}", "{{reference}}", "{{iban}}", "{{syndic}}"]'::JSONB,
    true,
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_template_rappel_id;

  -- Template: Information générale
  INSERT INTO mail_templates (copro_id, name, subject, body, category, variables, is_system, created_by)
  VALUES (
    v_copro_id,
    'Information générale',
    '{{sujet}}',
    'Madame, Monsieur,

{{contenu}}

Restant à votre disposition pour tout renseignement complémentaire.

Cordialement,
Le Syndic
{{copropriete}}',
    'info',
    '["{{sujet}}", "{{contenu}}", "{{copropriete}}"]'::JSONB,
    true,
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_template_info_id;

  RAISE NOTICE 'Templates créés: convocation=%, rappel=%, info=%', v_template_convocation_id, v_template_rappel_id, v_template_info_id;

  -- ============================================================================
  -- 2) DOSSIERS SYSTÈME
  -- ============================================================================

  PERFORM create_mail_system_folders(v_copro_id, v_user_gestionnaire_id);

  SELECT id INTO v_folder_inbox_id FROM mail_folders
    WHERE user_id = v_user_gestionnaire_id AND system_type = 'inbox';

  SELECT id INTO v_folder_sent_id FROM mail_folders
    WHERE user_id = v_user_gestionnaire_id AND system_type = 'sent';

  RAISE NOTICE 'Dossiers système créés pour le gestionnaire';

  -- ============================================================================
  -- 3) CAMPAGNES
  -- ============================================================================

  -- Campagne 1: Envoyée (convocation AG)
  INSERT INTO mail_campaigns (copro_id, subject, body, template_id, recipient_type, status, sent_at, total_recipients, sent_count, delivered_count, opened_count, folder_id, created_by)
  VALUES (
    v_copro_id,
    'Convocation à l''Assemblée Générale du 15 mars 2026',
    'Madame, Monsieur,

Vous êtes convoqué(e) à l''Assemblée Générale Ordinaire de la copropriété Les Jardins du Parc qui se tiendra :

📅 Date : 15 mars 2026
🕐 Heure : 18h00
📍 Lieu : Salle de réunion - 15 rue des Lilas, Paris

L''ordre du jour est joint au présent courrier.

En cas d''absence, vous pouvez vous faire représenter par un autre copropriétaire muni d''un pouvoir.

Cordialement,
Le Syndic',
    v_template_convocation_id,
    'all',
    'sent',
    NOW() - INTERVAL '7 days',
    25,
    25,
    22,
    15,
    v_folder_sent_id,
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign_sent_id;

  -- Campagne 2: Brouillon (rappel impayés)
  INSERT INTO mail_campaigns (copro_id, subject, body, template_id, recipient_type, recipient_filter, status, folder_id, created_by)
  VALUES (
    v_copro_id,
    'Rappel : Appel de fonds T1 2026 à régler',
    'Madame, Monsieur,

Nous vous rappelons que l''appel de fonds du 1er trimestre 2026 reste à ce jour impayé.

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Cordialement,
Le Syndic',
    v_template_rappel_id,
    'custom',
    '{"custom_ids": []}'::JSONB,
    'draft',
    NULL,
    v_user_gestionnaire_id
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_campaign_draft_id;

  RAISE NOTICE 'Campagnes créées: envoyée=%, brouillon=%', v_campaign_sent_id, v_campaign_draft_id;

  -- ============================================================================
  -- 4) DESTINATAIRES (pour la campagne envoyée)
  -- ============================================================================

  IF v_campaign_sent_id IS NOT NULL THEN
    INSERT INTO mail_recipients (copro_id, campaign_id, coproprietaire_id, email, name, delivery_status, sent_at, delivered_at, opened_at)
    SELECT
      v_copro_id,
      v_campaign_sent_id,
      c.id,
      c.email,
      CONCAT(c.prenom, ' ', c.nom),
      CASE
        WHEN random() < 0.1 THEN 'bounced'::mail_delivery_status
        WHEN random() < 0.4 THEN 'delivered'::mail_delivery_status
        ELSE 'opened'::mail_delivery_status
      END,
      NOW() - INTERVAL '7 days',
      CASE WHEN random() < 0.9 THEN NOW() - INTERVAL '7 days' + INTERVAL '5 minutes' ELSE NULL END,
      CASE WHEN random() < 0.6 THEN NOW() - INTERVAL '6 days' ELSE NULL END
    FROM coproprietaires c
    WHERE c.copro_id = v_copro_id
      AND c.email IS NOT NULL
      AND c.email != ''
    LIMIT 25
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Destinataires créés pour la campagne envoyée';
  END IF;

  -- ============================================================================
  -- 5) INBOX (mails entrants - réponses)
  -- ============================================================================

  IF v_campaign_sent_id IS NOT NULL THEN
    INSERT INTO mail_inbox (copro_id, original_campaign_id, from_email, from_name, subject, body, is_read, folder_id, owner_id, received_at)
    VALUES
      (
        v_copro_id,
        v_campaign_sent_id,
        'jean.dupont@email.fr',
        'Jean Dupont',
        'Re: Convocation AG - Demande de pouvoir',
        'Bonjour,

Je ne pourrai malheureusement pas assister à l''AG du 15 mars.

Serait-il possible de m''envoyer un formulaire de pouvoir ? Je souhaite être représenté par Mme Martin (lot A-103).

Merci d''avance.

Cordialement,
Jean Dupont
Lot A-201',
        false,
        v_folder_inbox_id,
        v_user_gestionnaire_id,
        NOW() - INTERVAL '5 days'
      ),
      (
        v_copro_id,
        v_campaign_sent_id,
        'sophie.bernard@email.fr',
        'Sophie Bernard',
        'Re: Convocation AG - Question ordre du jour',
        'Bonjour,

J''ai bien reçu la convocation pour l''AG.

Concernant le point 5 de l''ordre du jour sur les travaux de ravalement, serait-il possible d''avoir plus de détails sur les devis reçus avant l''assemblée ?

Merci.

Sophie Bernard',
        true,
        v_folder_inbox_id,
        v_user_gestionnaire_id,
        NOW() - INTERVAL '4 days'
      )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Mails inbox créés';
  END IF;

  RAISE NOTICE 'Seed module mail terminé avec succès';

END $$;
