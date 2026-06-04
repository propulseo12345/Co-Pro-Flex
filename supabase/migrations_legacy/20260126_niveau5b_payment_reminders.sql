-- ============================================================================
-- NIVEAU 5B: RELANCES IMPAYÉS AUTOMATISÉES
-- Automated Payment Reminders for Unpaid Charges
-- CoProFlex - Conformité Article 19 loi 65-557
-- ============================================================================

-- ============================================================================
-- ENUM: reminder_status
-- ============================================================================

CREATE TYPE reminder_status AS ENUM (
  'pending',     -- En attente d'envoi
  'sent',        -- Envoyée avec succès
  'failed',      -- Échec d'envoi
  'stale',       -- Obsolète (paiement reçu entre-temps)
  'skipped'      -- Ignorée (déjà relancé ce niveau)
);

-- ============================================================================
-- TABLE: payment_reminder_rules
-- Règles de relance configurables par copropriété
-- ============================================================================

CREATE TABLE payment_reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Délai en jours après échéance
  delay_days INTEGER NOT NULL CHECK (delay_days > 0),

  -- Canal d'envoi (email uniquement pour l'instant)
  channel notification_channel NOT NULL DEFAULT 'email',

  -- Template email associé
  template_id UUID REFERENCES email_templates(id),

  -- Nom descriptif de la règle
  label TEXT NOT NULL,

  -- Activation/désactivation
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Une seule règle par délai par copropriété
  CONSTRAINT uq_payment_reminder_rules_copro_delay
    UNIQUE (copro_id, delay_days)
);

-- Index pour recherche rapide
CREATE INDEX idx_payment_reminder_rules_copro ON payment_reminder_rules(copro_id);
CREATE INDEX idx_payment_reminder_rules_active ON payment_reminder_rules(copro_id, is_active) WHERE is_active = true;

-- ============================================================================
-- TABLE: payment_reminders
-- Historique des relances envoyées (conservation 10 ans)
-- ============================================================================

CREATE TABLE payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Destinataire
  lot_id UUID NOT NULL REFERENCES lots(id),
  owner_id UUID REFERENCES coproprietaires(id),

  -- Informations de l'impayé au moment de la relance
  unpaid_amount NUMERIC(15,2) NOT NULL CHECK (unpaid_amount > 0),
  oldest_due_date DATE NOT NULL,
  days_overdue INTEGER NOT NULL CHECK (days_overdue >= 0),

  -- Règle appliquée
  reminder_rule_id UUID REFERENCES payment_reminder_rules(id),
  delay_level INTEGER NOT NULL, -- 7, 30, 60 jours

  -- Statut et tracking
  status reminder_status NOT NULL DEFAULT 'pending',

  -- Coordonnées utilisées
  recipient_email TEXT,
  recipient_name TEXT,

  -- Tracking email
  provider_message_id TEXT,
  delivery_status delivery_status DEFAULT 'pending',

  -- Timestamps
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,

  -- Annulation (si paiement reçu ou autre raison)
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Contrainte: une seule relance active par lot par niveau de délai
  -- (permet de relancer plusieurs fois mais pas le même niveau en double)
  CONSTRAINT uq_payment_reminders_lot_delay_active
    UNIQUE (lot_id, delay_level, status)
    -- Seul 'pending' et 'sent' comptent comme "actifs"
);

-- Index pour recherches fréquentes
CREATE INDEX idx_payment_reminders_copro ON payment_reminders(copro_id);
CREATE INDEX idx_payment_reminders_lot ON payment_reminders(lot_id);
CREATE INDEX idx_payment_reminders_status ON payment_reminders(copro_id, status);
CREATE INDEX idx_payment_reminders_scheduled ON payment_reminders(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_payment_reminders_created ON payment_reminders(created_at DESC);

-- ============================================================================
-- VIEW: v_payment_reminders_overview
-- Vue enrichie des relances pour l'interface
-- ============================================================================

CREATE OR REPLACE VIEW v_payment_reminders_overview AS
SELECT
  pr.id,
  pr.copro_id,
  pr.lot_id,
  l.ref AS lot_ref,
  pr.owner_id,
  pr.recipient_name AS owner_name,
  pr.recipient_email,
  pr.unpaid_amount,
  pr.oldest_due_date,
  pr.days_overdue,
  pr.delay_level,
  pr.status,
  pr.delivery_status,
  pr.scheduled_at,
  pr.sent_at,
  pr.cancelled_at,
  pr.cancelled_reason,
  pr.created_at,
  -- Règle associée
  prr.label AS rule_label,
  prr.channel
FROM payment_reminders pr
JOIN lots l ON l.id = pr.lot_id
LEFT JOIN payment_reminder_rules prr ON prr.id = pr.reminder_rule_id;

-- ============================================================================
-- VIEW: v_unpaid_with_reminders
-- Vue des impayés enrichie avec dernière relance
-- ============================================================================

CREATE OR REPLACE VIEW v_unpaid_with_reminders AS
SELECT
  u.*,
  -- Dernière relance envoyée
  last_reminder.id AS last_reminder_id,
  last_reminder.delay_level AS last_reminder_level,
  last_reminder.status AS last_reminder_status,
  last_reminder.sent_at AS last_reminder_sent_at,
  -- Nombre total de relances
  COALESCE(reminder_count.total, 0) AS total_reminders_sent
FROM v_unpaid_by_lot u
LEFT JOIN LATERAL (
  SELECT id, delay_level, status, sent_at
  FROM payment_reminders
  WHERE lot_id = u.lot_id
    AND copro_id = u.copro_id
    AND status IN ('sent', 'pending')
  ORDER BY delay_level DESC, created_at DESC
  LIMIT 1
) last_reminder ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS total
  FROM payment_reminders
  WHERE lot_id = u.lot_id
    AND copro_id = u.copro_id
    AND status = 'sent'
) reminder_count ON true;

-- ============================================================================
-- FUNCTION: get_pending_reminders_to_send
-- Retourne les relances à envoyer pour une copropriété
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_reminders_to_send(p_copro_id UUID)
RETURNS TABLE (
  lot_id UUID,
  lot_ref TEXT,
  owner_id UUID,
  owner_name TEXT,
  owner_email TEXT,
  unpaid_amount NUMERIC,
  oldest_due_date DATE,
  days_overdue INTEGER,
  delay_level INTEGER,
  rule_id UUID,
  template_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH active_rules AS (
    SELECT
      prr.id AS rule_id,
      prr.delay_days,
      prr.template_id
    FROM payment_reminder_rules prr
    WHERE prr.copro_id = p_copro_id
      AND prr.is_active = true
      AND prr.channel = 'email'
  ),
  unpaid_lots AS (
    SELECT
      u.lot_id,
      u.lot_ref,
      u.owner_name,
      u.owner_email,
      u.total_unpaid,
      u.oldest_due_date,
      u.days_overdue
    FROM v_unpaid_by_lot u
    WHERE u.copro_id = p_copro_id
      AND u.total_unpaid > 0
      AND u.owner_email IS NOT NULL
  ),
  already_sent AS (
    SELECT DISTINCT pr.lot_id, pr.delay_level
    FROM payment_reminders pr
    WHERE pr.copro_id = p_copro_id
      AND pr.status IN ('sent', 'pending')
  )
  SELECT
    ul.lot_id,
    ul.lot_ref,
    c.id AS owner_id,
    ul.owner_name,
    ul.owner_email,
    ul.total_unpaid AS unpaid_amount,
    ul.oldest_due_date,
    ul.days_overdue,
    ar.delay_days AS delay_level,
    ar.rule_id,
    ar.template_id
  FROM unpaid_lots ul
  CROSS JOIN active_rules ar
  LEFT JOIN lots l ON l.id = ul.lot_id
  LEFT JOIN coproprietaires c ON c.id = l.owner_id
  WHERE ul.days_overdue >= ar.delay_days
    AND NOT EXISTS (
      SELECT 1 FROM already_sent asent
      WHERE asent.lot_id = ul.lot_id
        AND asent.delay_level = ar.delay_days
    )
  ORDER BY ul.days_overdue DESC, ar.delay_days ASC;
END;
$$;

-- ============================================================================
-- FUNCTION: create_payment_reminder
-- Crée un enregistrement de relance
-- ============================================================================

CREATE OR REPLACE FUNCTION create_payment_reminder(
  p_copro_id UUID,
  p_lot_id UUID,
  p_owner_id UUID,
  p_unpaid_amount NUMERIC,
  p_oldest_due_date DATE,
  p_days_overdue INTEGER,
  p_delay_level INTEGER,
  p_rule_id UUID,
  p_recipient_email TEXT,
  p_recipient_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reminder_id UUID;
BEGIN
  INSERT INTO payment_reminders (
    copro_id, lot_id, owner_id,
    unpaid_amount, oldest_due_date, days_overdue,
    delay_level, reminder_rule_id,
    recipient_email, recipient_name,
    status, created_by
  ) VALUES (
    p_copro_id, p_lot_id, p_owner_id,
    p_unpaid_amount, p_oldest_due_date, p_days_overdue,
    p_delay_level, p_rule_id,
    p_recipient_email, p_recipient_name,
    'pending', auth.uid()
  )
  RETURNING id INTO v_reminder_id;

  RETURN v_reminder_id;
END;
$$;

-- ============================================================================
-- FUNCTION: mark_reminder_sent
-- Marque une relance comme envoyée
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_reminder_sent(
  p_reminder_id UUID,
  p_provider_message_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payment_reminders
  SET
    status = 'sent',
    delivery_status = 'sent',
    sent_at = now(),
    provider_message_id = COALESCE(p_provider_message_id, provider_message_id)
  WHERE id = p_reminder_id;
END;
$$;

-- ============================================================================
-- FUNCTION: mark_reminder_failed
-- Marque une relance comme échouée
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_reminder_failed(
  p_reminder_id UUID,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE payment_reminders
  SET
    status = 'failed',
    delivery_status = 'failed',
    cancelled_reason = p_error_message
  WHERE id = p_reminder_id;
END;
$$;

-- ============================================================================
-- FUNCTION: cancel_stale_reminders
-- Annule les relances pending pour les lots qui ont payé
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_stale_reminders(p_copro_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cancelled_count INTEGER;
BEGIN
  WITH paid_lots AS (
    -- Lots qui n'ont plus d'impayés
    SELECT l.id AS lot_id
    FROM lots l
    WHERE l.copro_id = p_copro_id
      AND NOT EXISTS (
        SELECT 1 FROM v_unpaid_by_lot u
        WHERE u.lot_id = l.id AND u.total_unpaid > 0
      )
  )
  UPDATE payment_reminders pr
  SET
    status = 'stale',
    cancelled_at = now(),
    cancelled_reason = 'Paiement reçu - relance annulée automatiquement'
  FROM paid_lots pl
  WHERE pr.lot_id = pl.lot_id
    AND pr.copro_id = p_copro_id
    AND pr.status = 'pending';

  GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;
  RETURN v_cancelled_count;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE payment_reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;

-- payment_reminder_rules: lecture pour membres, écriture pour admin/gestionnaire
CREATE POLICY "payment_reminder_rules_select" ON payment_reminder_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminder_rules.copro_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "payment_reminder_rules_insert" ON payment_reminder_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminder_rules.copro_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'gestionnaire')
    )
  );

CREATE POLICY "payment_reminder_rules_update" ON payment_reminder_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminder_rules.copro_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'gestionnaire')
    )
  );

CREATE POLICY "payment_reminder_rules_delete" ON payment_reminder_rules
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminder_rules.copro_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'gestionnaire')
    )
  );

-- payment_reminders: lecture pour membres, écriture pour admin/gestionnaire
CREATE POLICY "payment_reminders_select" ON payment_reminders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminders.copro_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "payment_reminders_insert" ON payment_reminders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminders.copro_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'gestionnaire')
    )
  );

CREATE POLICY "payment_reminders_update" ON payment_reminders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = payment_reminders.copro_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'gestionnaire')
    )
  );

-- ============================================================================
-- DEFAULT EMAIL TEMPLATES FOR PAYMENT REMINDERS
-- Ton neutre et informatif - pas de menaces
-- Note: Uses email_templates table schema with available_variables (jsonb)
-- ============================================================================

INSERT INTO email_templates (code, name, description, subject, body_html, available_variables, is_default)
SELECT
  'payment_reminder_7',
  'Relance amiable 7 jours',
  'Template pour la premiere relance amiable (J+7)',
  'Information - Charges de copropriete en attente',
  '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>{{destinataire_civilite}} {{destinataire_nom}},</p><p>Nous vous informons que, sauf erreur de notre part, un montant de <strong>{{montant}} EUR</strong> reste en attente de reglement pour votre lot <strong>{{lot_ref}}</strong> au sein de la copropriete <strong>{{copropriete_nom}}</strong>.</p><p>Ce montant correspond a des charges echues depuis le <strong>{{date_echeance}}</strong>.</p><p>Si votre paiement a ete effectue entre-temps, nous vous prions de ne pas tenir compte de ce message.</p><p>Cordialement,<br><strong>{{syndic_nom}}</strong></p><hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;"><p style="font-size: 12px; color: #666;">Ce message est envoye conformement a l''article 19 de la loi du 10 juillet 1965.</p></body></html>',
  '["destinataire_civilite", "destinataire_nom", "montant", "lot_ref", "copropriete_nom", "date_echeance", "syndic_nom"]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE code = 'payment_reminder_7');

INSERT INTO email_templates (code, name, description, subject, body_html, available_variables, is_default)
SELECT
  'payment_reminder_30',
  'Relance 30 jours',
  'Template pour la deuxieme relance (J+30)',
  'Rappel - Charges de copropriete en attente de reglement',
  '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>{{destinataire_civilite}} {{destinataire_nom}},</p><p>Malgre notre precedent courrier, nous constatons que le montant de <strong>{{montant}} EUR</strong> reste impaye pour votre lot <strong>{{lot_ref}}</strong> au sein de la copropriete <strong>{{copropriete_nom}}</strong>.</p><p>Cette somme est echue depuis le <strong>{{date_echeance}}</strong>, soit <strong>{{jours_retard}} jours</strong> de retard.</p><p>Si votre paiement a ete effectue recemment, merci de ne pas tenir compte de ce rappel.</p><p>Cordialement,<br><strong>{{syndic_nom}}</strong></p><hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;"><p style="font-size: 12px; color: #666;">Ce message est envoye conformement a l''article 19 de la loi du 10 juillet 1965.</p></body></html>',
  '["destinataire_civilite", "destinataire_nom", "montant", "lot_ref", "copropriete_nom", "date_echeance", "jours_retard", "syndic_nom"]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE code = 'payment_reminder_30');

INSERT INTO email_templates (code, name, description, subject, body_html, available_variables, is_default)
SELECT
  'payment_reminder_60',
  'Relance 60 jours - Dernier rappel',
  'Template pour le dernier rappel avant conseil syndical (J+60)',
  'Important - Dernier rappel avant transmission au conseil syndical',
  '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;"><p>{{destinataire_civilite}} {{destinataire_nom}},</p><p>Nos precedents rappels concernant les charges de votre lot <strong>{{lot_ref}}</strong> etant restes sans suite, nous vous informons que le montant de <strong>{{montant}} EUR</strong> demeure impaye.</p><p>Cette somme est echue depuis le <strong>{{date_echeance}}</strong>, soit <strong>{{jours_retard}} jours</strong> de retard.</p><p>Conformement a nos obligations, et sans regularisation de votre part sous 15 jours, ce dossier sera transmis au conseil syndical.</p><p>Si votre paiement a ete effectue recemment, merci de ne pas tenir compte de ce rappel.</p><p>Cordialement,<br><strong>{{syndic_nom}}</strong></p><hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;"><p style="font-size: 12px; color: #666;">Ce message est envoye conformement a l''article 19 de la loi du 10 juillet 1965.</p></body></html>',
  '["destinataire_civilite", "destinataire_nom", "montant", "lot_ref", "copropriete_nom", "date_echeance", "jours_retard", "syndic_nom"]'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE code = 'payment_reminder_60');

-- ============================================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_reminder_rules_set_updated_at
  BEFORE UPDATE ON payment_reminder_rules
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE payment_reminder_rules IS 'Règles de relance automatique configurables par copropriété';
COMMENT ON TABLE payment_reminders IS 'Historique des relances envoyées - Conservation 10 ans (Art. 19 loi 65-557)';
COMMENT ON COLUMN payment_reminders.delay_level IS 'Niveau de délai en jours (7, 30, 60)';
COMMENT ON COLUMN payment_reminders.status IS 'pending=en attente, sent=envoyée, failed=échec, stale=obsolète (payé), skipped=ignorée';
