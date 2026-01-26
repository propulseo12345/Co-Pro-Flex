-- ============================================
-- Migration: NIVEAU 5A - NOTIFICATIONS AG (Envoi Convocations)
-- Date: 2026-01-25
-- Description: Traçabilité des envois de convocations AG par email
-- Référentiel légal:
--   - Art. 9 décret 67-223: contenu convocation
--   - Art. 64 décret 67-223: délai 21 jours minimum
--   - Art. 42 loi 65-557: nullité si copropriétaire non convoqué
--   - Art. 18 décret 67-223: notification PV absents (2 mois max)
-- Conservation: 10 ans minimum (preuve d'envoi juridique)
-- Dépendances: copros, ag_meetings, coproprietaires, ag_documents
-- ============================================

-- ============================================
-- 0) TYPES ENUM
-- ============================================

-- Type de notification AG
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ag_notification_type') THEN
    CREATE TYPE ag_notification_type AS ENUM (
      'convocation',      -- Convocation initiale AG (Art. 64 décret)
      'relance',          -- Relance convocation
      'pv',               -- Procès-verbal post-AG (Art. 18 décret)
      'reminder'          -- Rappel date AG proche
    );
  END IF;
END $$;

-- Statut de livraison
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status') THEN
    CREATE TYPE delivery_status AS ENUM (
      'pending',          -- En attente d'envoi
      'queued',           -- En file d'attente email provider
      'sent',             -- Envoyé avec succès
      'delivered',        -- Livré (confirmation provider)
      'opened',           -- Ouvert par destinataire (tracking)
      'bounced',          -- Échec livraison (email invalide)
      'failed',           -- Erreur technique
      'cancelled'         -- Annulé par l'utilisateur
    );
  END IF;
END $$;

-- Canal d'envoi
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE notification_channel AS ENUM (
      'email',            -- Email standard
      'registered_email', -- Email avec accusé de réception électronique
      'postal',           -- Courrier postal
      'registered_postal',-- Recommandé AR
      'hand_delivery'     -- Remise en main propre
    );
  END IF;
END $$;


-- ============================================
-- 1) TABLE ag_notifications - Journal des envois
-- ============================================

CREATE TABLE IF NOT EXISTS ag_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,

  -- Destinataire
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,                    -- Email utilisé (snapshot)
  recipient_name TEXT NOT NULL,                     -- Nom (snapshot pour historique)

  -- Type et canal
  notification_type ag_notification_type NOT NULL,
  channel notification_channel NOT NULL DEFAULT 'email',

  -- Document joint
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  document_storage_path TEXT,                       -- Copie du path pour traçabilité

  -- Statut de livraison
  delivery_status delivery_status NOT NULL DEFAULT 'pending',

  -- Horodatage
  scheduled_at TIMESTAMPTZ,                         -- Date d'envoi prévue
  sent_at TIMESTAMPTZ,                              -- Date d'envoi effectif
  delivered_at TIMESTAMPTZ,                         -- Date de livraison (si tracking)
  opened_at TIMESTAMPTZ,                            -- Date d'ouverture (si tracking)
  failed_at TIMESTAMPTZ,                            -- Date d'échec

  -- Provider info
  email_provider TEXT DEFAULT 'resend',             -- Provider utilisé
  provider_message_id TEXT,                         -- ID message chez le provider

  -- Détails erreur si échec
  error_code TEXT,
  error_message TEXT,

  -- Métadonnées
  metadata JSONB DEFAULT '{}'::jsonb,               -- Données additionnelles

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contrainte: un seul envoi par type/AG/copro (sauf relances multiples)
  CONSTRAINT unique_initial_notification UNIQUE NULLS NOT DISTINCT (
    ag_id,
    coproprietaire_id,
    notification_type
  ) WHERE notification_type = 'convocation'
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_ag_notif_copro ON ag_notifications(copro_id);
CREATE INDEX IF NOT EXISTS idx_ag_notif_ag ON ag_notifications(ag_id);
CREATE INDEX IF NOT EXISTS idx_ag_notif_coproprio ON ag_notifications(coproprietaire_id);
CREATE INDEX IF NOT EXISTS idx_ag_notif_type ON ag_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_ag_notif_status ON ag_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_ag_notif_sent ON ag_notifications(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_ag_notif_ag_type ON ag_notifications(ag_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_ag_notif_pending ON ag_notifications(delivery_status)
  WHERE delivery_status IN ('pending', 'queued');

COMMENT ON TABLE ag_notifications IS 'Journal des envois de notifications AG (convocations, relances, PV) - Conservation 10 ans';
COMMENT ON COLUMN ag_notifications.recipient_email IS 'Email au moment de l''envoi (snapshot pour traçabilité)';
COMMENT ON COLUMN ag_notifications.provider_message_id IS 'ID chez le provider email pour tracking';
COMMENT ON COLUMN ag_notifications.document_storage_path IS 'Chemin du document joint (snapshot)';


-- ============================================
-- 2) TABLE ag_notification_events - Historique événements
-- ============================================
-- Pour tracking détaillé des statuts (webhooks provider)

CREATE TABLE IF NOT EXISTS ag_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES ag_notifications(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,                         -- sent, delivered, opened, bounced, etc.
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Données brutes du webhook
  raw_data JSONB DEFAULT '{}'::jsonb,

  -- Info additionnelle
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ag_notif_events_notif ON ag_notification_events(notification_id);
CREATE INDEX IF NOT EXISTS idx_ag_notif_events_type ON ag_notification_events(event_type);

COMMENT ON TABLE ag_notification_events IS 'Historique des événements de livraison (webhooks email provider)';


-- ============================================
-- 3) TRIGGERS
-- ============================================

-- A) Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION trg_ag_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ag_notifications_updated ON ag_notifications;
CREATE TRIGGER trg_ag_notifications_updated
  BEFORE UPDATE ON ag_notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_notifications_updated_at();


-- B) Trigger: Mise à jour statut depuis événement
CREATE OR REPLACE FUNCTION trg_notification_event_update_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le statut de la notification selon l'événement
  UPDATE ag_notifications
  SET
    delivery_status = CASE NEW.event_type
      WHEN 'sent' THEN 'sent'::delivery_status
      WHEN 'delivered' THEN 'delivered'::delivery_status
      WHEN 'opened' THEN 'opened'::delivery_status
      WHEN 'bounced' THEN 'bounced'::delivery_status
      WHEN 'failed' THEN 'failed'::delivery_status
      ELSE delivery_status
    END,
    delivered_at = CASE WHEN NEW.event_type = 'delivered' THEN NEW.event_timestamp ELSE delivered_at END,
    opened_at = CASE WHEN NEW.event_type = 'opened' THEN NEW.event_timestamp ELSE opened_at END,
    failed_at = CASE WHEN NEW.event_type IN ('bounced', 'failed') THEN NEW.event_timestamp ELSE failed_at END,
    error_message = CASE
      WHEN NEW.event_type IN ('bounced', 'failed') THEN COALESCE(NEW.raw_data->>'error', error_message)
      ELSE error_message
    END,
    updated_at = NOW()
  WHERE id = NEW.notification_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notification_event_status ON ag_notification_events;
CREATE TRIGGER trg_notification_event_status
  AFTER INSERT ON ag_notification_events
  FOR EACH ROW
  EXECUTE FUNCTION trg_notification_event_update_status();


-- ============================================
-- 4) VUES
-- ============================================

-- A) Vue: Notifications AG avec informations complètes
CREATE OR REPLACE VIEW v_ag_notifications AS
SELECT
  n.id,
  n.copro_id,
  co.name AS copro_name,
  n.ag_id,
  m.title AS ag_title,
  m.meeting_date AS ag_date,
  m.status AS ag_status,

  n.coproprietaire_id,
  n.recipient_name,
  n.recipient_email,

  n.notification_type,
  n.channel,
  n.delivery_status,

  n.document_id,
  n.document_storage_path,

  n.scheduled_at,
  n.sent_at,
  n.delivered_at,
  n.opened_at,
  n.failed_at,

  n.provider_message_id,
  n.error_code,
  n.error_message,

  n.created_by,
  p.full_name AS created_by_name,
  n.created_at,
  n.updated_at,

  -- Calculs
  CASE
    WHEN n.delivery_status = 'opened' THEN 'Ouvert'
    WHEN n.delivery_status = 'delivered' THEN 'Livré'
    WHEN n.delivery_status = 'sent' THEN 'Envoyé'
    WHEN n.delivery_status = 'queued' THEN 'En file'
    WHEN n.delivery_status = 'pending' THEN 'En attente'
    WHEN n.delivery_status = 'bounced' THEN 'Échec (email invalide)'
    WHEN n.delivery_status = 'failed' THEN 'Erreur'
    WHEN n.delivery_status = 'cancelled' THEN 'Annulé'
  END AS status_label

FROM ag_notifications n
JOIN copros co ON co.id = n.copro_id
JOIN ag_meetings m ON m.id = n.ag_id
LEFT JOIN profiles p ON p.id = n.created_by;

ALTER VIEW v_ag_notifications SET (security_invoker = true);

COMMENT ON VIEW v_ag_notifications IS 'Notifications AG avec métadonnées complètes';


-- B) Vue: Statistiques envois par AG
CREATE OR REPLACE VIEW v_ag_notification_stats AS
SELECT
  n.ag_id,
  m.title AS ag_title,
  m.meeting_date,
  n.notification_type,

  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE n.delivery_status = 'sent') AS sent,
  COUNT(*) FILTER (WHERE n.delivery_status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE n.delivery_status = 'opened') AS opened,
  COUNT(*) FILTER (WHERE n.delivery_status IN ('bounced', 'failed')) AS failed,
  COUNT(*) FILTER (WHERE n.delivery_status = 'pending') AS pending,

  -- Taux
  ROUND(
    COUNT(*) FILTER (WHERE n.delivery_status IN ('sent', 'delivered', 'opened'))::numeric /
    NULLIF(COUNT(*), 0) * 100, 1
  ) AS success_rate,

  -- Dates
  MIN(n.sent_at) AS first_sent_at,
  MAX(n.sent_at) AS last_sent_at

FROM ag_notifications n
JOIN ag_meetings m ON m.id = n.ag_id
GROUP BY n.ag_id, m.title, m.meeting_date, n.notification_type;

ALTER VIEW v_ag_notification_stats SET (security_invoker = true);


-- C) Vue: Copropriétaires non notifiés pour une AG
CREATE OR REPLACE VIEW v_ag_missing_notifications AS
SELECT
  m.id AS ag_id,
  m.copro_id,
  m.title AS ag_title,
  m.meeting_date,
  c.id AS coproprietaire_id,
  c.civilite,
  c.nom,
  c.prenom,
  c.email,
  COALESCE(lo.total_tantiemes, 0) AS tantiemes,
  'convocation'::ag_notification_type AS notification_type,
  -- Vérifie si notification existe
  n.id IS NOT NULL AS is_notified,
  n.delivery_status,
  n.sent_at

FROM ag_meetings m
CROSS JOIN coproprietaires c
LEFT JOIN (
  SELECT
    coproprietaire_id,
    SUM(tantiemes_generaux) AS total_tantiemes
  FROM lot_owners lo
  JOIN lots l ON l.id = lo.lot_id
  WHERE lo.is_active = true
  GROUP BY coproprietaire_id
) lo ON lo.coproprietaire_id = c.id
LEFT JOIN ag_notifications n ON n.ag_id = m.id
  AND n.coproprietaire_id = c.id
  AND n.notification_type = 'convocation'
WHERE c.copro_id = m.copro_id
  AND c.is_active = true
  AND c.email IS NOT NULL
  AND c.email != '';

ALTER VIEW v_ag_missing_notifications SET (security_invoker = true);


-- ============================================
-- 5) RLS POLICIES
-- ============================================

-- Activer RLS
ALTER TABLE ag_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_notification_events ENABLE ROW LEVEL SECURITY;

-- ag_notifications: SELECT pour tous les membres
CREATE POLICY "Users can view notifications of their copros"
ON ag_notifications FOR SELECT
USING (user_has_copro_access(copro_id));

-- ag_notifications: INSERT/UPDATE/DELETE pour gestionnaires
CREATE POLICY "Only managers can create notifications"
ON ag_notifications FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can update notifications"
ON ag_notifications FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can delete notifications"
ON ag_notifications FOR DELETE
USING (user_is_copro_manager(copro_id));

-- ag_notification_events: SELECT pour gestionnaires (données sensibles)
CREATE POLICY "Only managers can view notification events"
ON ag_notification_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM ag_notifications n
  WHERE n.id = notification_id
    AND user_is_copro_manager(n.copro_id)
));

-- ag_notification_events: INSERT pour service account (webhooks)
CREATE POLICY "Service can insert notification events"
ON ag_notification_events FOR INSERT
WITH CHECK (true); -- Les webhooks utilisent service_role


-- ============================================
-- 6) FONCTIONS UTILITAIRES
-- ============================================

-- A) Fonction: Récupérer les copropriétaires à notifier
CREATE OR REPLACE FUNCTION get_ag_recipients(
  p_ag_id UUID,
  p_notification_type ag_notification_type DEFAULT 'convocation',
  p_only_missing BOOLEAN DEFAULT false
)
RETURNS TABLE (
  coproprietaire_id UUID,
  civilite TEXT,
  nom TEXT,
  prenom TEXT,
  email TEXT,
  lots TEXT[],
  tantiemes INTEGER,
  already_notified BOOLEAN,
  notification_status delivery_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS coproprietaire_id,
    c.civilite,
    c.nom,
    c.prenom,
    c.email,
    ARRAY_AGG(DISTINCT l.reference) AS lots,
    COALESCE(SUM(l.tantiemes_generaux)::INTEGER, 0) AS tantiemes,
    n.id IS NOT NULL AS already_notified,
    n.delivery_status AS notification_status
  FROM ag_meetings m
  JOIN coproprietaires c ON c.copro_id = m.copro_id AND c.is_active = true
  LEFT JOIN lot_owners lo ON lo.coproprietaire_id = c.id AND lo.is_active = true
  LEFT JOIN lots l ON l.id = lo.lot_id
  LEFT JOIN ag_notifications n ON n.ag_id = m.id
    AND n.coproprietaire_id = c.id
    AND n.notification_type = p_notification_type
  WHERE m.id = p_ag_id
    AND c.email IS NOT NULL
    AND c.email != ''
    AND (NOT p_only_missing OR n.id IS NULL)
  GROUP BY c.id, c.civilite, c.nom, c.prenom, c.email, n.id, n.delivery_status
  ORDER BY c.nom, c.prenom;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION get_ag_recipients IS 'Liste les copropriétaires à notifier pour une AG, avec statut existant';


-- B) Fonction: Créer notification pour envoi
CREATE OR REPLACE FUNCTION create_ag_notification(
  p_copro_id UUID,
  p_ag_id UUID,
  p_coproprietaire_id UUID,
  p_notification_type ag_notification_type,
  p_channel notification_channel DEFAULT 'email',
  p_document_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_recipient RECORD;
  v_doc_path TEXT;
BEGIN
  -- Récupérer infos destinataire
  SELECT
    email,
    COALESCE(
      CASE
        WHEN civilite IS NOT NULL THEN civilite || ' '
        ELSE ''
      END ||
      COALESCE(prenom || ' ', '') ||
      nom,
      nom
    ) AS full_name
  INTO v_recipient
  FROM coproprietaires
  WHERE id = p_coproprietaire_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Copropriétaire % non trouvé', p_coproprietaire_id;
  END IF;

  -- Récupérer chemin document si fourni
  IF p_document_id IS NOT NULL THEN
    SELECT storage_path INTO v_doc_path
    FROM documents
    WHERE id = p_document_id;
  END IF;

  -- Créer la notification
  INSERT INTO ag_notifications (
    copro_id,
    ag_id,
    coproprietaire_id,
    recipient_email,
    recipient_name,
    notification_type,
    channel,
    document_id,
    document_storage_path,
    delivery_status,
    created_by
  ) VALUES (
    p_copro_id,
    p_ag_id,
    p_coproprietaire_id,
    v_recipient.email,
    v_recipient.full_name,
    p_notification_type,
    p_channel,
    p_document_id,
    v_doc_path,
    'pending',
    auth.uid()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- C) Fonction: Marquer notification comme envoyée
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id UUID,
  p_provider_message_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ag_notifications
  SET
    delivery_status = 'sent',
    sent_at = NOW(),
    provider_message_id = p_provider_message_id,
    updated_at = NOW()
  WHERE id = p_notification_id
    AND delivery_status IN ('pending', 'queued');

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- D) Fonction: Marquer notification en échec
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id UUID,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ag_notifications
  SET
    delivery_status = 'failed',
    failed_at = NOW(),
    error_code = p_error_code,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_notification_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- E) Fonction: Vérifier délai légal convocation (21 jours)
CREATE OR REPLACE FUNCTION check_convocation_delay(p_ag_id UUID)
RETURNS TABLE (
  is_valid BOOLEAN,
  days_until_ag INTEGER,
  minimum_days INTEGER,
  ag_date DATE,
  warning_message TEXT
) AS $$
DECLARE
  v_meeting_date DATE;
  v_days INTEGER;
BEGIN
  SELECT meeting_date::DATE INTO v_meeting_date
  FROM ag_meetings
  WHERE id = p_ag_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 21, NULL::DATE, 'AG non trouvée';
    RETURN;
  END IF;

  v_days := v_meeting_date - CURRENT_DATE;

  RETURN QUERY SELECT
    v_days >= 21,
    v_days,
    21,
    v_meeting_date,
    CASE
      WHEN v_days < 0 THEN 'ERREUR: La date de l''AG est passée'
      WHEN v_days < 21 THEN 'ATTENTION: Délai légal de 21 jours non respecté (Art. 64 décret 67-223)'
      ELSE 'OK: Délai légal respecté'
    END;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_convocation_delay IS 'Vérifie le respect du délai légal de 21 jours (Art. 64 décret 67-223)';


-- F) Fonction: Statistiques envoi pour une AG
CREATE OR REPLACE FUNCTION get_ag_sending_stats(p_ag_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_recipients', COUNT(DISTINCT c.id),
    'total_with_email', COUNT(DISTINCT c.id) FILTER (WHERE c.email IS NOT NULL AND c.email != ''),
    'sent', COUNT(n.id) FILTER (WHERE n.delivery_status IN ('sent', 'delivered', 'opened')),
    'failed', COUNT(n.id) FILTER (WHERE n.delivery_status IN ('bounced', 'failed')),
    'pending', COUNT(n.id) FILTER (WHERE n.delivery_status = 'pending'),
    'not_sent', COUNT(DISTINCT c.id) FILTER (WHERE c.email IS NOT NULL AND c.email != '') - COUNT(n.id),
    'success_rate', ROUND(
      COUNT(n.id) FILTER (WHERE n.delivery_status IN ('sent', 'delivered', 'opened'))::numeric /
      NULLIF(COUNT(DISTINCT c.id) FILTER (WHERE c.email IS NOT NULL AND c.email != ''), 0) * 100, 1
    )
  )
  INTO v_result
  FROM ag_meetings m
  JOIN coproprietaires c ON c.copro_id = m.copro_id AND c.is_active = true
  LEFT JOIN ag_notifications n ON n.ag_id = m.id
    AND n.coproprietaire_id = c.id
    AND n.notification_type = 'convocation'
  WHERE m.id = p_ag_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;


-- ============================================
-- 7) TEMPLATE EMAIL
-- ============================================

-- Table pour les templates d'email
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID REFERENCES copros(id) ON DELETE CASCADE,  -- NULL = template global

  code TEXT NOT NULL,                                      -- Identifiant unique
  name TEXT NOT NULL,                                      -- Nom affichable
  description TEXT,

  subject TEXT NOT NULL,                                   -- Objet email (avec variables)
  body_html TEXT NOT NULL,                                 -- Corps HTML (avec variables)
  body_text TEXT,                                          -- Corps texte brut (fallback)

  -- Variables disponibles (documentation)
  available_variables JSONB DEFAULT '[]'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_code ON email_templates(code);
CREATE INDEX IF NOT EXISTS idx_email_templates_copro ON email_templates(copro_id);

-- RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their copro templates"
ON email_templates FOR SELECT
USING (copro_id IS NULL OR user_has_copro_access(copro_id));

CREATE POLICY "Only managers can manage templates"
ON email_templates FOR ALL
USING (copro_id IS NULL OR user_is_copro_manager(copro_id))
WITH CHECK (copro_id IS NULL OR user_is_copro_manager(copro_id));

-- Insertion des templates par défaut
INSERT INTO email_templates (code, name, subject, body_html, body_text, available_variables, is_default)
VALUES
(
  'ag_convocation',
  'Convocation Assemblée Générale',
  'Convocation - Assemblée Générale {{ag_type}} du {{ag_date}}',
  E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #2563eb; font-size: 20px; margin: 0; }
    .highlight { background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 15px 0; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .btn { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .legal { font-size: 11px; color: #9ca3af; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{copropriete_nom}}</h1>
  </div>

  <p>{{destinataire_civilite}} {{destinataire_nom}},</p>

  <p>Nous avons l''honneur de vous convoquer à l''<strong>Assemblée Générale {{ag_type}}</strong> de votre copropriété.</p>

  <div class="highlight">
    <p><strong>Date :</strong> {{ag_date}} à {{ag_heure}}</p>
    <p><strong>Lieu :</strong> {{ag_lieu}}</p>
    <p><strong>Ordre du jour :</strong> {{resolutions_count}} résolution(s)</p>
  </div>

  <p>Vous trouverez ci-joint la convocation complète avec l''ordre du jour détaillé et les documents annexes.</p>

  <p>Conformément à l''article 17-1 A de la loi du 10 juillet 1965, vous pouvez voter par correspondance en utilisant le formulaire joint.</p>

  <p><a href="{{document_url}}" class="btn">Télécharger la convocation</a></p>

  <p>Nous vous prions d''agréer, {{destinataire_civilite}} {{destinataire_nom}}, l''expression de nos salutations distinguées.</p>

  <p><strong>{{syndic_nom}}</strong><br>Votre syndic</p>

  <div class="footer">
    <p>{{copropriete_nom}}<br>{{copropriete_adresse}}</p>
  </div>

  <div class="legal">
    <p>Ce message est envoyé conformément aux dispositions de l''article 64 du décret n°67-223 du 17 mars 1967. La convocation doit être reçue au moins 21 jours avant la date de l''assemblée générale.</p>
    <p>Conformément à l''article 42 de la loi n°65-557 du 10 juillet 1965, les décisions prises en assemblée générale peuvent être contestées dans un délai de deux mois à compter de leur notification.</p>
  </div>
</body>
</html>',
  E'{{copropriete_nom}}

{{destinataire_civilite}} {{destinataire_nom}},

Nous avons l''honneur de vous convoquer à l''Assemblée Générale {{ag_type}} de votre copropriété.

Date : {{ag_date}} à {{ag_heure}}
Lieu : {{ag_lieu}}
Ordre du jour : {{resolutions_count}} résolution(s)

Vous trouverez ci-joint la convocation complète avec l''ordre du jour détaillé et les documents annexes.

Conformément à l''article 17-1 A de la loi du 10 juillet 1965, vous pouvez voter par correspondance en utilisant le formulaire joint.

Télécharger la convocation : {{document_url}}

Nous vous prions d''agréer, {{destinataire_civilite}} {{destinataire_nom}}, l''expression de nos salutations distinguées.

{{syndic_nom}}
Votre syndic

---
{{copropriete_nom}}
{{copropriete_adresse}}

Ce message est envoyé conformément aux dispositions de l''article 64 du décret n°67-223 du 17 mars 1967.',
  '[
    {"name": "copropriete_nom", "description": "Nom de la copropriété"},
    {"name": "copropriete_adresse", "description": "Adresse de la copropriété"},
    {"name": "syndic_nom", "description": "Nom du syndic"},
    {"name": "destinataire_civilite", "description": "Civilité du destinataire"},
    {"name": "destinataire_nom", "description": "Nom du destinataire"},
    {"name": "ag_type", "description": "Type d''AG (Ordinaire, Extraordinaire)"},
    {"name": "ag_date", "description": "Date de l''AG"},
    {"name": "ag_heure", "description": "Heure de l''AG"},
    {"name": "ag_lieu", "description": "Lieu de l''AG"},
    {"name": "resolutions_count", "description": "Nombre de résolutions"},
    {"name": "document_url", "description": "URL du document joint"}
  ]'::jsonb,
  true
),
(
  'ag_relance',
  'Relance Convocation AG',
  'RAPPEL - Assemblée Générale du {{ag_date}}',
  E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #f59e0b; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #f59e0b; font-size: 20px; margin: 0; }
    .highlight { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
    .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>RAPPEL - {{copropriete_nom}}</h1>
  </div>

  <p>{{destinataire_civilite}} {{destinataire_nom}},</p>

  <p>Nous vous rappelons que l''Assemblée Générale {{ag_type}} de votre copropriété se tiendra prochainement.</p>

  <div class="highlight">
    <p><strong>Date :</strong> {{ag_date}} à {{ag_heure}}</p>
    <p><strong>Lieu :</strong> {{ag_lieu}}</p>
    <p><strong>J-{{days_remaining}} avant l''AG</strong></p>
  </div>

  <p>Si vous ne pouvez pas être présent, nous vous rappelons que vous pouvez :</p>
  <ul>
    <li>Voter par correspondance (formulaire joint à la convocation)</li>
    <li>Donner pouvoir à un autre copropriétaire</li>
  </ul>

  <p><a href="{{document_url}}" class="btn">Consulter la convocation</a></p>

  <p>Cordialement,</p>
  <p><strong>{{syndic_nom}}</strong></p>

  <div class="footer">
    <p>{{copropriete_nom}}<br>{{copropriete_adresse}}</p>
  </div>
</body>
</html>',
  NULL,
  '[
    {"name": "days_remaining", "description": "Jours restants avant l''AG"}
  ]'::jsonb,
  true
),
(
  'ag_pv_notification',
  'Notification PV Assemblée Générale',
  'Procès-Verbal - Assemblée Générale du {{ag_date}}',
  E'<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #22c55e; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #22c55e; font-size: 20px; margin: 0; }
    .btn { display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
    .legal { font-size: 11px; color: #9ca3af; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{copropriete_nom}}</h1>
  </div>

  <p>{{destinataire_civilite}} {{destinataire_nom}},</p>

  <p>L''Assemblée Générale {{ag_type}} s''est tenue le {{ag_date}}.</p>

  <p>Conformément à l''article 18 du décret n°67-223, vous trouverez ci-joint le procès-verbal des décisions prises.</p>

  <p><a href="{{document_url}}" class="btn">Télécharger le procès-verbal</a></p>

  <p>Cordialement,</p>
  <p><strong>{{syndic_nom}}</strong></p>

  <div class="footer">
    <p>{{copropriete_nom}}<br>{{copropriete_adresse}}</p>
  </div>

  <div class="legal">
    <p>Conformément à l''article 42 de la loi n°65-557 du 10 juillet 1965, les décisions de l''assemblée générale peuvent être contestées par tout copropriétaire opposant ou défaillant dans un délai de deux mois à compter de la notification du procès-verbal.</p>
  </div>
</body>
</html>',
  NULL,
  '[]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;


-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
