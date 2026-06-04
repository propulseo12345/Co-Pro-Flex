-- ============================================================================
-- ACTION 10 : Fonctions Helper Centrales (user_is_lot_owner)
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Crée les fonctions helper pour RLS par lot + index
-- ============================================================================

-- ============================================================================
-- 1) FONCTION user_is_lot_owner(p_lot_id)
-- Vérifie si l'utilisateur courant est propriétaire actif du lot
-- ============================================================================

CREATE OR REPLACE FUNCTION user_is_lot_owner(p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN;
BEGIN
  -- Récupérer l'UID de l'utilisateur courant
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Vérifier si user est propriétaire actif via la chaîne:
  -- profiles.id -> coproprietaires.user_id -> lot_owners.coproprietaire_id
  SELECT EXISTS (
    SELECT 1
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.lot_id = p_lot_id
      AND cp.user_id = v_user_id
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  ) INTO v_found;

  RETURN v_found;
END;
$$;

COMMENT ON FUNCTION user_is_lot_owner IS
  'Vérifie si auth.uid() est propriétaire actif du lot via coproprietaires.user_id';

-- ============================================================================
-- 2) FONCTION user_is_lot_owner_in_copro(p_copro_id, p_lot_id)
-- Vérifie si l'utilisateur est propriétaire actif du lot dans la copro
-- ============================================================================

CREATE OR REPLACE FUNCTION user_is_lot_owner_in_copro(p_copro_id UUID, p_lot_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    JOIN lots l ON l.id = lo.lot_id
    WHERE lo.lot_id = p_lot_id
      AND l.copro_id = p_copro_id
      AND cp.user_id = v_user_id
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  ) INTO v_found;

  RETURN v_found;
END;
$$;

COMMENT ON FUNCTION user_is_lot_owner_in_copro IS
  'Vérifie si auth.uid() est propriétaire actif du lot dans la copropriété spécifiée';

-- ============================================================================
-- 3) FONCTION user_owns_any_lot_in_copro(p_copro_id)
-- Vérifie si l'utilisateur possède au moins un lot actif dans la copro
-- ============================================================================

CREATE OR REPLACE FUNCTION user_owns_any_lot_in_copro(p_copro_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM lot_owners lo
    JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
    WHERE lo.copro_id = p_copro_id
      AND cp.user_id = v_user_id
      AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE)
  ) INTO v_found;

  RETURN v_found;
END;
$$;

COMMENT ON FUNCTION user_owns_any_lot_in_copro IS
  'Vérifie si auth.uid() possède au moins un lot actif dans la copropriété';

-- ============================================================================
-- 4) FONCTION get_user_lot_ids(p_copro_id)
-- Retourne les IDs des lots actifs de l'utilisateur dans une copro
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_lot_ids(p_copro_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_lot_ids UUID[];
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN '{}'::UUID[];
  END IF;

  SELECT ARRAY_AGG(lo.lot_id)
  INTO v_lot_ids
  FROM lot_owners lo
  JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id
  WHERE lo.copro_id = p_copro_id
    AND cp.user_id = v_user_id
    AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE);

  RETURN COALESCE(v_lot_ids, '{}'::UUID[]);
END;
$$;

COMMENT ON FUNCTION get_user_lot_ids IS
  'Retourne les IDs des lots actifs de auth.uid() dans une copropriété';

-- ============================================================================
-- 5) FONCTION user_has_copro_access(p_copro_id) - Création/remplacement
-- Vérifie l'accès via memberships
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_copro_access(p_copro_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.copro_id = p_copro_id
      AND m.user_id = v_user_id
  ) INTO v_found;

  RETURN v_found;
END;
$$;

COMMENT ON FUNCTION user_has_copro_access IS
  'Vérifie si auth.uid() a un membership sur la copropriété';

-- ============================================================================
-- 6) FONCTION user_is_copro_manager(p_copro_id) - Création/remplacement
-- Vérifie si l'utilisateur est admin ou gestionnaire
-- ============================================================================

CREATE OR REPLACE FUNCTION user_is_copro_manager(p_copro_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.copro_id = p_copro_id
      AND m.user_id = v_user_id
      AND m.role IN ('admin', 'gestionnaire')
  ) INTO v_found;

  RETURN v_found;
END;
$$;

COMMENT ON FUNCTION user_is_copro_manager IS
  'Vérifie si auth.uid() est admin ou gestionnaire de la copropriété';

-- ============================================================================
-- 7) FONCTION user_is_council_member(p_copro_id)
-- Vérifie si l'utilisateur est membre du conseil syndical
-- ============================================================================

CREATE OR REPLACE FUNCTION user_is_council_member(p_copro_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_found BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.copro_id = p_copro_id
      AND m.user_id = v_user_id
      AND m.role IN ('admin', 'gestionnaire', 'membre_cs')
  ) INTO v_found;

  RETURN v_found;
END;
$$;

COMMENT ON FUNCTION user_is_council_member IS
  'Vérifie si auth.uid() est membre du conseil syndical (admin, gestionnaire, ou membre_cs)';

-- ============================================================================
-- 8) INDEX pour performances RLS
-- ============================================================================

-- Index sur lot_owners pour lookup par lot
CREATE INDEX IF NOT EXISTS idx_lot_owners_lot_enddate
  ON lot_owners(lot_id, end_date);

-- Index sur lot_owners pour lookup par copro
CREATE INDEX IF NOT EXISTS idx_lot_owners_copro_enddate
  ON lot_owners(copro_id, end_date);

-- Index sur lot_owners pour lookup par coproprietaire
CREATE INDEX IF NOT EXISTS idx_lot_owners_coproprietaire_enddate
  ON lot_owners(coproprietaire_id, end_date);

-- Index sur coproprietaires pour lookup par user_id
CREATE INDEX IF NOT EXISTS idx_coproprietaires_user_id
  ON coproprietaires(user_id) WHERE user_id IS NOT NULL;

-- Index sur memberships pour lookup RLS
CREATE INDEX IF NOT EXISTS idx_memberships_user_copro
  ON memberships(user_id, copro_id);

CREATE INDEX IF NOT EXISTS idx_memberships_copro_role
  ON memberships(copro_id, role);

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
