-- ============================================================================
-- ACTION 7 : AG draft invisible aux copropriétaires
-- CoProFlex - Plan de Correction Logique Métier
-- Date: 2026-01-26
-- Description: Les copropriétaires ne voient pas les AG en status='draft'
-- ============================================================================

-- ============================================================================
-- 1) Supprimer l'ancienne policy SELECT
-- ============================================================================

DROP POLICY IF EXISTS "Users can view AG of their copros" ON ag_meetings;

-- ============================================================================
-- 2) NOUVELLE POLICY: Manager voit tout, autres ne voient pas draft
-- ============================================================================

CREATE POLICY "ag_meetings_select_manager"
  ON ag_meetings
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "ag_meetings_select_members"
  ON ag_meetings
  FOR SELECT
  USING (
    user_has_copro_access(copro_id)
    AND status != 'draft'
  );

-- ============================================================================
-- 3) Mettre à jour les policies sur ag_resolutions
-- Les résolutions d'une AG draft doivent aussi être masquées
-- ============================================================================

DROP POLICY IF EXISTS "Users can view resolutions of their copros" ON ag_resolutions;

CREATE POLICY "ag_resolutions_select_manager"
  ON ag_resolutions
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "ag_resolutions_select_members"
  ON ag_resolutions
  FOR SELECT
  USING (
    user_has_copro_access(copro_id)
    AND EXISTS (
      SELECT 1 FROM ag_meetings m
      WHERE m.id = ag_resolutions.ag_id
        AND m.status != 'draft'
    )
  );

-- ============================================================================
-- 4) Mettre à jour les policies sur ag_attendance
-- ============================================================================

DROP POLICY IF EXISTS "Users can view attendance of their copros" ON ag_attendance;

CREATE POLICY "ag_attendance_select_manager"
  ON ag_attendance
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "ag_attendance_select_members"
  ON ag_attendance
  FOR SELECT
  USING (
    user_has_copro_access(copro_id)
    AND EXISTS (
      SELECT 1 FROM ag_meetings m
      WHERE m.id = ag_attendance.ag_id
        AND m.status != 'draft'
    )
  );

-- ============================================================================
-- 5) Mettre à jour les policies sur ag_votes
-- ============================================================================

DROP POLICY IF EXISTS "Users can view votes of their copros" ON ag_votes;

CREATE POLICY "ag_votes_select_manager"
  ON ag_votes
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "ag_votes_select_members"
  ON ag_votes
  FOR SELECT
  USING (
    user_has_copro_access(copro_id)
    AND EXISTS (
      SELECT 1 FROM ag_resolutions r
      JOIN ag_meetings m ON m.id = r.ag_id
      WHERE r.id = ag_votes.resolution_id
        AND m.status != 'draft'
    )
  );

-- ============================================================================
-- 6) Mettre à jour les policies sur ag_correspondence_votes
-- ============================================================================

DROP POLICY IF EXISTS "Users can view correspondence votes" ON ag_correspondence_votes;

CREATE POLICY "ag_correspondence_votes_select_manager"
  ON ag_correspondence_votes
  FOR SELECT
  USING (user_is_copro_manager(copro_id));

CREATE POLICY "ag_correspondence_votes_select_members"
  ON ag_correspondence_votes
  FOR SELECT
  USING (
    user_has_copro_access(copro_id)
    AND EXISTS (
      SELECT 1 FROM ag_meetings m
      WHERE m.id = ag_correspondence_votes.ag_id
        AND m.status != 'draft'
    )
  );

-- ============================================================================
-- 7) INDEX pour optimisation des policies
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ag_meetings_copro_status
  ON ag_meetings(copro_id, status);

-- ============================================================================
-- 8) VUE mise à jour avec security_invoker (déjà existante mais vérification)
-- ============================================================================

-- La vue v_ag_overview doit déjà avoir security_invoker=true
-- Vérification via DO block
DO $$
BEGIN
  -- Forcer le refresh de la vue avec security_invoker
  EXECUTE '
    CREATE OR REPLACE VIEW v_ag_overview
    WITH (security_invoker = true) AS
    SELECT
      m.id,
      m.copro_id,
      c.name AS copro_name,
      m.title,
      m.meeting_type,
      m.meeting_date,
      m.location,
      m.status,
      m.convocation_date,
      m.convocation_deadline,
      m.president_name,
      m.secretary_name,
      q.total_tantiemes,
      q.present_tantiemes,
      q.quorum_ratio,
      q.attendees_count,
      q.present_count,
      q.proxy_count,
      q.correspondence_count,
      (SELECT COUNT(*) FROM ag_resolutions WHERE ag_id = m.id) AS resolutions_count,
      (SELECT COUNT(*) FROM ag_resolutions WHERE ag_id = m.id AND status = ''approved'') AS approved_count,
      (SELECT COUNT(*) FROM ag_resolutions WHERE ag_id = m.id AND status = ''rejected'') AS rejected_count,
      m.created_at,
      m.created_by,
      p.full_name AS created_by_name
    FROM ag_meetings m
    JOIN copros c ON c.id = m.copro_id
    LEFT JOIN profiles p ON p.id = m.created_by
    LEFT JOIN LATERAL compute_ag_quorum(m.id) q ON true
  ';
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorer si la vue ne peut pas être recréée
    RAISE NOTICE 'Could not recreate v_ag_overview: %', SQLERRM;
END $$;

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
