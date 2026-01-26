-- ============================================================================
-- ACTION 6 : RLS Documents avec confidentiality
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Filtrage documents selon confidentialité (public, council, manager, restricted)
-- ============================================================================

-- ============================================================================
-- RAPPEL document_confidentiality (créé dans niveau6c_ged.sql):
-- 'public'     - Visible par tous les membres de la copro
-- 'council'    - Visible par conseil syndical + managers
-- 'manager'    - Visible par managers uniquement
-- 'restricted' - Visible uniquement par propriétaire ou via document_access
-- ============================================================================

-- ============================================================================
-- 1) Vérifier/créer l'enum si nécessaire
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE document_confidentiality AS ENUM ('public', 'council', 'manager', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- S'assurer que la colonne existe
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidentiality document_confidentiality DEFAULT 'public';

-- ============================================================================
-- 2) FONCTION helper pour vérifier accès document
-- ============================================================================

CREATE OR REPLACE FUNCTION user_can_view_document(p_document_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_doc RECORD;
  v_has_access BOOLEAN := FALSE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Récupérer le document
  SELECT d.id, d.copro_id, d.confidentiality, d.coproprietaire_id, d.lot_id, d.created_by
  INTO v_doc
  FROM documents d
  WHERE d.id = p_document_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Manager: accès total
  IF user_is_copro_manager(v_doc.copro_id) THEN
    RETURN TRUE;
  END IF;

  -- Vérifier selon la confidentialité
  CASE v_doc.confidentiality
    WHEN 'public' THEN
      -- Tous les membres de la copro
      v_has_access := user_has_copro_access(v_doc.copro_id);

    WHEN 'council' THEN
      -- Conseil syndical ou manager
      v_has_access := user_is_council_member(v_doc.copro_id);

    WHEN 'manager' THEN
      -- Manager uniquement (déjà vérifié ci-dessus)
      v_has_access := FALSE;

    WHEN 'restricted' THEN
      -- Vérifier accès spécifique
      -- 1. Créateur du document
      IF v_doc.created_by = v_user_id THEN
        v_has_access := TRUE;
      -- 2. Propriétaire du lot associé
      ELSIF v_doc.lot_id IS NOT NULL AND user_is_lot_owner(v_doc.lot_id) THEN
        v_has_access := TRUE;
      -- 3. Copropriétaire associé directement
      ELSIF v_doc.coproprietaire_id IS NOT NULL THEN
        SELECT EXISTS (
          SELECT 1 FROM coproprietaires cp
          WHERE cp.id = v_doc.coproprietaire_id
            AND cp.user_id = v_user_id
        ) INTO v_has_access;
      -- 4. Accès explicite via document_access
      ELSE
        SELECT EXISTS (
          SELECT 1 FROM document_access da
          WHERE da.document_id = p_document_id
            AND da.can_view = TRUE
            AND (da.expires_at IS NULL OR da.expires_at > NOW())
            AND (
              da.user_id = v_user_id
              OR da.coproprietaire_id IN (SELECT id FROM coproprietaires WHERE user_id = v_user_id)
              OR da.lot_id IN (SELECT lot_id FROM lot_owners lo JOIN coproprietaires cp ON cp.id = lo.coproprietaire_id WHERE cp.user_id = v_user_id AND (lo.end_date IS NULL OR lo.end_date > CURRENT_DATE))
            )
        ) INTO v_has_access;
      END IF;

    ELSE
      -- Par défaut, traiter comme public
      v_has_access := user_has_copro_access(v_doc.copro_id);
  END CASE;

  RETURN v_has_access;
END;
$$;

COMMENT ON FUNCTION user_can_view_document IS
  'Vérifie si l''utilisateur peut voir un document selon sa confidentialité';

-- ============================================================================
-- 3) NOUVELLES POLICIES pour documents
-- ============================================================================

-- Supprimer les anciennes policies génériques
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_select_members" ON documents;
DROP POLICY IF EXISTS "Members can view documents" ON documents;

-- Policy SELECT: Utilise la fonction helper
CREATE POLICY "documents_select_by_confidentiality"
  ON documents
  FOR SELECT
  USING (user_can_view_document(id));

-- ============================================================================
-- 4) Policies INSERT/UPDATE/DELETE (manager only pour la plupart)
-- ============================================================================

-- Supprimer les anciennes
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

-- INSERT: Manager ou owner du lot
CREATE POLICY "documents_insert_manager"
  ON documents
  FOR INSERT
  WITH CHECK (
    user_is_copro_manager(copro_id)
    OR (lot_id IS NOT NULL AND user_is_lot_owner(lot_id))
  );

-- UPDATE: Manager uniquement
CREATE POLICY "documents_update_manager"
  ON documents
  FOR UPDATE
  USING (user_is_copro_manager(copro_id))
  WITH CHECK (user_is_copro_manager(copro_id));

-- DELETE: Manager uniquement (et respect de deletion_blocked via trigger existant)
CREATE POLICY "documents_delete_manager"
  ON documents
  FOR DELETE
  USING (user_is_copro_manager(copro_id));

-- ============================================================================
-- 5) Policies pour document_access (manager only pour gestion des accès)
-- ============================================================================

DROP POLICY IF EXISTS "access_select_managers" ON document_access;

CREATE POLICY "document_access_select"
  ON document_access
  FOR SELECT
  USING (
    user_is_copro_manager((SELECT copro_id FROM documents WHERE id = document_id))
    OR user_id = auth.uid()
    OR coproprietaire_id IN (SELECT id FROM coproprietaires WHERE user_id = auth.uid())
  );

CREATE POLICY "document_access_manage"
  ON document_access
  FOR ALL
  USING (user_is_copro_manager((SELECT copro_id FROM documents WHERE id = document_id)))
  WITH CHECK (user_is_copro_manager((SELECT copro_id FROM documents WHERE id = document_id)));

-- ============================================================================
-- 6) INDEX pour performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_documents_confidentiality
  ON documents(copro_id, confidentiality);

CREATE INDEX IF NOT EXISTS idx_documents_lot_id
  ON documents(lot_id) WHERE lot_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_coproprietaire_id
  ON documents(coproprietaire_id) WHERE coproprietaire_id IS NOT NULL;

-- ============================================================================
-- 7) VUE des documents accessibles (pour debug/monitoring)
-- ============================================================================

CREATE OR REPLACE VIEW v_accessible_documents
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.copro_id,
  d.title,
  d.file_name,
  d.category,
  d.confidentiality,
  d.lot_id,
  d.coproprietaire_id,
  d.created_at,
  d.created_by
FROM documents d
WHERE d.status = 'active'
  AND d.is_current_version = true;

COMMENT ON VIEW v_accessible_documents IS
  'Documents actifs (RLS appliqué via security_invoker)';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
