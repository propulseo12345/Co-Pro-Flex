-- ============================================
-- Migration: AG Remote Meeting Support
-- Date: 2026-01-31
-- Description: Ajout des colonnes pour la participation à distance
-- ============================================

-- Ajouter les colonnes pour le lien de réunion à distance
ALTER TABLE ag_meetings
ADD COLUMN IF NOT EXISTS remote_meeting_url TEXT,
ADD COLUMN IF NOT EXISTS remote_meeting_provider TEXT;

COMMENT ON COLUMN ag_meetings.remote_meeting_url IS 'URL de la réunion à distance (Zoom, Teams, Google Meet, Jitsi, etc.)';
COMMENT ON COLUMN ag_meetings.remote_meeting_provider IS 'Fournisseur du service de visioconférence (zoom, teams, meet, jitsi, webex, other)';

-- Index pour recherche optionnelle
CREATE INDEX IF NOT EXISTS idx_ag_meetings_has_remote ON ag_meetings(copro_id) WHERE remote_meeting_url IS NOT NULL;
