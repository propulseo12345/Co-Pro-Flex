-- ============================================================================
-- Migration: Fix v_ag_drafts_progress to include max_step_reached
-- Date: 2026-02-03
-- Description: Updates the view to include max_step_reached for proper
--              progress display in the AG dashboard brouillons section.
--              Uses security_invoker to respect RLS policies.
-- ============================================================================

-- Recreate the view with max_step_reached AND security_invoker
DROP VIEW IF EXISTS v_ag_drafts_progress;

CREATE VIEW v_ag_drafts_progress
WITH (security_invoker = true)
AS
SELECT
    am.id as ag_id,
    am.copro_id,
    am.title,
    am.meeting_type,
    am.meeting_date,
    am.location,
    am.status,
    am.current_step,
    am.max_step_reached,
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

-- Grant select on the view
GRANT SELECT ON v_ag_drafts_progress TO authenticated;

COMMENT ON VIEW v_ag_drafts_progress IS 'Vue agrégée des brouillons AG avec max_step_reached - security_invoker pour respecter RLS';
