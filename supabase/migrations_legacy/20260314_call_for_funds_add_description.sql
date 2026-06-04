-- Add optional description/motif field to call_for_funds
ALTER TABLE call_for_funds ADD COLUMN IF NOT EXISTS description TEXT NULL;
COMMENT ON COLUMN call_for_funds.description IS 'Optional description/motif for the fund call';
