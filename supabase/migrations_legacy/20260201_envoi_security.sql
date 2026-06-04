-- ============================================================================
-- MIGRATION: Sécurisation Étape 4 (Envoi)
-- CoProFlex - DB-First Security Hardening
-- Date: 2026-02-01
-- Description:
--   A) Ajouter draft_types manquants ('envoi', 'milestones')
--   B) Créer RPC sécurisée pour charger copropriétaires d'une AG
--   C) Créer RPC pour milestones avec merge sûr
-- ============================================================================

-- ============================================================================
-- A) EXTENSION DU TYPE ENUM ag_draft_type
-- ============================================================================

-- Ajouter 'envoi' pour les choix d'envoi de convocations
DO $$ BEGIN
  ALTER TYPE ag_draft_type ADD VALUE IF NOT EXISTS 'envoi';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ajouter 'milestones' pour les jalons (sent, validated, etc.)
DO $$ BEGIN
  ALTER TYPE ag_draft_type ADD VALUE IF NOT EXISTS 'milestones';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- B) RPC: Charger les copropriétaires d'une AG (scoping sécurisé)
-- ============================================================================
-- Cette fonction encapsule la logique ag_id -> copro_id -> coproprietaires
-- pour éviter toute fuite de données entre copropriétés

CREATE OR REPLACE FUNCTION rpc_get_ag_coproprietaires(p_ag_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address_line1 TEXT,
  postal_code TEXT,
  city TEXT,
  total_tantiemes BIGINT,
  lots_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copro_id UUID;
BEGIN
  -- 1. Récupérer copro_id depuis l'AG
  SELECT am.copro_id INTO v_copro_id
  FROM ag_meetings am
  WHERE am.id = p_ag_id;

  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'AG not found: %', p_ag_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- 2. Vérifier que l'utilisateur a accès à cette copropriété
  IF NOT user_has_copro_access(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied to copropriete'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. Retourner les copropriétaires de cette copropriété uniquement
  -- DISTINCT ON pour éviter doublons venant des jointures dans la vue
  RETURN QUERY
  SELECT DISTINCT ON (v.id)
    v.id,
    v.display_name,
    v.email,
    v.phone,
    v.mobile,
    v.address_line1,
    v.postal_code,
    v.city,
    v.total_tantiemes,
    v.lots_count
  FROM v_coproprietaires_overview v
  WHERE v.copro_id = v_copro_id
    AND v.owner_type = 'COPROPRIETAIRE'
  ORDER BY v.id, v.display_name;
END;
$$;

COMMENT ON FUNCTION rpc_get_ag_coproprietaires IS
  'Charge les copropriétaires d''une AG avec scoping sécurisé (ag_id -> copro_id -> owners) - DISTINCT ON pour éviter doublons';

-- ============================================================================
-- C) RPC: Sauvegarder un milestone avec merge sûr (pas d'écrasement)
-- ============================================================================
-- Cette fonction merge les clés au lieu de remplacer tout le JSON

CREATE OR REPLACE FUNCTION save_ag_milestone(
  p_ag_id UUID,
  p_milestone_key TEXT,
  p_milestone_value JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_current_data JSONB;
  v_new_data JSONB;
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
    RAISE EXCEPTION 'AG not found: %', p_ag_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Vérifier accès
  IF NOT user_has_copro_access(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied to copro' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Récupérer les données existantes
  SELECT draft_data INTO v_current_data
  FROM ag_session_drafts
  WHERE ag_id = p_ag_id
    AND user_id = v_user_id
    AND draft_type = 'milestones';

  -- Merge: conserver les clés existantes, ajouter/modifier la nouvelle
  IF v_current_data IS NULL THEN
    v_new_data := jsonb_build_object(p_milestone_key, p_milestone_value);
  ELSE
    v_new_data := v_current_data || jsonb_build_object(p_milestone_key, p_milestone_value);
  END IF;

  -- Upsert avec le JSON mergé
  INSERT INTO ag_session_drafts (ag_id, copro_id, user_id, draft_type, draft_data, version, last_modified_at)
  VALUES (p_ag_id, v_copro_id, v_user_id, 'milestones', v_new_data, 1, NOW())
  ON CONFLICT (ag_id, user_id, draft_type)
  DO UPDATE SET
    draft_data = v_new_data,
    version = ag_session_drafts.version + 1,
    last_modified_at = NOW();

  -- Retourner toutes les milestones actuelles
  RETURN v_new_data;
END;
$$;

COMMENT ON FUNCTION save_ag_milestone IS
  'Sauvegarde un milestone avec merge sûr (ne perd pas les autres clés)';

-- ============================================================================
-- D) RPC: Récupérer tous les milestones d'une AG
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ag_milestones(p_ag_id UUID)
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
    RETURN '{}'::jsonb;
  END IF;

  SELECT draft_data INTO v_result
  FROM ag_session_drafts
  WHERE ag_id = p_ag_id
    AND user_id = v_user_id
    AND draft_type = 'milestones';

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_ag_milestones IS
  'Récupère tous les milestones d''une AG pour l''utilisateur courant';

-- ============================================================================
-- E) RPC: Sauvegarder les choix d'envoi avec validation
-- ============================================================================

CREATE OR REPLACE FUNCTION save_ag_envoi_choices(
  p_ag_id UUID,
  p_choices JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_result JSONB;
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
    RAISE EXCEPTION 'AG not found: %', p_ag_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Vérifier accès
  IF NOT user_has_copro_access(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied to copro' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Sauvegarder les choix d'envoi
  INSERT INTO ag_session_drafts (ag_id, copro_id, user_id, draft_type, draft_data, version, last_modified_at)
  VALUES (p_ag_id, v_copro_id, v_user_id, 'envoi', p_choices, 1, NOW())
  ON CONFLICT (ag_id, user_id, draft_type)
  DO UPDATE SET
    draft_data = p_choices,
    version = ag_session_drafts.version + 1,
    last_modified_at = NOW()
  RETURNING draft_data INTO v_result;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION save_ag_envoi_choices IS
  'Sauvegarde les choix d''envoi de convocations';

-- ============================================================================
-- F) RPC: Récupérer les choix d'envoi
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ag_envoi_choices(p_ag_id UUID)
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

  SELECT draft_data INTO v_result
  FROM ag_session_drafts
  WHERE ag_id = p_ag_id
    AND user_id = v_user_id
    AND draft_type = 'envoi';

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_ag_envoi_choices IS
  'Récupère les choix d''envoi de convocations';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
