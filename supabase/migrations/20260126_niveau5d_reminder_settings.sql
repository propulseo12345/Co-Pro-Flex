-- ============================================================================
-- NIVEAU 5D: TABLE REMINDER_SETTINGS (pause globale par copro)
-- ============================================================================

-- Table des paramètres de relance par copropriété
CREATE TABLE IF NOT EXISTS reminder_settings (
  copro_id UUID PRIMARY KEY REFERENCES copros(id) ON DELETE CASCADE,
  is_paused BOOLEAN NOT NULL DEFAULT false,
  paused_until DATE NULL,
  pause_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger pour updated_at
CREATE TRIGGER tr_reminder_settings_updated_at
  BEFORE UPDATE ON reminder_settings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Index
CREATE INDEX IF NOT EXISTS idx_reminder_settings_paused
  ON reminder_settings(copro_id) WHERE is_paused = true;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

-- SELECT: tout utilisateur avec accès à la copro
CREATE POLICY "reminder_settings_select" ON reminder_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = reminder_settings.copro_id
        AND m.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: gestionnaires uniquement
CREATE POLICY "reminder_settings_write" ON reminder_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.copro_id = reminder_settings.copro_id
        AND m.user_id = auth.uid()
        AND m.role IN ('admin', 'gestionnaire')
    )
  );

-- ============================================================================
-- FONCTION: Vérifier si les relances sont en pause
-- ============================================================================

CREATE OR REPLACE FUNCTION is_reminders_paused(p_copro_id UUID)
RETURNS TABLE (
  is_paused BOOLEAN,
  paused_until DATE,
  pause_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(rs.is_paused, false) AS is_paused,
    rs.paused_until,
    rs.pause_reason
  FROM reminder_settings rs
  WHERE rs.copro_id = p_copro_id
    AND rs.is_paused = true
    AND (rs.paused_until IS NULL OR rs.paused_until >= CURRENT_DATE);

  -- Si aucun résultat, retourner is_paused = false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::BOOLEAN, NULL::DATE, NULL::TEXT;
  END IF;
END;
$$;

-- ============================================================================
-- INITIALISER LES SETTINGS POUR LES COPROS EXISTANTES
-- ============================================================================

INSERT INTO reminder_settings (copro_id)
SELECT id FROM copros
ON CONFLICT (copro_id) DO NOTHING;

-- ============================================================================
-- TRIGGER: Créer les settings automatiquement pour nouvelle copro
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_reminder_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO reminder_settings (copro_id)
  VALUES (NEW.id)
  ON CONFLICT (copro_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_create_reminder_settings ON copros;
CREATE TRIGGER tr_create_reminder_settings
  AFTER INSERT ON copros
  FOR EACH ROW
  EXECUTE FUNCTION create_default_reminder_settings();
