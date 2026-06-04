-- Migration: Ajouter call_id, call_line_id et content a payment_reminders
-- Permet de lier les relances aux appels de fonds specifiques

ALTER TABLE payment_reminders
  ADD COLUMN IF NOT EXISTS call_id UUID REFERENCES call_for_funds(id),
  ADD COLUMN IF NOT EXISTS call_line_id UUID REFERENCES call_for_funds_lines(id),
  ADD COLUMN IF NOT EXISTS content TEXT;

-- Index pour recherche par call_line
CREATE INDEX IF NOT EXISTS idx_payment_reminders_call_line
  ON payment_reminders(call_line_id) WHERE call_line_id IS NOT NULL;

COMMENT ON COLUMN payment_reminders.call_id IS 'Appel de fonds lie a cette relance';
COMMENT ON COLUMN payment_reminders.call_line_id IS 'Ligne d appel specifique (lot + appel)';
COMMENT ON COLUMN payment_reminders.content IS 'Contenu du courrier envoye (texte edite par le syndic)';
