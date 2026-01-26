-- ============================================================================
-- ACTION 9 : Table ag_session_drafts (remplacement localStorage)
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Stockage des brouillons de session AG (votes, présences) dans Supabase
-- ============================================================================

-- ============================================================================
-- 1) TYPE ENUM pour draft_type
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE ag_draft_type AS ENUM (
    'attendance',    -- Présences en cours d'enregistrement
    'votes',         -- Votes en cours de saisie
    'roles',         -- Rôles bureau AG
    'resolutions',   -- État des résolutions
    'session'        -- Metadata de session
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2) TABLE ag_session_drafts
-- ============================================================================

CREATE TABLE IF NOT EXISTS ag_session_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Type de brouillon
  draft_type ag_draft_type NOT NULL,

  -- Données JSON (flexible pour différents types)
  draft_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Métadonnées
  version INTEGER NOT NULL DEFAULT 1,
  last_modified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unicité: un seul draft par type par user par AG
  CONSTRAINT uq_ag_session_draft UNIQUE (ag_id, user_id, draft_type)
);

COMMENT ON TABLE ag_session_drafts IS
  'Brouillons de session AG - remplace localStorage pour persistence serveur';

-- ============================================================================
-- 3) INDEX
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ag_session_drafts_ag
  ON ag_session_drafts(ag_id);

CREATE INDEX IF NOT EXISTS idx_ag_session_drafts_user
  ON ag_session_drafts(user_id);

CREATE INDEX IF NOT EXISTS idx_ag_session_drafts_ag_user
  ON ag_session_drafts(ag_id, user_id);

-- ============================================================================
-- 4) RLS POLICIES
-- ============================================================================

ALTER TABLE ag_session_drafts ENABLE ROW LEVEL SECURITY;

-- Manager: accès complet sur sa copro
CREATE POLICY "ag_session_drafts_manager_all"
  ON ag_session_drafts
  FOR ALL
  USING (user_is_copro_manager(copro_id))
  WITH CHECK (user_is_copro_manager(copro_id));

-- User: accès à ses propres drafts uniquement
CREATE POLICY "ag_session_drafts_owner_select"
  ON ag_session_drafts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "ag_session_drafts_owner_insert"
  ON ag_session_drafts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ag_session_drafts_owner_update"
  ON ag_session_drafts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "ag_session_drafts_owner_delete"
  ON ag_session_drafts
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- 5) FONCTION: Upsert draft (save_session_draft)
-- ============================================================================

CREATE OR REPLACE FUNCTION save_ag_session_draft(
  p_ag_id UUID,
  p_draft_type ag_draft_type,
  p_draft_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_draft_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Récupérer copro_id depuis l'AG
  SELECT copro_id INTO v_copro_id
  FROM ag_meetings
  WHERE id = p_ag_id;

  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'AG not found: %', p_ag_id USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- Vérifier accès (manager ou membre copro)
  IF NOT user_has_copro_access(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied to copro' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Upsert le draft
  INSERT INTO ag_session_drafts (ag_id, copro_id, user_id, draft_type, draft_data, version, last_modified_at)
  VALUES (p_ag_id, v_copro_id, v_user_id, p_draft_type, p_draft_data, 1, NOW())
  ON CONFLICT (ag_id, user_id, draft_type)
  DO UPDATE SET
    draft_data = EXCLUDED.draft_data,
    version = ag_session_drafts.version + 1,
    last_modified_at = NOW()
  RETURNING id INTO v_draft_id;

  RETURN v_draft_id;
END;
$$;

COMMENT ON FUNCTION save_ag_session_draft IS
  'Sauvegarde un brouillon de session AG (upsert)';

-- ============================================================================
-- 6) FONCTION: Get draft
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ag_session_draft(
  p_ag_id UUID,
  p_draft_type ag_draft_type
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', d.id,
    'draft_data', d.draft_data,
    'version', d.version,
    'last_modified_at', d.last_modified_at
  )
  INTO v_result
  FROM ag_session_drafts d
  WHERE d.ag_id = p_ag_id
    AND d.user_id = v_user_id
    AND d.draft_type = p_draft_type;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_ag_session_draft IS
  'Récupère un brouillon de session AG pour l''utilisateur courant';

-- ============================================================================
-- 7) FONCTION: Get all drafts for an AG (pour manager)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ag_all_session_drafts(p_ag_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  draft_type ag_draft_type,
  draft_data JSONB,
  version INTEGER,
  last_modified_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copro_id UUID;
BEGIN
  -- Récupérer copro_id
  SELECT copro_id INTO v_copro_id
  FROM ag_meetings
  WHERE ag_meetings.id = p_ag_id;

  -- Vérifier accès manager
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied - manager only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT d.id, d.user_id, d.draft_type, d.draft_data, d.version, d.last_modified_at
  FROM ag_session_drafts d
  WHERE d.ag_id = p_ag_id
  ORDER BY d.user_id, d.draft_type;
END;
$$;

COMMENT ON FUNCTION get_ag_all_session_drafts IS
  'Récupère tous les brouillons d''une AG (manager only)';

-- ============================================================================
-- 8) FONCTION: Clear drafts after AG close
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_ag_session_drafts(p_ag_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copro_id UUID;
  v_deleted INTEGER;
BEGIN
  -- Récupérer copro_id
  SELECT copro_id INTO v_copro_id
  FROM ag_meetings
  WHERE id = p_ag_id;

  -- Vérifier accès manager
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied - manager only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  DELETE FROM ag_session_drafts
  WHERE ag_id = p_ag_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION clear_ag_session_drafts IS
  'Supprime tous les brouillons d''une AG (après clôture)';

-- ============================================================================
-- 9) TRIGGER: Auto-clear drafts when AG is closed
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_clear_drafts_on_ag_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si l'AG passe à 'closed' ou 'pv_generated', supprimer les drafts
  IF NEW.status IN ('closed', 'pv_generated') AND OLD.status != NEW.status THEN
    DELETE FROM ag_session_drafts WHERE ag_id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ag_close_clear_drafts ON ag_meetings;

CREATE TRIGGER trg_ag_close_clear_drafts
  AFTER UPDATE OF status ON ag_meetings
  FOR EACH ROW
  EXECUTE FUNCTION trg_clear_drafts_on_ag_close();

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
