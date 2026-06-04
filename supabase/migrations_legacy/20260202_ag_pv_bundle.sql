-- ============================================================================
-- Migration: AG PV Bundle RPC
-- Date: 2026-02-02
-- Description: Single RPC to fetch all PV data (fixes timeout on PV page)
-- ============================================================================

-- ============================================================================
-- 1) RPC: get_ag_pv_bundle - Returns all data needed for PV page in ONE call
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_get_ag_pv_bundle(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_meeting RECORD;
  v_result JSONB;
  v_resolutions JSONB;
  v_attendance JSONB;
  v_votes JSONB;
  v_drafts JSONB;
  v_total_tantiemes INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get AG meeting
  SELECT m.*, c.name as copro_name, c.address as copro_address
  INTO v_meeting
  FROM ag_meetings m
  JOIN copros c ON c.id = m.copro_id
  WHERE m.id = p_ag_id;

  IF v_meeting.id IS NULL THEN
    RAISE EXCEPTION 'AG not found: %', p_ag_id USING ERRCODE = 'P0002';
  END IF;

  v_copro_id := v_meeting.copro_id;

  -- Verify access
  IF NOT user_has_copro_access(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied to copro' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get total tantiemes
  SELECT COALESCE(SUM(l.tantiemes), 0)::INTEGER INTO v_total_tantiemes
  FROM lots l
  WHERE l.copro_id = v_copro_id AND l.is_common_part = false;

  -- Get resolutions with vote results
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'titre', r.title,
      'texte', r.description,
      'majorite', r.majority_type::TEXT,
      'resolution_number', r.resolution_number,
      'status', r.status::TEXT,
      'is_approved', r.is_approved,
      'variables', COALESCE(r.variables, '{}'::JSONB),
      'votes_for', r.votes_for,
      'votes_against', r.votes_against,
      'votes_abstention', r.votes_abstention,
      'total_voting_shares', r.total_voting_shares
    ) ORDER BY r.resolution_number
  ), '[]'::JSONB)
  INTO v_resolutions
  FROM v_ag_resolutions_results r
  WHERE r.ag_id = p_ag_id;

  -- Get attendance summary
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'coproprietaireId', a.coproprietaire_id,
      'statut', CASE
        WHEN a.presence_type = 'present' THEN 'PRESENT'
        WHEN a.presence_type = 'proxy' THEN 'REPRESENTE'
        WHEN a.presence_type = 'correspondence' THEN 'CORRESPONDANCE'
        ELSE 'ABSENT'
      END,
      'nom', a.owner_name,
      'tantiemes', a.tantiemes,
      'mandataireId', a.represented_by_name
    ) ORDER BY a.owner_name
  ), '[]'::JSONB)
  INTO v_attendance
  FROM v_ag_attendance_summary a
  WHERE a.ag_id = p_ag_id;

  -- Get all votes (for detailed PV)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'resolutionId', v.resolution_id,
      'coproprietaireId', v.coproprietaire_id,
      'vote', CASE
        WHEN v.vote = 'for' THEN 'POUR'
        WHEN v.vote = 'against' THEN 'CONTRE'
        WHEN v.vote = 'abstention' THEN 'ABSTENTION'
        ELSE NULL
      END,
      'tantiemes', v.tantiemes,
      'source', CASE
        WHEN v.vote_source = 'correspondence' THEN 'CORRESPONDANCE'
        ELSE 'DIRECT'
      END
    )
  ), '[]'::JSONB)
  INTO v_votes
  FROM v_ag_votes_detailed v
  WHERE v.ag_id = p_ag_id;

  -- Get user's drafts (session, variables, roles, signataires)
  SELECT COALESCE(jsonb_object_agg(d.draft_type::TEXT, d.draft_data), '{}'::JSONB)
  INTO v_drafts
  FROM ag_session_drafts d
  WHERE d.ag_id = p_ag_id AND d.user_id = v_user_id;

  -- Build final result
  v_result := jsonb_build_object(
    'agData', jsonb_build_object(
      'id', v_meeting.id,
      'type', CASE
        WHEN v_meeting.meeting_type = 'ordinary' THEN 'ORDINAIRE'
        WHEN v_meeting.meeting_type = 'extraordinary' THEN 'EXTRAORDINAIRE'
        ELSE 'MIXTE'
      END,
      'date', to_char(v_meeting.meeting_date, 'YYYY-MM-DD'),
      'heure', to_char(v_meeting.meeting_date, 'HH24:MI'),
      'lieu', COALESCE(v_meeting.location, ''),
      'adresse', COALESCE(v_meeting.copro_address, ''),
      'title', v_meeting.title,
      'status', v_meeting.status::TEXT,
      'coproName', v_meeting.copro_name,
      'presidentName', v_meeting.president_name,
      'secretaryName', v_meeting.secretary_name,
      'scrutineer1Name', v_meeting.scrutineer1_name,
      'scrutineer2Name', v_meeting.scrutineer2_name,
      'openingNotes', v_meeting.opening_notes,
      'closingNotes', v_meeting.closing_notes
    ),
    'resolutions', v_resolutions,
    'presences', v_attendance,
    'votes', v_votes,
    'drafts', v_drafts,
    'totalTantiemes', v_total_tantiemes,
    'loadedAt', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION rpc_get_ag_pv_bundle IS
  'Fetches all data needed for PV page in a single call (fixes timeout issue)';

-- ============================================================================
-- 2) RPC: finalize_ag_session - Called when step 6 is validated
-- ============================================================================

CREATE OR REPLACE FUNCTION rpc_finalize_ag_session(
  p_ag_id UUID,
  p_closing_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_copro_id UUID;
  v_current_status ag_status;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get AG and verify status
  SELECT copro_id, status INTO v_copro_id, v_current_status
  FROM ag_meetings
  WHERE id = p_ag_id;

  IF v_copro_id IS NULL THEN
    RAISE EXCEPTION 'AG not found: %', p_ag_id USING ERRCODE = 'P0002';
  END IF;

  -- Verify manager access
  IF NOT user_is_copro_manager(v_copro_id) THEN
    RAISE EXCEPTION 'Access denied - manager only' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Idempotent: if already closed/pv_generated, just return success
  IF v_current_status IN ('closed', 'pv_generated') THEN
    v_result := jsonb_build_object(
      'success', true,
      'status', v_current_status::TEXT,
      'message', 'AG already finalized',
      'ag_id', p_ag_id
    );
    RETURN v_result;
  END IF;

  -- Verify AG is in_progress (can be finalized)
  IF v_current_status != 'in_progress' THEN
    RAISE EXCEPTION 'AG must be in_progress to finalize (current: %)', v_current_status
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Update AG status to closed
  UPDATE ag_meetings
  SET
    status = 'closed',
    closing_notes = COALESCE(p_closing_notes, closing_notes),
    closed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ag_id;

  -- Note: Drafts are automatically cleared by trigger trg_ag_close_clear_drafts

  v_result := jsonb_build_object(
    'success', true,
    'status', 'closed',
    'message', 'AG session finalized successfully',
    'ag_id', p_ag_id,
    'closed_at', NOW()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION rpc_finalize_ag_session IS
  'Finalizes AG session (step 6 validation) - idempotent, sets status to closed';

-- ============================================================================
-- 3) Add closed_at column to ag_meetings if not exists
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ag_meetings' AND column_name = 'closed_at'
  ) THEN
    ALTER TABLE ag_meetings ADD COLUMN closed_at TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
