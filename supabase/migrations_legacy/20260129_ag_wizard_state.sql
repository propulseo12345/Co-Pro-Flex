-- ============================================================================
-- Migration: AG Wizard State Persistence
-- Date: 2026-01-29
-- Description: Ajoute le tracking de l'état du wizard AG dans Supabase
--              pour une persistance complète sans localStorage
-- ============================================================================

-- 1. Ajouter les champs de tracking du wizard dans ag_meetings
ALTER TABLE ag_meetings
ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1 CHECK (current_step >= 1 AND current_step <= 7),
ADD COLUMN IF NOT EXISTS step_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS wizard_mode VARCHAR(20) DEFAULT 'guided' CHECK (wizard_mode IN ('guided', 'expert'));

-- Commentaires sur les nouvelles colonnes
COMMENT ON COLUMN ag_meetings.current_step IS 'Étape actuelle du wizard (1-7)';
COMMENT ON COLUMN ag_meetings.step_data IS 'Données de progression par étape: { "1": { "status": "completed", "completed_at": "..." }, ... }';
COMMENT ON COLUMN ag_meetings.wizard_mode IS 'Mode du wizard: guided ou expert';

-- 2. Table pour le tracking des jalons/milestones (délais légaux)
CREATE TABLE IF NOT EXISTS ag_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now(),
    completed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(ag_id, milestone_type)
);

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_ag_milestones_ag_id ON ag_milestones(ag_id);

-- RLS pour ag_milestones
ALTER TABLE ag_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ag_milestones_select_policy" ON ag_milestones
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ag_meetings am
            JOIN memberships cm ON cm.copro_id = am.copro_id
            WHERE am.id = ag_milestones.ag_id
            AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "ag_milestones_insert_policy" ON ag_milestones
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM ag_meetings am
            JOIN memberships cm ON cm.copro_id = am.copro_id
            WHERE am.id = ag_milestones.ag_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('admin', 'gestionnaire', 'membre_cs')
        )
    );

CREATE POLICY "ag_milestones_delete_policy" ON ag_milestones
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM ag_meetings am
            JOIN memberships cm ON cm.copro_id = am.copro_id
            WHERE am.id = ag_milestones.ag_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('admin', 'gestionnaire', 'membre_cs')
        )
    );

-- 3. Fonction RPC pour sauvegarder l'état du wizard
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

    -- Mettre à jour l'état du wizard
    UPDATE ag_meetings
    SET
        current_step = COALESCE(p_current_step, current_step),
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
        'updated_at', v_updated_at
    );
END;
$$;

-- 4. Fonction RPC pour charger l'état complet du wizard
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
        current_step, step_data, wizard_mode, opening_notes,
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

-- 5. Fonction RPC pour marquer une étape comme complétée
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

    -- Mettre à jour
    UPDATE ag_meetings
    SET
        step_data = v_new_step_data,
        current_step = COALESCE(p_next_step, p_step + 1),
        updated_at = now()
    WHERE id = p_ag_id;

    RETURN jsonb_build_object(
        'success', true,
        'ag_id', p_ag_id,
        'completed_step', p_step,
        'current_step', COALESCE(p_next_step, p_step + 1)
    );
END;
$$;

-- 6. Fonction RPC pour sauvegarder un milestone
CREATE OR REPLACE FUNCTION save_ag_milestone(
    p_ag_id UUID,
    p_milestone_type VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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

    -- Insérer ou mettre à jour le milestone
    INSERT INTO ag_milestones (ag_id, milestone_type, completed_by)
    VALUES (p_ag_id, p_milestone_type, auth.uid())
    ON CONFLICT (ag_id, milestone_type)
    DO UPDATE SET completed_at = now(), completed_by = auth.uid();

    RETURN jsonb_build_object(
        'success', true,
        'ag_id', p_ag_id,
        'milestone_type', p_milestone_type,
        'completed_at', now()
    );
END;
$$;

-- 7. Fonction RPC pour supprimer un milestone
CREATE OR REPLACE FUNCTION remove_ag_milestone(
    p_ag_id UUID,
    p_milestone_type VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM ag_milestones
    WHERE ag_id = p_ag_id AND milestone_type = p_milestone_type;

    RETURN jsonb_build_object(
        'success', true,
        'ag_id', p_ag_id,
        'milestone_type', p_milestone_type,
        'removed', true
    );
END;
$$;

-- 8. Mise à jour de la vue v_ag_drafts_progress pour inclure current_step
DROP VIEW IF EXISTS v_ag_drafts_progress;

CREATE VIEW v_ag_drafts_progress AS
SELECT
    am.id as ag_id,
    am.copro_id,
    am.title,
    am.meeting_type,
    am.meeting_date,
    am.location,
    am.status,
    am.current_step,
    am.step_data,
    am.wizard_mode,
    am.created_at,
    am.updated_at,
    COALESCE(r.resolutions_count, 0) as resolutions_count,
    COALESCE(a.attendance_count, 0) as attendance_count,
    COALESCE(v.votes_count, 0) as votes_count,
    (COALESCE(r.resolutions_count, 0) > 0) as has_resolutions,
    (COALESCE(a.attendance_count, 0) > 0) as has_attendance,
    (COALESCE(v.votes_count, 0) > 0) as has_votes,
    CASE
        WHEN COALESCE(r.resolutions_count, 0) = 0 THEN 0
        WHEN COALESCE(a.attendance_count, 0) = 0 THEN 0.33
        WHEN COALESCE(v.votes_count, 0) = 0 THEN 0.66
        ELSE 1.0
    END as completion_ratio,
    GREATEST(
        am.updated_at,
        COALESCE(r.last_resolution_at, am.created_at),
        COALESCE(a.last_attendance_at, am.created_at)
    ) as last_activity_at
FROM ag_meetings am
LEFT JOIN (
    SELECT ag_id, COUNT(*) as resolutions_count, MAX(created_at) as last_resolution_at
    FROM ag_resolutions
    GROUP BY ag_id
) r ON r.ag_id = am.id
LEFT JOIN (
    SELECT ag_id, COUNT(*) as attendance_count, MAX(created_at) as last_attendance_at
    FROM ag_attendance
    GROUP BY ag_id
) a ON a.ag_id = am.id
LEFT JOIN (
    SELECT r.ag_id, COUNT(v.id) as votes_count
    FROM ag_resolutions r
    JOIN ag_votes v ON v.resolution_id = r.id
    GROUP BY r.ag_id
) v ON v.ag_id = am.id
WHERE am.status = 'draft';

-- Grant execute sur les fonctions
GRANT EXECUTE ON FUNCTION save_ag_wizard_state TO authenticated;
GRANT EXECUTE ON FUNCTION get_ag_wizard_state TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ag_wizard_step TO authenticated;
GRANT EXECUTE ON FUNCTION save_ag_milestone TO authenticated;
GRANT EXECUTE ON FUNCTION remove_ag_milestone TO authenticated;
