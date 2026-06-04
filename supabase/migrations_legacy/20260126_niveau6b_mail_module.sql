-- ============================================================================
-- NIVEAU 6B COMPLÉMENT : MODULE MAIL OFFICIEL
-- CoProFlex - Mailing & Campagnes
-- Date: 2026-01-26
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Statut de campagne email
DO $$ BEGIN
  CREATE TYPE mail_campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Type de destinataires
DO $$ BEGIN
  CREATE TYPE mail_recipient_type AS ENUM ('all', 'council', 'by_building', 'by_floor', 'custom');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Statut de livraison
DO $$ BEGIN
  CREATE TYPE mail_delivery_status AS ENUM ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- TABLE: MAIL_TEMPLATES (Modèles de mail réutilisables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Contenu
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,

  -- Catégorie
  category TEXT NULL, -- 'convocation', 'rappel', 'info', 'custom'

  -- Variables disponibles
  variables JSONB NULL, -- ['{{nom}}', '{{lot}}', '{{date}}']

  -- Visibilité
  is_system BOOLEAN NOT NULL DEFAULT false, -- Templates système non modifiables

  -- Audit
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mail_templates IS 'Modèles de mail réutilisables pour les campagnes.';

CREATE INDEX IF NOT EXISTS idx_mail_templates_copro ON mail_templates(copro_id);
CREATE INDEX IF NOT EXISTS idx_mail_templates_category ON mail_templates(copro_id, category);

-- ============================================================================
-- TABLE: MAIL_FOLDERS (Dossiers personnalisés)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Contenu
  name TEXT NOT NULL,
  color TEXT NULL DEFAULT '#6b7280',
  icon TEXT NULL,

  -- Ordre d'affichage
  sort_order INT NOT NULL DEFAULT 0,

  -- Dossier système (inbox, sent, drafts, archived, trash)
  is_system BOOLEAN NOT NULL DEFAULT false,
  system_type TEXT NULL, -- 'inbox', 'sent', 'drafts', 'archived', 'trash'

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_mail_folder_name UNIQUE (user_id, name)
);

COMMENT ON TABLE mail_folders IS 'Dossiers personnalisés pour organiser les mails.';

CREATE INDEX IF NOT EXISTS idx_mail_folders_user ON mail_folders(user_id);

-- ============================================================================
-- TABLE: MAIL_CAMPAIGNS (Campagnes d'emailing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Contenu
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  preview_text TEXT NULL, -- Texte de prévisualisation

  -- Template source (optionnel)
  template_id UUID NULL REFERENCES mail_templates(id) ON DELETE SET NULL,

  -- Destinataires
  recipient_type mail_recipient_type NOT NULL DEFAULT 'all',
  recipient_filter JSONB NULL, -- Filtres: { building: 'A', floor: 2, custom_ids: [...] }

  -- Pièces jointes
  attachment_ids UUID[] NULL,

  -- Planification
  status mail_campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ NULL,
  sent_at TIMESTAMPTZ NULL,

  -- Statistiques (dénormalisées pour perf)
  total_recipients INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  delivered_count INT NOT NULL DEFAULT 0,
  opened_count INT NOT NULL DEFAULT 0,
  clicked_count INT NOT NULL DEFAULT 0,
  bounced_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,

  -- Dossier
  folder_id UUID NULL REFERENCES mail_folders(id) ON DELETE SET NULL,

  -- Créateur
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mail_campaigns IS 'Campagnes d''emailing officielles de la copropriété.';

CREATE INDEX IF NOT EXISTS idx_mail_campaigns_copro ON mail_campaigns(copro_id);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_status ON mail_campaigns(copro_id, status);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_folder ON mail_campaigns(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_created ON mail_campaigns(copro_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_campaigns_scheduled ON mail_campaigns(scheduled_at)
  WHERE status = 'scheduled';

-- ============================================================================
-- TABLE: MAIL_RECIPIENTS (Destinataires d'une campagne)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES mail_campaigns(id) ON DELETE CASCADE,

  -- Destinataire
  coproprietaire_id UUID NULL REFERENCES coproprietaires(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NULL,

  -- Variables personnalisées pour le template
  variables JSONB NULL, -- { nom: 'Dupont', lot: 'A-101', montant: '1234.56' }

  -- Statut de livraison
  delivery_status mail_delivery_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  opened_at TIMESTAMPTZ NULL,
  clicked_at TIMESTAMPTZ NULL,
  bounced_at TIMESTAMPTZ NULL,
  failed_at TIMESTAMPTZ NULL,

  -- Erreur éventuelle
  error_message TEXT NULL,

  -- Message-ID pour tracking
  message_id TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_mail_recipient UNIQUE (campaign_id, email)
);

COMMENT ON TABLE mail_recipients IS 'Destinataires individuels d''une campagne mail avec statut de livraison.';

CREATE INDEX IF NOT EXISTS idx_mail_recipients_campaign ON mail_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_mail_recipients_email ON mail_recipients(email);
CREATE INDEX IF NOT EXISTS idx_mail_recipients_status ON mail_recipients(campaign_id, delivery_status);
CREATE INDEX IF NOT EXISTS idx_mail_recipients_coproprietaire ON mail_recipients(coproprietaire_id)
  WHERE coproprietaire_id IS NOT NULL;

-- ============================================================================
-- TABLE: MAIL_INBOX (Réception de mails - réponses, bounces)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mail_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Lien avec campagne d'origine (si réponse)
  original_campaign_id UUID NULL REFERENCES mail_campaigns(id) ON DELETE SET NULL,
  original_recipient_id UUID NULL REFERENCES mail_recipients(id) ON DELETE SET NULL,

  -- Expéditeur
  from_email TEXT NOT NULL,
  from_name TEXT NULL,

  -- Contenu
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  body_html TEXT NULL,

  -- Pièces jointes
  attachment_ids UUID[] NULL,

  -- Statut
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,

  -- Dossier
  folder_id UUID NULL REFERENCES mail_folders(id) ON DELETE SET NULL,

  -- Propriétaire (gestionnaire qui reçoit)
  owner_id UUID NOT NULL REFERENCES profiles(id),

  -- Métadonnées
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_id TEXT NULL,
  in_reply_to TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE mail_inbox IS 'Boîte de réception des mails entrants (réponses aux campagnes).';

CREATE INDEX IF NOT EXISTS idx_mail_inbox_copro ON mail_inbox(copro_id);
CREATE INDEX IF NOT EXISTS idx_mail_inbox_owner ON mail_inbox(owner_id);
CREATE INDEX IF NOT EXISTS idx_mail_inbox_folder ON mail_inbox(folder_id) WHERE folder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mail_inbox_unread ON mail_inbox(owner_id, is_read) WHERE NOT is_read AND NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_mail_inbox_received ON mail_inbox(copro_id, received_at DESC);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: updated_at
DO $$
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'mail_templates', 'mail_folders', 'mail_campaigns', 'mail_inbox'
  ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_updated_at_%I ON %I;
      CREATE TRIGGER trg_updated_at_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- Trigger: Mise à jour des stats campagne après changement status destinataire
CREATE OR REPLACE FUNCTION update_mail_campaign_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

  UPDATE mail_campaigns
  SET
    sent_count = (SELECT COUNT(*) FROM mail_recipients WHERE campaign_id = v_campaign_id AND delivery_status != 'pending'),
    delivered_count = (SELECT COUNT(*) FROM mail_recipients WHERE campaign_id = v_campaign_id AND delivery_status IN ('delivered', 'opened', 'clicked')),
    opened_count = (SELECT COUNT(*) FROM mail_recipients WHERE campaign_id = v_campaign_id AND delivery_status IN ('opened', 'clicked')),
    clicked_count = (SELECT COUNT(*) FROM mail_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'clicked'),
    bounced_count = (SELECT COUNT(*) FROM mail_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'bounced'),
    failed_count = (SELECT COUNT(*) FROM mail_recipients WHERE campaign_id = v_campaign_id AND delivery_status = 'failed'),
    updated_at = NOW()
  WHERE id = v_campaign_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mail_recipients_stats
  AFTER INSERT OR UPDATE OF delivery_status OR DELETE ON mail_recipients
  FOR EACH ROW EXECUTE FUNCTION update_mail_campaign_stats();

-- ============================================================================
-- FONCTIONS
-- ============================================================================

-- Fonction: Créer les dossiers système pour un utilisateur
CREATE OR REPLACE FUNCTION create_mail_system_folders(
  p_copro_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO mail_folders (copro_id, user_id, name, is_system, system_type, sort_order)
  VALUES
    (p_copro_id, p_user_id, 'Boîte de réception', true, 'inbox', 0),
    (p_copro_id, p_user_id, 'Envoyés', true, 'sent', 1),
    (p_copro_id, p_user_id, 'Brouillons', true, 'drafts', 2),
    (p_copro_id, p_user_id, 'Archivés', true, 'archived', 3),
    (p_copro_id, p_user_id, 'Corbeille', true, 'trash', 4)
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Générer les destinataires d'une campagne
CREATE OR REPLACE FUNCTION generate_campaign_recipients(p_campaign_id UUID)
RETURNS INT AS $$
DECLARE
  v_campaign RECORD;
  v_count INT := 0;
BEGIN
  SELECT * INTO v_campaign FROM mail_campaigns WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Supprimer les destinataires existants
  DELETE FROM mail_recipients WHERE campaign_id = p_campaign_id;

  -- Insérer selon le type de destinataire
  IF v_campaign.recipient_type = 'all' THEN
    INSERT INTO mail_recipients (copro_id, campaign_id, coproprietaire_id, email, name, variables)
    SELECT
      v_campaign.copro_id,
      p_campaign_id,
      c.id,
      c.email,
      CONCAT(c.prenom, ' ', c.nom),
      jsonb_build_object('nom', c.nom, 'prenom', c.prenom)
    FROM coproprietaires c
    WHERE c.copro_id = v_campaign.copro_id
      AND c.email IS NOT NULL
      AND c.email != '';

  ELSIF v_campaign.recipient_type = 'council' THEN
    INSERT INTO mail_recipients (copro_id, campaign_id, coproprietaire_id, email, name, variables)
    SELECT
      v_campaign.copro_id,
      p_campaign_id,
      cm.coproprietaire_id,
      COALESCE(c.email, p.email),
      COALESCE(CONCAT(c.prenom, ' ', c.nom), p.full_name),
      jsonb_build_object('role', cm.role::TEXT)
    FROM council_members cm
    LEFT JOIN coproprietaires c ON c.id = cm.coproprietaire_id
    LEFT JOIN profiles p ON p.id = cm.user_id
    WHERE cm.copro_id = v_campaign.copro_id
      AND cm.is_active = true
      AND COALESCE(c.email, p.email) IS NOT NULL;

  ELSIF v_campaign.recipient_type = 'custom' AND v_campaign.recipient_filter ? 'custom_ids' THEN
    INSERT INTO mail_recipients (copro_id, campaign_id, coproprietaire_id, email, name, variables)
    SELECT
      v_campaign.copro_id,
      p_campaign_id,
      c.id,
      c.email,
      CONCAT(c.prenom, ' ', c.nom),
      jsonb_build_object('nom', c.nom, 'prenom', c.prenom)
    FROM coproprietaires c
    WHERE c.copro_id = v_campaign.copro_id
      AND c.id::TEXT = ANY(ARRAY(SELECT jsonb_array_elements_text(v_campaign.recipient_filter->'custom_ids')))
      AND c.email IS NOT NULL
      AND c.email != '';
  END IF;

  -- Compter et mettre à jour
  SELECT COUNT(*) INTO v_count FROM mail_recipients WHERE campaign_id = p_campaign_id;

  UPDATE mail_campaigns SET total_recipients = v_count WHERE id = p_campaign_id;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Activer RLS
ALTER TABLE mail_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_inbox ENABLE ROW LEVEL SECURITY;

-- === MAIL_TEMPLATES ===
CREATE POLICY "mail_templates_select" ON mail_templates
  FOR SELECT USING (
    user_has_copro_access(copro_id) AND (
      user_is_copro_manager(copro_id) OR
      is_system = true -- Templates système visibles par tous
    )
  );

CREATE POLICY "mail_templates_insert" ON mail_templates
  FOR INSERT WITH CHECK (
    user_is_copro_manager(copro_id) AND created_by = auth.uid()
  );

CREATE POLICY "mail_templates_update" ON mail_templates
  FOR UPDATE USING (
    user_is_copro_manager(copro_id) AND NOT is_system
  );

CREATE POLICY "mail_templates_delete" ON mail_templates
  FOR DELETE USING (
    user_is_copro_manager(copro_id) AND NOT is_system
  );

-- === MAIL_FOLDERS ===
CREATE POLICY "mail_folders_select" ON mail_folders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "mail_folders_insert" ON mail_folders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "mail_folders_update" ON mail_folders
  FOR UPDATE USING (user_id = auth.uid() AND NOT is_system);

CREATE POLICY "mail_folders_delete" ON mail_folders
  FOR DELETE USING (user_id = auth.uid() AND NOT is_system);

-- === MAIL_CAMPAIGNS ===
CREATE POLICY "mail_campaigns_select" ON mail_campaigns
  FOR SELECT USING (
    user_is_copro_manager(copro_id) OR
    created_by = auth.uid()
  );

CREATE POLICY "mail_campaigns_insert" ON mail_campaigns
  FOR INSERT WITH CHECK (
    user_is_copro_manager(copro_id) AND created_by = auth.uid()
  );

CREATE POLICY "mail_campaigns_update" ON mail_campaigns
  FOR UPDATE USING (
    user_is_copro_manager(copro_id) AND status IN ('draft', 'scheduled')
  );

CREATE POLICY "mail_campaigns_delete" ON mail_campaigns
  FOR DELETE USING (
    user_is_copro_manager(copro_id) AND status = 'draft'
  );

-- === MAIL_RECIPIENTS ===
CREATE POLICY "mail_recipients_select" ON mail_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM mail_campaigns mc
      WHERE mc.id = campaign_id
        AND (user_is_copro_manager(mc.copro_id) OR mc.created_by = auth.uid())
    )
  );

CREATE POLICY "mail_recipients_insert" ON mail_recipients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM mail_campaigns mc
      WHERE mc.id = campaign_id
        AND user_is_copro_manager(mc.copro_id)
    )
  );

CREATE POLICY "mail_recipients_update" ON mail_recipients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM mail_campaigns mc
      WHERE mc.id = campaign_id
        AND user_is_copro_manager(mc.copro_id)
    )
  );

-- === MAIL_INBOX ===
CREATE POLICY "mail_inbox_select" ON mail_inbox
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "mail_inbox_update" ON mail_inbox
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "mail_inbox_delete" ON mail_inbox
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================================================
-- VUES
-- ============================================================================

-- Vue: Campagnes avec stats
CREATE OR REPLACE VIEW v_mail_campaigns_overview
WITH (security_invoker = true) AS
SELECT
  mc.id,
  mc.copro_id,
  mc.subject,
  LEFT(mc.body, 200) as preview,
  mc.template_id,
  mt.name as template_name,
  mc.recipient_type,
  mc.status,
  mc.scheduled_at,
  mc.sent_at,
  mc.total_recipients,
  mc.sent_count,
  mc.delivered_count,
  mc.opened_count,
  mc.clicked_count,
  mc.bounced_count,
  mc.failed_count,
  CASE
    WHEN mc.sent_count > 0 THEN ROUND((mc.opened_count::NUMERIC / mc.sent_count) * 100, 1)
    ELSE 0
  END as open_rate,
  CASE
    WHEN mc.opened_count > 0 THEN ROUND((mc.clicked_count::NUMERIC / mc.opened_count) * 100, 1)
    ELSE 0
  END as click_rate,
  mc.folder_id,
  mf.name as folder_name,
  mc.created_by,
  p.full_name as created_by_name,
  mc.created_at,
  mc.updated_at
FROM mail_campaigns mc
LEFT JOIN mail_templates mt ON mt.id = mc.template_id
LEFT JOIN mail_folders mf ON mf.id = mc.folder_id
LEFT JOIN profiles p ON p.id = mc.created_by
ORDER BY mc.created_at DESC;

COMMENT ON VIEW v_mail_campaigns_overview IS 'Vue des campagnes mail avec statistiques.';

-- Vue: Inbox avec infos
CREATE OR REPLACE VIEW v_mail_inbox_overview
WITH (security_invoker = true) AS
SELECT
  mi.id,
  mi.copro_id,
  mi.original_campaign_id,
  mc.subject as original_campaign_subject,
  mi.from_email,
  mi.from_name,
  mi.subject,
  LEFT(mi.body, 200) as preview,
  mi.is_read,
  mi.is_starred,
  mi.is_archived,
  mi.is_deleted,
  mi.folder_id,
  mf.name as folder_name,
  mi.owner_id,
  mi.received_at,
  mi.created_at
FROM mail_inbox mi
LEFT JOIN mail_campaigns mc ON mc.id = mi.original_campaign_id
LEFT JOIN mail_folders mf ON mf.id = mi.folder_id
WHERE NOT mi.is_deleted
ORDER BY mi.received_at DESC;

COMMENT ON VIEW v_mail_inbox_overview IS 'Vue de la boîte de réception.';

-- ============================================================================
-- FIN
-- ============================================================================
