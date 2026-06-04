-- ============================================================================
-- WP2.7 — Art. 24 : majorité des voix EXPRIMÉES (for+against), pas des présents
-- ============================================================================
-- compute_majority_threshold posait le seuil art.24 à FLOOR(présents/2)+1, ce
-- qui inclut à tort les abstentions au dénominateur. La loi (art. 24, loi 1965
-- modifiée) = majorité des voix exprimées -> une résolution art.24 est adoptée
-- si for > against (les abstentions ne comptent pas). Idem passerelle art.25-1
-- et cas par défaut. Les autres majorités (25/26/unanimité) sont inchangées.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_resolution_result(p_resolution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_resolution RECORD;
  v_ag RECORD;
  v_quorum RECORD;
  v_total_owners INT;
  v_present_owners INT;
  v_votes_for NUMERIC := 0;
  v_votes_against NUMERIC := 0;
  v_votes_abstention NUMERIC := 0;
  v_voters_for INT := 0;
  v_voters_against INT := 0;
  v_voters_abstention INT := 0;
  v_threshold RECORD;
  v_threshold_display NUMERIC;
  v_is_approved BOOLEAN := false;
  v_is_bridgeable BOOLEAN := false;
  v_bridge_threshold NUMERIC;
  v_result JSONB;
  v_new_status resolution_status;
BEGIN
  SELECT * INTO v_resolution FROM ag_resolutions WHERE id = p_resolution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolution not found');
  END IF;

  SELECT * INTO v_ag FROM ag_meetings WHERE id = v_resolution.ag_id;
  SELECT * INTO v_quorum FROM compute_ag_quorum(v_resolution.ag_id);

  SELECT COUNT(DISTINCT lo.coproprietaire_id) INTO v_total_owners
  FROM lot_owners lo WHERE lo.copro_id = v_ag.copro_id AND lo.end_date IS NULL;

  SELECT COUNT(DISTINCT coproprietaire_id) INTO v_present_owners
  FROM ag_attendance WHERE ag_id = v_resolution.ag_id;

  SELECT
    COALESCE(SUM(CASE WHEN vote = 'for' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'against' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'abstention' THEN tantiemes ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE vote = 'for'),
    COUNT(*) FILTER (WHERE vote = 'against'),
    COUNT(*) FILTER (WHERE vote = 'abstention')
  INTO v_votes_for, v_votes_against, v_votes_abstention,
       v_voters_for, v_voters_against, v_voters_abstention
  FROM ag_votes WHERE resolution_id = p_resolution_id AND (is_excluded = false OR is_excluded IS NULL);

  SELECT * INTO v_threshold FROM compute_majority_threshold(
    v_resolution.majority_type, v_quorum.total_tantiemes, v_quorum.present_tantiemes,
    v_total_owners, v_present_owners
  );
  v_threshold_display := v_threshold.threshold_tantiemes;

  CASE v_resolution.majority_type
    WHEN 'art24', 'art25_1' THEN
      -- Majorité des voix EXPRIMÉES (abstentions exclues) : for > against
      v_is_approved := v_votes_for > v_votes_against;
      v_threshold_display := FLOOR((v_votes_for + v_votes_against) / 2) + 1;
    WHEN 'art25' THEN
      v_is_approved := v_votes_for >= v_threshold.threshold_tantiemes;
      IF NOT v_is_approved THEN
        v_bridge_threshold := FLOOR(v_quorum.total_tantiemes / 3);
        v_is_bridgeable := v_votes_for > v_bridge_threshold;
      END IF;
    WHEN 'art26' THEN
      v_is_approved := v_votes_for >= v_threshold.threshold_tantiemes
        AND v_voters_for >= v_threshold.threshold_owners;
      IF NOT v_is_approved THEN
        v_bridge_threshold := FLOOR(v_quorum.total_tantiemes / 2);
        v_is_bridgeable := v_votes_for > v_bridge_threshold;
      END IF;
    WHEN 'art26_1' THEN
      v_is_approved := v_votes_for >= v_threshold.threshold_tantiemes;
    WHEN 'unanimity' THEN
      v_is_approved := v_votes_for >= v_threshold.threshold_tantiemes AND v_votes_against = 0;
    ELSE
      -- Défaut = art. 24 (voix exprimées)
      v_is_approved := v_votes_for > v_votes_against;
      v_threshold_display := FLOOR((v_votes_for + v_votes_against) / 2) + 1;
  END CASE;

  v_new_status := CASE WHEN v_is_approved THEN 'approved'::resolution_status ELSE 'rejected'::resolution_status END;

  UPDATE ag_resolutions SET
    tantiemes_for = v_votes_for, tantiemes_against = v_votes_against, tantiemes_abstention = v_votes_abstention,
    voters_for = v_voters_for, voters_against = v_voters_against, voters_abstention = v_voters_abstention,
    threshold_tantiemes = v_threshold_display, threshold_voters = v_threshold.threshold_owners,
    is_approved = v_is_approved, is_bridgeable = v_is_bridgeable, status = v_new_status,
    vote_details = jsonb_build_object(
      'calculation_date', NOW(), 'majority_rule', v_threshold.description,
      'total_tantiemes', v_quorum.total_tantiemes, 'present_tantiemes', v_quorum.present_tantiemes,
      'total_owners', v_total_owners, 'present_owners', v_present_owners, 'bridge_threshold', v_bridge_threshold
    ),
    voted_at = NOW(), updated_at = NOW()
  WHERE id = p_resolution_id;

  v_result := jsonb_build_object(
    'success', true, 'resolution_id', p_resolution_id, 'majority_type', v_resolution.majority_type,
    'majority_rule', v_threshold.description, 'is_approved', v_is_approved, 'is_bridgeable', v_is_bridgeable,
    'votes', jsonb_build_object(
      'for', jsonb_build_object('tantiemes', v_votes_for, 'voters', v_voters_for),
      'against', jsonb_build_object('tantiemes', v_votes_against, 'voters', v_voters_against),
      'abstention', jsonb_build_object('tantiemes', v_votes_abstention, 'voters', v_voters_abstention)
    ),
    'thresholds', jsonb_build_object('tantiemes_required', v_threshold_display, 'owners_required', v_threshold.threshold_owners),
    'quorum', jsonb_build_object('total_tantiemes', v_quorum.total_tantiemes, 'present_tantiemes', v_quorum.present_tantiemes,
      'ratio', v_quorum.quorum_ratio, 'attendees_count', v_quorum.attendees_count)
  );
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;