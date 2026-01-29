-- ============================================================================
-- Migration: RPC delete_ag_draft
-- Date: 2026-01-29
-- Description: Suppression atomique et sécurisée d'un brouillon d'AG
-- et de toutes ses données associées
-- ============================================================================

-- ============================================================================
-- FONCTION: delete_ag_draft
-- Supprime un brouillon d'AG et toutes ses données liées de manière atomique
-- Retourne un objet JSON avec le résultat de l'opération
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_ag_draft(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ag RECORD;
  v_copro_id UUID;
  v_deleted_counts JSONB := '{}'::jsonb;
  v_count INT;
  v_resolution_ids UUID[];
  v_document_ids UUID[];
BEGIN
  -- ==========================================================================
  -- 1. VÉRIFICATIONS DE SÉCURITÉ
  -- ==========================================================================

  -- Récupérer l'AG
  SELECT * INTO v_ag
  FROM ag_meetings
  WHERE id = p_ag_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'AG not found',
      'error_code', 'NOT_FOUND'
    );
  END IF;

  v_copro_id := v_ag.copro_id;

  -- Vérifier que l'AG est bien en statut 'draft'
  IF v_ag.status != 'draft' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot delete: AG is not a draft. Current status: ' || v_ag.status,
      'error_code', 'NOT_DRAFT',
      'current_status', v_ag.status
    );
  END IF;

  -- Vérifier les droits d'accès (manager de la copro)
  -- Note: En dev, cette vérification peut être commentée si RLS est désactivé
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Access denied: only copro managers can delete AG drafts',
      'error_code', 'ACCESS_DENIED'
    );
  END IF;

  -- ==========================================================================
  -- 2. COLLECTE DES IDS LIÉS (pour suppression en cascade)
  -- ==========================================================================

  -- Récupérer les IDs des résolutions (pour supprimer les votes)
  SELECT ARRAY_AGG(id) INTO v_resolution_ids
  FROM ag_resolutions
  WHERE ag_id = p_ag_id;

  -- Récupérer les IDs des documents liés (convocation, PV) pour archivage
  SELECT ARRAY_AGG(DISTINCT doc_id) INTO v_document_ids
  FROM (
    SELECT pv_document_id AS doc_id FROM ag_meetings WHERE id = p_ag_id AND pv_document_id IS NOT NULL
    UNION ALL
    SELECT document_id AS doc_id FROM ag_notifications WHERE ag_id = p_ag_id AND document_id IS NOT NULL
    UNION ALL
    SELECT form_document_id AS doc_id FROM ag_correspondence_votes WHERE ag_id = p_ag_id AND form_document_id IS NOT NULL
    UNION ALL
    SELECT proxy_document_id AS doc_id FROM ag_attendance WHERE ag_id = p_ag_id AND proxy_document_id IS NOT NULL
  ) docs
  WHERE doc_id IS NOT NULL;

  -- ==========================================================================
  -- 3. SUPPRESSION DES DONNÉES LIÉES (ordre important)
  -- ==========================================================================

  -- 3a. Supprimer les votes (via résolutions)
  IF v_resolution_ids IS NOT NULL AND array_length(v_resolution_ids, 1) > 0 THEN
    DELETE FROM ag_votes
    WHERE resolution_id = ANY(v_resolution_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('votes', v_count);

    -- Supprimer les détails de votes par correspondance
    DELETE FROM ag_correspondence_vote_details
    WHERE resolution_id = ANY(v_resolution_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('correspondence_vote_details', v_count);
  END IF;

  -- 3b. Supprimer les résolutions
  DELETE FROM ag_resolutions WHERE ag_id = p_ag_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('resolutions', v_count);

  -- 3c. Supprimer les présences
  DELETE FROM ag_attendance WHERE ag_id = p_ag_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('attendance', v_count);

  -- 3d. Supprimer les formulaires de votes par correspondance
  DELETE FROM ag_correspondence_votes WHERE ag_id = p_ag_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('correspondence_votes', v_count);

  -- 3e. Supprimer les brouillons de session
  DELETE FROM ag_session_drafts WHERE ag_id = p_ag_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('session_drafts', v_count);

  -- 3f. Supprimer les notifications
  DELETE FROM ag_notifications WHERE ag_id = p_ag_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('notifications', v_count);

  -- 3g. Supprimer les jalons (milestones)
  DELETE FROM ag_milestones WHERE ag_id = p_ag_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('milestones', v_count);

  -- ==========================================================================
  -- 4. ARCHIVAGE DES DOCUMENTS LIÉS (plutôt que suppression)
  -- ==========================================================================

  IF v_document_ids IS NOT NULL AND array_length(v_document_ids, 1) > 0 THEN
    UPDATE documents
    SET
      status = 'archived',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'archived_reason', 'AG draft deleted',
        'archived_at', NOW(),
        'original_ag_id', p_ag_id
      ),
      updated_at = NOW()
    WHERE id = ANY(v_document_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_deleted_counts := v_deleted_counts || jsonb_build_object('documents_archived', v_count);
  END IF;

  -- ==========================================================================
  -- 5. SUPPRESSION DE L'AG ELLE-MÊME
  -- ==========================================================================

  DELETE FROM ag_meetings
  WHERE id = p_ag_id
    AND status = 'draft';  -- Double vérification de sécurité

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Failed to delete AG: record may have been modified',
      'error_code', 'DELETE_FAILED'
    );
  END IF;

  -- ==========================================================================
  -- 6. RETOUR DU RÉSULTAT
  -- ==========================================================================

  RETURN jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'deleted_at', NOW(),
    'deleted_counts', v_deleted_counts
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION delete_ag_draft IS
  'Supprime atomiquement un brouillon d''AG et toutes ses données liées.
   Seuls les brouillons (status=draft) peuvent être supprimés.
   Les documents liés sont archivés plutôt que supprimés pour traçabilité.';

-- ============================================================================
-- GRANT pour permettre l'appel via Supabase client
-- ============================================================================

-- Accorder l'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION delete_ag_draft(UUID) TO authenticated;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
