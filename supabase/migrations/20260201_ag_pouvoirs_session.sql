-- ============================================================================
-- MIGRATION: AG Pouvoirs et Session - Étape 5 DB-First
-- CoProFlex - DB-First Security Hardening
-- Date: 2026-02-01
-- Description:
--   A) Créer la table ag_pouvoirs pour les mandats
--   B) Créer les RPCs sécurisées pour les pouvoirs
--   C) Ajouter les colonnes status/total_tantiemes à ag_correspondence_votes
-- ============================================================================

-- ============================================================================
-- A) TABLE ag_pouvoirs - Mandats / Procurations
-- ============================================================================

CREATE TABLE IF NOT EXISTS ag_pouvoirs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Mandant (celui qui donne le pouvoir)
  mandant_id UUID NOT NULL REFERENCES coproprietaires(id),
  mandant_name TEXT,
  mandant_tantiemes NUMERIC(15,2) DEFAULT 0,

  -- Mandataire (celui qui reçoit le pouvoir)
  mandataire_id UUID NOT NULL REFERENCES coproprietaires(id),
  mandataire_name TEXT,
  mandataire_tantiemes NUMERIC(15,2) DEFAULT 0,

  -- Signature
  signed_at TIMESTAMPTZ,

  -- Justificatif (document scanné)
  justificatif_filename TEXT,
  justificatif_path TEXT,
  justificatif_size INTEGER,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un mandant ne peut donner qu'un seul pouvoir par AG
  UNIQUE(ag_id, mandant_id),

  -- Le mandant et le mandataire doivent être différents
  CHECK (mandant_id != mandataire_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ag_pouvoirs_ag ON ag_pouvoirs(ag_id);
CREATE INDEX IF NOT EXISTS idx_ag_pouvoirs_mandant ON ag_pouvoirs(mandant_id);
CREATE INDEX IF NOT EXISTS idx_ag_pouvoirs_mandataire ON ag_pouvoirs(mandataire_id);
CREATE INDEX IF NOT EXISTS idx_ag_pouvoirs_copro ON ag_pouvoirs(copro_id);

COMMENT ON TABLE ag_pouvoirs IS 'Pouvoirs (mandats/procurations) pour les AG - Art. 22 loi 65-557';
COMMENT ON COLUMN ag_pouvoirs.mandant_id IS 'Copropriétaire qui donne son pouvoir';
COMMENT ON COLUMN ag_pouvoirs.mandataire_id IS 'Copropriétaire qui reçoit le pouvoir (max 3 par loi)';

-- RLS
ALTER TABLE ag_pouvoirs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pouvoirs of their copros"
ON ag_pouvoirs FOR SELECT
USING (user_has_copro_access(copro_id));

CREATE POLICY "Only managers can manage pouvoirs"
ON ag_pouvoirs FOR ALL
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_ag_pouvoirs_updated ON ag_pouvoirs;
CREATE TRIGGER trg_ag_pouvoirs_updated
  BEFORE UPDATE ON ag_pouvoirs
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_updated_at();

-- ============================================================================
-- B) RPC: Récupérer les pouvoirs d'une AG
-- ============================================================================

CREATE OR REPLACE FUNCTION get_ag_pouvoirs(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copro_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Récupérer copro_id depuis l'AG
  SELECT am.copro_id INTO v_copro_id
  FROM ag_meetings am
  WHERE am.id = p_ag_id;

  IF v_copro_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG non trouvée');
  END IF;

  -- 2. Vérifier que l'utilisateur a accès à cette copropriété
  IF NOT user_has_copro_access(v_copro_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé');
  END IF;

  -- 3. Retourner les pouvoirs avec noms depuis la vue (DISTINCT pour éviter doublons)
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'id', p.id,
    'ag_id', p.ag_id,
    'mandant_id', p.mandant_id,
    'mandant_name', vm.display_name,
    'mandant_tantiemes', vm.total_tantiemes,
    'mandataire_id', p.mandataire_id,
    'mandataire_name', vt.display_name,
    'mandataire_tantiemes', vt.total_tantiemes,
    'signed_at', p.signed_at,
    'justificatif_filename', p.justificatif_filename,
    'justificatif_path', p.justificatif_path,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ))
  INTO v_result
  FROM ag_pouvoirs p
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (id) id, display_name, total_tantiemes
    FROM v_coproprietaires_overview
    WHERE id = p.mandant_id
  ) vm ON true
  LEFT JOIN LATERAL (
    SELECT DISTINCT ON (id) id, display_name, total_tantiemes
    FROM v_coproprietaires_overview
    WHERE id = p.mandataire_id
  ) vt ON true
  WHERE p.ag_id = p_ag_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_ag_pouvoirs IS 'Récupère les pouvoirs d''une AG avec noms depuis v_coproprietaires_overview';

-- ============================================================================
-- C) RPC: Sauvegarder un pouvoir
-- ============================================================================

CREATE OR REPLACE FUNCTION save_ag_pouvoir(
  p_ag_id UUID,
  p_mandant_id UUID,
  p_mandataire_id UUID,
  p_signed_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_mandataire_count INT;
  v_pouvoir_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- 1. Récupérer copro_id depuis l'AG
  SELECT copro_id INTO v_copro_id
  FROM ag_meetings
  WHERE id = p_ag_id;

  IF v_copro_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG non trouvée');
  END IF;

  -- 2. Vérifier accès manager
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé');
  END IF;

  -- 3. Vérifier que mandant != mandataire
  IF p_mandant_id = p_mandataire_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Le mandant et le mandataire doivent être différents');
  END IF;

  -- 4. Vérifier que le mandant n'a pas déjà donné son pouvoir
  IF EXISTS (SELECT 1 FROM ag_pouvoirs WHERE ag_id = p_ag_id AND mandant_id = p_mandant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce copropriétaire a déjà donné son pouvoir');
  END IF;

  -- 5. Vérifier limite de 3 pouvoirs par mandataire (loi française)
  SELECT COUNT(*) INTO v_mandataire_count
  FROM ag_pouvoirs
  WHERE ag_id = p_ag_id AND mandataire_id = p_mandataire_id;

  IF v_mandataire_count >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ce mandataire a déjà 3 pouvoirs (limite légale)');
  END IF;

  -- 6. Insérer le pouvoir (noms/tantièmes récupérés via la vue lors de la lecture)
  INSERT INTO ag_pouvoirs (
    ag_id, copro_id, mandant_id, mandataire_id, signed_at
  ) VALUES (
    p_ag_id, v_copro_id, p_mandant_id, p_mandataire_id, p_signed_at
  )
  RETURNING id INTO v_pouvoir_id;

  RETURN jsonb_build_object('success', true, 'pouvoir_id', v_pouvoir_id);
END;
$$;

COMMENT ON FUNCTION save_ag_pouvoir IS 'Sauvegarde un pouvoir avec validation des règles légales';

-- ============================================================================
-- D) RPC: Supprimer un pouvoir
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_ag_pouvoir(p_pouvoir_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer copro_id du pouvoir
  SELECT copro_id INTO v_copro_id
  FROM ag_pouvoirs
  WHERE id = p_pouvoir_id;

  IF v_copro_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pouvoir non trouvé');
  END IF;

  -- Vérifier accès manager
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé');
  END IF;

  -- Supprimer
  DELETE FROM ag_pouvoirs WHERE id = p_pouvoir_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION delete_ag_pouvoir IS 'Supprime un pouvoir avec vérification des droits';

-- ============================================================================
-- E) RPC: Mettre à jour le justificatif d'un pouvoir
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ag_pouvoir_justificatif(
  p_pouvoir_id UUID,
  p_filename TEXT,
  p_path TEXT,
  p_size INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer copro_id du pouvoir
  SELECT copro_id INTO v_copro_id
  FROM ag_pouvoirs
  WHERE id = p_pouvoir_id;

  IF v_copro_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pouvoir non trouvé');
  END IF;

  -- Vérifier accès manager
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé');
  END IF;

  -- Mettre à jour
  UPDATE ag_pouvoirs
  SET
    justificatif_filename = p_filename,
    justificatif_path = p_path,
    justificatif_size = p_size,
    updated_at = NOW()
  WHERE id = p_pouvoir_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION update_ag_pouvoir_justificatif IS 'Met à jour le justificatif d''un pouvoir';

-- ============================================================================
-- F) Ajouter colonnes manquantes à ag_correspondence_votes
-- ============================================================================

-- Ajouter status si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ag_correspondence_votes' AND column_name = 'status'
  ) THEN
    ALTER TABLE ag_correspondence_votes ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Ajouter total_tantiemes si manquant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ag_correspondence_votes' AND column_name = 'total_tantiemes'
  ) THEN
    ALTER TABLE ag_correspondence_votes ADD COLUMN total_tantiemes NUMERIC(15,2) DEFAULT 0;
  END IF;
END $$;

-- ============================================================================
-- G) RPC: clear_ag_session_drafts - Nettoyer les drafts d'une AG
-- ============================================================================

CREATE OR REPLACE FUNCTION clear_ag_session_drafts(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_deleted INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Non authentifié');
  END IF;

  -- Récupérer copro_id depuis l'AG
  SELECT copro_id INTO v_copro_id
  FROM ag_meetings
  WHERE id = p_ag_id;

  IF v_copro_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG non trouvée');
  END IF;

  -- Vérifier accès
  IF NOT user_has_copro_access(v_copro_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Accès non autorisé');
  END IF;

  -- Supprimer les drafts de l'utilisateur pour cette AG
  DELETE FROM ag_session_drafts
  WHERE ag_id = p_ag_id AND user_id = v_user_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted', v_deleted);
END;
$$;

COMMENT ON FUNCTION clear_ag_session_drafts IS 'Supprime les drafts de session d''un utilisateur pour une AG';

-- ============================================================================
-- H) Vue: Statistiques des pouvoirs par AG
-- ============================================================================

CREATE OR REPLACE VIEW v_ag_pouvoirs_stats AS
SELECT
  p.ag_id,
  m.title AS ag_title,
  m.copro_id,
  COUNT(*) AS total_pouvoirs,
  SUM(p.mandant_tantiemes) AS total_tantiemes_representes,
  COUNT(DISTINCT p.mandataire_id) AS nb_mandataires,
  MAX(mc.pouvoirs_count) AS max_pouvoirs_par_mandataire,
  COUNT(*) FILTER (WHERE p.justificatif_path IS NOT NULL) AS pouvoirs_avec_justificatif
FROM ag_pouvoirs p
JOIN ag_meetings m ON m.id = p.ag_id
LEFT JOIN (
  SELECT mandataire_id, ag_id, COUNT(*) AS pouvoirs_count
  FROM ag_pouvoirs
  GROUP BY mandataire_id, ag_id
) mc ON mc.mandataire_id = p.mandataire_id AND mc.ag_id = p.ag_id
GROUP BY p.ag_id, m.title, m.copro_id;

ALTER VIEW v_ag_pouvoirs_stats SET (security_invoker = true);

COMMENT ON VIEW v_ag_pouvoirs_stats IS 'Statistiques des pouvoirs par AG';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
