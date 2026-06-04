-- ============================================================================
-- Migration: Add max_step_reached column for AG workflow tracking
-- Date: 2026-02-02
-- Description: Adds max_step_reached to track the highest step reached,
--              allowing users to navigate back without losing progress display.
--              Also updates constraint for 8 steps (was 7).
-- ============================================================================

-- 1. Add max_step_reached column
ALTER TABLE ag_meetings
ADD COLUMN IF NOT EXISTS max_step_reached INTEGER DEFAULT 1;

-- 2. Update the constraint for current_step to allow 8 steps (previously 7)
ALTER TABLE ag_meetings
DROP CONSTRAINT IF EXISTS ag_meetings_current_step_check;

ALTER TABLE ag_meetings
ADD CONSTRAINT ag_meetings_current_step_check
CHECK (current_step >= 1 AND current_step <= 8);

-- 3. Add constraint for max_step_reached
ALTER TABLE ag_meetings
ADD CONSTRAINT ag_meetings_max_step_reached_check
CHECK (max_step_reached >= 1 AND max_step_reached <= 8);

-- Comment on new column
COMMENT ON COLUMN ag_meetings.max_step_reached IS 'Highest step number reached in the AG workflow (1-8). Used to maintain progress display when navigating back.';

-- 4. Initialize max_step_reached from current_step for existing records
UPDATE ag_meetings
SET max_step_reached = GREATEST(COALESCE(max_step_reached, 1), COALESCE(current_step, 1))
WHERE max_step_reached IS NULL OR max_step_reached < current_step;

-- 5. Update save_ag_wizard_state function to maintain max_step_reached
CREATE OR REPLACE FUNCTION save_ag_wizard_state(
    p_ag_id UUID,
    p_current_step INTEGER,
    p_step_data JSONB DEFAULT NULL,
    p_wizard_mode VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
    v_updated_at TIMESTAMPTZ;
    v_current_max INTEGER;
BEGIN
    -- Vérifier que l'AG existe et que l'utilisateur a le droit
    IF NOT EXISTS (
        SELECT 1 FROM ag_meetings am
        JOIN memberships cm ON cm.copro_id = am.copro_id
        WHERE am.id = p_ag_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'gestionnaire', 'membre_cs')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'AG not found or access denied'
        );
    END IF;

    -- Récupérer le max actuel
    SELECT COALESCE(max_step_reached, 1) INTO v_current_max
    FROM ag_meetings WHERE id = p_ag_id;

    -- Mettre à jour l'état du wizard, en maintenant max_step_reached
    UPDATE ag_meetings
    SET
        current_step = COALESCE(p_current_step, current_step),
        max_step_reached = GREATEST(
            COALESCE(max_step_reached, 1),
            COALESCE(p_current_step, current_step)
        ),
        step_data = CASE
            WHEN p_step_data IS NOT NULL THEN
                COALESCE(step_data, '{}'::jsonb) || p_step_data
            ELSE step_data
        END,
        wizard_mode = COALESCE(p_wizard_mode, wizard_mode),
        updated_at = now()
    WHERE id = p_ag_id
    RETURNING updated_at INTO v_updated_at;

    RETURN jsonb_build_object(
        'success', true,
        'ag_id', p_ag_id,
        'current_step', p_current_step,
        'max_step_reached', GREATEST(v_current_max, COALESCE(p_current_step, v_current_max)),
        'updated_at', v_updated_at
    );
END;
$$;

-- 6. Update complete_ag_wizard_step to also track max_step_reached
CREATE OR REPLACE FUNCTION complete_ag_wizard_step(
    p_ag_id UUID,
    p_step INTEGER,
    p_next_step INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_step_data JSONB;
    v_new_step_data JSONB;
    v_new_step INTEGER;
BEGIN
    -- Vérifier l'accès
    IF NOT EXISTS (
        SELECT 1 FROM ag_meetings am
        JOIN memberships cm ON cm.copro_id = am.copro_id
        WHERE am.id = p_ag_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'gestionnaire', 'membre_cs')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'AG not found or access denied'
        );
    END IF;

    -- Récupérer step_data actuel
    SELECT COALESCE(step_data, '{}'::jsonb) INTO v_step_data
    FROM ag_meetings WHERE id = p_ag_id;

    -- Ajouter l'étape complétée
    v_new_step_data := v_step_data || jsonb_build_object(
        p_step::text, jsonb_build_object(
            'status', 'completed',
            'completed_at', now()
        )
    );

    -- Calculer la nouvelle étape
    v_new_step := COALESCE(p_next_step, p_step + 1);

    -- Mettre à jour, en maintenant max_step_reached
    UPDATE ag_meetings
    SET
        step_data = v_new_step_data,
        current_step = v_new_step,
        max_step_reached = GREATEST(
            COALESCE(max_step_reached, 1),
            v_new_step
        ),
        updated_at = now()
    WHERE id = p_ag_id;

    RETURN jsonb_build_object(
        'success', true,
        'ag_id', p_ag_id,
        'completed_step', p_step,
        'current_step', v_new_step,
        'max_step_reached', v_new_step
    );
END;
$$;

-- 7. Update get_ag_wizard_state to include max_step_reached
CREATE OR REPLACE FUNCTION get_ag_wizard_state(p_ag_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_meeting RECORD;
    v_resolutions_count INTEGER;
    v_attendance_count INTEGER;
    v_votes_count INTEGER;
    v_milestones JSONB;
    v_session_drafts JSONB;
BEGIN
    -- Vérifier l'accès
    IF NOT EXISTS (
        SELECT 1 FROM ag_meetings am
        JOIN memberships cm ON cm.copro_id = am.copro_id
        WHERE am.id = p_ag_id
        AND cm.user_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'AG not found or access denied'
        );
    END IF;

    -- Récupérer les données de l'AG
    SELECT
        id, copro_id, title, meeting_type, meeting_date, location, status,
        current_step, max_step_reached, step_data, wizard_mode, opening_notes,
        created_at, updated_at
    INTO v_meeting
    FROM ag_meetings
    WHERE id = p_ag_id;

    IF v_meeting IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'AG not found'
        );
    END IF;

    -- Compter les résolutions
    SELECT COUNT(*) INTO v_resolutions_count
    FROM ag_resolutions WHERE ag_id = p_ag_id;

    -- Compter les présences
    SELECT COUNT(*) INTO v_attendance_count
    FROM ag_attendance WHERE ag_id = p_ag_id;

    -- Compter les votes
    SELECT COUNT(*) INTO v_votes_count
    FROM ag_votes v
    JOIN ag_resolutions r ON r.id = v.resolution_id
    WHERE r.ag_id = p_ag_id;

    -- Récupérer les milestones
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'milestone_type', milestone_type,
        'completed_at', completed_at
    )), '[]'::jsonb)
    INTO v_milestones
    FROM ag_milestones
    WHERE ag_id = p_ag_id;

    -- Récupérer tous les drafts de session
    SELECT COALESCE(jsonb_object_agg(draft_type, draft_data), '{}'::jsonb)
    INTO v_session_drafts
    FROM ag_session_drafts
    WHERE ag_id = p_ag_id;

    RETURN jsonb_build_object(
        'success', true,
        'ag_id', v_meeting.id,
        'copro_id', v_meeting.copro_id,
        'title', v_meeting.title,
        'meeting_type', v_meeting.meeting_type,
        'meeting_date', v_meeting.meeting_date,
        'location', v_meeting.location,
        'status', v_meeting.status,
        'current_step', COALESCE(v_meeting.current_step, 1),
        'max_step_reached', COALESCE(v_meeting.max_step_reached, v_meeting.current_step, 1),
        'step_data', COALESCE(v_meeting.step_data, '{}'::jsonb),
        'wizard_mode', COALESCE(v_meeting.wizard_mode, 'guided'),
        'opening_notes', v_meeting.opening_notes,
        'created_at', v_meeting.created_at,
        'updated_at', v_meeting.updated_at,
        'stats', jsonb_build_object(
            'resolutions_count', v_resolutions_count,
            'attendance_count', v_attendance_count,
            'votes_count', v_votes_count
        ),
        'milestones', v_milestones,
        'session_drafts', v_session_drafts
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_ag_wizard_state TO authenticated;
GRANT EXECUTE ON FUNCTION get_ag_wizard_state TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ag_wizard_step TO authenticated;
