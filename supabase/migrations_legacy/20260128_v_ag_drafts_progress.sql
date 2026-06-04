-- ============================================================================
-- Migration: v_ag_drafts_progress
-- Date: 2026-01-28
-- Description: Vue agrégée pour les brouillons AG - élimine le pattern N+1
-- ============================================================================

-- Vue avec security_invoker pour respecter RLS
CREATE OR REPLACE VIEW v_ag_drafts_progress
WITH (security_invoker = true)
AS
SELECT
  m.id AS ag_id,
  m.copro_id,
  m.title,
  m.meeting_type,
  m.meeting_date,
  m.location,
  m.status,
  m.created_at,
  m.updated_at,

  -- Counts agrégés
  COALESCE(r.resolutions_count, 0)::int AS resolutions_count,
  COALESCE(a.attendance_count, 0)::int AS attendance_count,
  COALESCE(v.votes_count, 0)::int AS votes_count,

  -- Flags booléens pour le frontend
  COALESCE(r.resolutions_count, 0) > 0 AS has_resolutions,
  COALESCE(a.attendance_count, 0) > 0 AS has_attendance,
  COALESCE(v.votes_count, 0) > 0 AS has_votes,

  -- Ratio de complétion simplifié (0..1)
  -- Basé sur: info de base (date+lieu), résolutions, présences, votes
  CASE
    WHEN m.status = 'draft' THEN
      (
        CASE WHEN m.meeting_date IS NOT NULL AND m.location IS NOT NULL THEN 0.25 ELSE 0 END +
        CASE WHEN COALESCE(r.resolutions_count, 0) > 0 THEN 0.25 ELSE 0 END +
        CASE WHEN COALESCE(a.attendance_count, 0) > 0 THEN 0.25 ELSE 0 END +
        CASE WHEN COALESCE(v.votes_count, 0) > 0 THEN 0.25 ELSE 0 END
      )
    ELSE 1.0
  END AS completion_ratio,

  -- Dernière activité (max des updated_at)
  GREATEST(
    m.updated_at,
    COALESCE(r.last_resolution_at, m.updated_at),
    COALESCE(a.last_attendance_at, m.updated_at)
  ) AS last_activity_at

FROM ag_meetings m

-- Sous-requête résolutions
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS resolutions_count,
    MAX(updated_at) AS last_resolution_at
  FROM ag_resolutions
  WHERE ag_id = m.id
) r ON true

-- Sous-requête présences
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::int AS attendance_count,
    MAX(updated_at) AS last_attendance_at
  FROM ag_attendance
  WHERE ag_id = m.id
) a ON true

-- Sous-requête votes (via résolutions)
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS votes_count
  FROM ag_votes av
  INNER JOIN ag_resolutions ar ON av.resolution_id = ar.id
  WHERE ar.ag_id = m.id
) v ON true;

-- Index pour améliorer les performances (si pas déjà présents)
-- On vérifie d'abord s'ils existent
DO $$
BEGIN
  -- Index sur ag_resolutions(ag_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_ag_resolutions_ag_id'
  ) THEN
    CREATE INDEX idx_ag_resolutions_ag_id ON ag_resolutions(ag_id);
  END IF;

  -- Index sur ag_attendance(ag_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_ag_attendance_ag_id'
  ) THEN
    CREATE INDEX idx_ag_attendance_ag_id ON ag_attendance(ag_id);
  END IF;

  -- Index sur ag_votes(resolution_id)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_ag_votes_resolution_id'
  ) THEN
    CREATE INDEX idx_ag_votes_resolution_id ON ag_votes(resolution_id);
  END IF;

  -- Index composite pour filtrage rapide des drafts par copro
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_ag_meetings_copro_status'
  ) THEN
    CREATE INDEX idx_ag_meetings_copro_status ON ag_meetings(copro_id, status);
  END IF;
END
$$;

-- Grant select sur la vue (RLS s'applique via security_invoker)
GRANT SELECT ON v_ag_drafts_progress TO authenticated;

COMMENT ON VIEW v_ag_drafts_progress IS 'Vue agrégée des brouillons AG avec compteurs. Élimine le pattern N+1 queries.';
