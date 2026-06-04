-- Migration: Add variables column to v_ag_resolutions_results view
-- Purpose: Enable session page to load pre-filled variable values from resolutions

-- Recreate the view with variables column
CREATE OR REPLACE VIEW v_ag_resolutions_results AS
SELECT
  r.id,
  r.ag_id,
  m.title AS ag_title,
  m.meeting_date AS ag_date,
  r.copro_id,

  r.resolution_number,
  r.title,
  r.description,
  r.resolution_type,
  r.majority_type,
  r.status,

  -- Résultats
  r.tantiemes_for,
  r.tantiemes_against,
  r.tantiemes_abstention,
  r.voters_for,
  r.voters_against,
  r.voters_abstention,
  r.threshold_tantiemes,
  r.threshold_voters,
  r.is_approved,
  r.is_bridgeable,

  -- Calcul du pourcentage
  CASE WHEN (r.tantiemes_for + r.tantiemes_against + r.tantiemes_abstention) > 0
    THEN ROUND(r.tantiemes_for * 100 / (r.tantiemes_for + r.tantiemes_against + r.tantiemes_abstention), 2)
    ELSE 0
  END AS percent_for,

  -- Lien second vote si passerelle
  r.bridge_vote_id,

  r.voted_at,
  r.vote_details,

  -- Variables for template interpolation (NEW)
  r.variables,
  r.is_customized,

  r.created_at

FROM ag_resolutions r
JOIN ag_meetings m ON m.id = r.ag_id;

COMMENT ON VIEW v_ag_resolutions_results IS 'Vue enrichie des résolutions AG avec variables pour interpolation des templates';
