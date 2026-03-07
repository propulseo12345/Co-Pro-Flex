-- Add 'resolutions_results' to ag_draft_type enum
-- Stores vote results (ADOPTEE/REJETEE/AJOURNEE) per resolution in session drafts
DO $$
BEGIN
  ALTER TYPE ag_draft_type ADD VALUE IF NOT EXISTS 'resolutions_results';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
