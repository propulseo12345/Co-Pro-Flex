-- Migration: Add variables JSONB and is_customized columns to ag_resolutions
-- Purpose: Enable storing variable values (exercise dates) and tracking customization

-- Add variables JSONB column for storing variable values (e.g., exercise dates)
ALTER TABLE ag_resolutions
ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}';

-- Add is_customized boolean to track if resolution was edited from template
ALTER TABLE ag_resolutions
ADD COLUMN IF NOT EXISTS is_customized BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN ag_resolutions.variables IS 'JSONB storing variable values for template placeholders (e.g., {exercice_debut: "2025-01-01", exercice_fin: "2025-12-31"})';
COMMENT ON COLUMN ag_resolutions.is_customized IS 'True if the resolution was modified from the original template';

-- Add index for querying resolutions with variables
CREATE INDEX IF NOT EXISTS idx_ag_resolutions_has_variables
ON ag_resolutions ((variables IS NOT NULL AND variables != '{}'));
