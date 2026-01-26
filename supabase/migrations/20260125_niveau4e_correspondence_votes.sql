-- ============================================
-- Migration: NIVEAU 4E - VOTES PAR CORRESPONDANCE
-- Date: 2026-01-25
-- Description: Système complet de votes par correspondance (Art. 17-1 A loi 65-557)
-- Dépendances: niveau4b_ag.sql
-- ============================================

-- ============================================
-- 1) EXTENSION TABLE ag_correspondence_votes
-- ============================================

-- Ajouter les colonnes manquantes pour le suivi des votes par résolution
ALTER TABLE ag_correspondence_votes
ADD COLUMN IF NOT EXISTS mode_reception TEXT DEFAULT 'postal',
ADD COLUMN IF NOT EXISTS reception_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS integration_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN ag_correspondence_votes.mode_reception IS 'Mode de réception: postal, email, remise_main';
COMMENT ON COLUMN ag_correspondence_votes.reception_validated IS 'Réception validée par le syndic';
COMMENT ON COLUMN ag_correspondence_votes.integration_status IS 'pending, integrated, rejected';


-- ============================================
-- 2) TABLE ag_correspondence_vote_details
--    Stocke les choix de vote par résolution dans le formulaire
-- ============================================

CREATE TABLE IF NOT EXISTS ag_correspondence_vote_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correspondence_form_id UUID NOT NULL REFERENCES ag_correspondence_votes(id) ON DELETE CASCADE,
  resolution_id UUID NOT NULL REFERENCES ag_resolutions(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id),

  -- Choix de vote sur le formulaire
  vote vote_direction NOT NULL,

  -- Date de saisie dans le système
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES profiles(id),

  -- Intégration dans ag_votes
  integrated_vote_id UUID REFERENCES ag_votes(id),
  integrated_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(correspondence_form_id, resolution_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_corr_vote_details_form ON ag_correspondence_vote_details(correspondence_form_id);
CREATE INDEX IF NOT EXISTS idx_corr_vote_details_resolution ON ag_correspondence_vote_details(resolution_id);
CREATE INDEX IF NOT EXISTS idx_corr_vote_details_copro ON ag_correspondence_vote_details(copro_id);
CREATE INDEX IF NOT EXISTS idx_corr_vote_details_coproprietaire ON ag_correspondence_vote_details(coproprietaire_id);

COMMENT ON TABLE ag_correspondence_vote_details IS 'Détail des votes par résolution dans un formulaire de vote par correspondance - Art. 17-1 A';

-- RLS
ALTER TABLE ag_correspondence_vote_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view correspondence vote details"
ON ag_correspondence_vote_details FOR SELECT
USING (user_has_copro_access(copro_id));

CREATE POLICY "Only managers can manage correspondence vote details"
ON ag_correspondence_vote_details FOR ALL
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));


-- ============================================
-- 3) FONCTION: Enregistrer un vote par correspondance
-- ============================================

CREATE OR REPLACE FUNCTION register_correspondence_vote(
  p_ag_id UUID,
  p_coproprietaire_id UUID,
  p_resolution_id UUID,
  p_vote vote_direction,
  p_form_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_resolution RECORD;
  v_ag RECORD;
  v_attendance RECORD;
  v_existing_vote RECORD;
  v_form RECORD;
  v_vote_id UUID;
  v_detail_id UUID;
BEGIN
  -- 1. Vérifier la résolution et l'AG
  SELECT r.*, m.status AS ag_status, m.copro_id
  INTO v_resolution
  FROM ag_resolutions r
  JOIN ag_meetings m ON m.id = r.ag_id
  WHERE r.id = p_resolution_id AND r.ag_id = p_ag_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolution not found for this AG');
  END IF;

  -- 2. Vérifier que l'AG n'est pas déjà clôturée
  IF v_resolution.ag_status IN ('closed', 'pv_generated') THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG is already closed, cannot register correspondence votes');
  END IF;

  -- 3. Vérifier la présence du copropriétaire (doit être inscrit comme 'correspondence')
  SELECT * INTO v_attendance
  FROM ag_attendance
  WHERE ag_id = p_ag_id
    AND coproprietaire_id = p_coproprietaire_id;

  IF NOT FOUND THEN
    -- Créer automatiquement l'inscription en mode correspondance
    INSERT INTO ag_attendance (ag_id, copro_id, coproprietaire_id, presence_type, lot_ids)
    SELECT
      p_ag_id,
      v_resolution.copro_id,
      p_coproprietaire_id,
      'correspondence',
      ARRAY_AGG(l.id)
    FROM lots l
    JOIN lot_owners lo ON lo.lot_id = l.id
    WHERE lo.coproprietaire_id = p_coproprietaire_id
      AND lo.copro_id = v_resolution.copro_id
      AND lo.end_date IS NULL
    GROUP BY p_coproprietaire_id
    RETURNING * INTO v_attendance;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Could not register attendance for coproprietaire');
    END IF;
  ELSIF v_attendance.presence_type NOT IN ('correspondence') THEN
    -- Le copropriétaire est déjà inscrit comme présent ou représenté
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coproprietaire is registered as ' || v_attendance.presence_type || ', cannot use correspondence vote',
      'presence_type', v_attendance.presence_type
    );
  END IF;

  -- 4. Vérifier s'il n'a pas déjà voté (ni en live, ni en correspondance)
  SELECT * INTO v_existing_vote
  FROM ag_votes
  WHERE resolution_id = p_resolution_id
    AND coproprietaire_id = p_coproprietaire_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coproprietaire has already voted for this resolution',
      'existing_vote', v_existing_vote.vote,
      'vote_source', v_existing_vote.vote_source
    );
  END IF;

  -- 5. Vérifier/créer le formulaire de correspondance si fourni
  IF p_form_id IS NOT NULL THEN
    SELECT * INTO v_form
    FROM ag_correspondence_votes
    WHERE id = p_form_id AND coproprietaire_id = p_coproprietaire_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Correspondence form not found');
    END IF;
  ELSE
    -- Créer ou récupérer le formulaire
    INSERT INTO ag_correspondence_votes (ag_id, copro_id, coproprietaire_id, received_at, validated, validated_at)
    VALUES (p_ag_id, v_resolution.copro_id, p_coproprietaire_id, NOW(), true, NOW())
    ON CONFLICT (ag_id, coproprietaire_id)
    DO UPDATE SET validated = true, validated_at = NOW()
    RETURNING * INTO v_form;
  END IF;

  -- 6. Enregistrer le vote dans ag_votes
  INSERT INTO ag_votes (
    resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source
  ) VALUES (
    p_resolution_id,
    v_resolution.copro_id,
    p_coproprietaire_id,
    p_vote,
    v_attendance.tantiemes,
    'correspondence'
  )
  RETURNING id INTO v_vote_id;

  -- 7. Enregistrer le détail dans ag_correspondence_vote_details
  INSERT INTO ag_correspondence_vote_details (
    correspondence_form_id, resolution_id, copro_id, coproprietaire_id,
    vote, recorded_by, integrated_vote_id, integrated_at
  ) VALUES (
    v_form.id,
    p_resolution_id,
    v_resolution.copro_id,
    p_coproprietaire_id,
    p_vote,
    auth.uid(),
    v_vote_id,
    NOW()
  )
  RETURNING id INTO v_detail_id;

  -- 8. Mettre à jour le statut du formulaire
  UPDATE ag_correspondence_votes
  SET integration_status = 'integrated', integrated_at = NOW()
  WHERE id = v_form.id;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'detail_id', v_detail_id,
    'form_id', v_form.id,
    'tantiemes', v_attendance.tantiemes,
    'vote', p_vote,
    'vote_source', 'correspondence'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_correspondence_vote IS 'Enregistre un vote par correspondance pour une résolution - Art. 17-1 A';


-- ============================================
-- 4) FONCTION: Enregistrer tous les votes d'un formulaire
-- ============================================

CREATE OR REPLACE FUNCTION register_correspondence_form_votes(
  p_ag_id UUID,
  p_coproprietaire_id UUID,
  p_votes JSONB,  -- Array de {resolution_id, vote}
  p_mode_reception TEXT DEFAULT 'postal'
)
RETURNS JSONB AS $$
DECLARE
  v_ag RECORD;
  v_form_id UUID;
  v_vote_item JSONB;
  v_result JSONB;
  v_results JSONB := '[]'::jsonb;
  v_success_count INT := 0;
  v_error_count INT := 0;
BEGIN
  -- 1. Vérifier l'AG
  SELECT * INTO v_ag FROM ag_meetings WHERE id = p_ag_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG not found');
  END IF;

  -- 2. Créer le formulaire de correspondance
  INSERT INTO ag_correspondence_votes (
    ag_id, copro_id, coproprietaire_id,
    mode_reception, received_at, validated, validated_at, validated_by
  ) VALUES (
    p_ag_id, v_ag.copro_id, p_coproprietaire_id,
    p_mode_reception, NOW(), true, NOW(), auth.uid()
  )
  ON CONFLICT (ag_id, coproprietaire_id)
  DO UPDATE SET
    mode_reception = p_mode_reception,
    received_at = NOW(),
    validated = true,
    validated_at = NOW(),
    validated_by = auth.uid()
  RETURNING id INTO v_form_id;

  -- 3. Enregistrer chaque vote
  FOR v_vote_item IN SELECT * FROM jsonb_array_elements(p_votes)
  LOOP
    v_result := register_correspondence_vote(
      p_ag_id,
      p_coproprietaire_id,
      (v_vote_item->>'resolution_id')::UUID,
      (v_vote_item->>'vote')::vote_direction,
      v_form_id
    );

    v_results := v_results || jsonb_build_object(
      'resolution_id', v_vote_item->>'resolution_id',
      'result', v_result
    );

    IF (v_result->>'success')::boolean THEN
      v_success_count := v_success_count + 1;
    ELSE
      v_error_count := v_error_count + 1;
    END IF;
  END LOOP;

  -- 4. Mettre à jour le statut du formulaire
  UPDATE ag_correspondence_votes
  SET integration_status = CASE
    WHEN v_error_count = 0 THEN 'integrated'
    WHEN v_success_count = 0 THEN 'rejected'
    ELSE 'partial'
  END
  WHERE id = v_form_id;

  RETURN jsonb_build_object(
    'success', v_error_count = 0,
    'form_id', v_form_id,
    'votes_registered', v_success_count,
    'votes_failed', v_error_count,
    'details', v_results
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_correspondence_form_votes IS 'Enregistre tous les votes d''un formulaire de correspondance en une fois';


-- ============================================
-- 5) MISE À JOUR FONCTION cast_vote
--    Empêcher le vote live si déjà voté par correspondance
-- ============================================

CREATE OR REPLACE FUNCTION cast_vote(
  p_resolution_id UUID,
  p_coproprietaire_id UUID,
  p_vote vote_direction,
  p_vote_source vote_source DEFAULT 'live'
)
RETURNS JSONB AS $$
DECLARE
  v_resolution RECORD;
  v_attendance RECORD;
  v_existing_vote RECORD;
  v_vote_id UUID;
BEGIN
  -- 1. Vérifier la résolution
  SELECT r.*, m.status AS ag_status
  INTO v_resolution
  FROM ag_resolutions r
  JOIN ag_meetings m ON m.id = r.ag_id
  WHERE r.id = p_resolution_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolution not found');
  END IF;

  -- 2. Vérifier que l'AG est en cours (pour vote live)
  IF p_vote_source = 'live' AND v_resolution.ag_status != 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG is not in progress');
  END IF;

  -- 3. Vérifier que la résolution est en status voting ou pending
  IF v_resolution.status NOT IN ('pending', 'voting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolution is not open for voting');
  END IF;

  -- 4. Vérifier la présence du copropriétaire
  SELECT * INTO v_attendance
  FROM ag_attendance
  WHERE ag_id = v_resolution.ag_id
    AND coproprietaire_id = p_coproprietaire_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Coproprietaire not registered for this AG');
  END IF;

  -- 5. NOUVEAU: Vérifier s'il n'a pas déjà voté (ni en live, ni en correspondance)
  SELECT * INTO v_existing_vote
  FROM ag_votes
  WHERE resolution_id = p_resolution_id
    AND coproprietaire_id = p_coproprietaire_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', CASE
        WHEN v_existing_vote.vote_source = 'correspondence'
        THEN 'Coproprietaire has already voted by correspondence'
        ELSE 'Coproprietaire has already voted'
      END,
      'existing_vote', v_existing_vote.vote,
      'vote_source', v_existing_vote.vote_source
    );
  END IF;

  -- 6. Enregistrer le vote
  INSERT INTO ag_votes (
    resolution_id, copro_id, coproprietaire_id, vote, tantiemes, vote_source
  ) VALUES (
    p_resolution_id,
    v_resolution.copro_id,
    p_coproprietaire_id,
    p_vote,
    v_attendance.tantiemes,
    p_vote_source
  )
  RETURNING id INTO v_vote_id;

  -- 7. Mettre à jour le statut de la résolution si premier vote
  IF v_resolution.status = 'pending' THEN
    UPDATE ag_resolutions SET status = 'voting' WHERE id = p_resolution_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'vote_id', v_vote_id,
    'tantiemes', v_attendance.tantiemes,
    'vote', p_vote,
    'vote_source', p_vote_source
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 6) MISE À JOUR FONCTION calculate_resolution_result
--    Distinguer votes live vs correspondance dans les détails
-- ============================================

CREATE OR REPLACE FUNCTION calculate_resolution_result(p_resolution_id UUID)
RETURNS JSONB AS $$
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
  -- Nouveaux compteurs par source
  v_live_for NUMERIC := 0;
  v_live_against NUMERIC := 0;
  v_live_abstention NUMERIC := 0;
  v_corr_for NUMERIC := 0;
  v_corr_against NUMERIC := 0;
  v_corr_abstention NUMERIC := 0;
  v_live_voters INT := 0;
  v_corr_voters INT := 0;

  v_threshold RECORD;
  v_is_approved BOOLEAN := false;
  v_is_bridgeable BOOLEAN := false;
  v_bridge_threshold NUMERIC;
  v_result JSONB;
BEGIN
  -- 1. Récupérer la résolution et l'AG
  SELECT * INTO v_resolution FROM ag_resolutions WHERE id = p_resolution_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resolution not found');
  END IF;

  SELECT * INTO v_ag FROM ag_meetings WHERE id = v_resolution.ag_id;

  -- 2. Calculer le quorum et les stats de présence
  SELECT * INTO v_quorum FROM compute_ag_quorum(v_resolution.ag_id);

  -- 3. Compter le nombre total de copropriétaires
  SELECT COUNT(DISTINCT lo.coproprietaire_id)
  INTO v_total_owners
  FROM lot_owners lo
  WHERE lo.copro_id = v_ag.copro_id
    AND lo.end_date IS NULL;

  -- Nombre de copropriétaires présents/représentés
  SELECT COUNT(DISTINCT coproprietaire_id)
  INTO v_present_owners
  FROM ag_attendance
  WHERE ag_id = v_resolution.ag_id;

  -- 4. Agréger les votes totaux (hors exclusions)
  SELECT
    COALESCE(SUM(CASE WHEN vote = 'for' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'against' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'abstention' THEN tantiemes ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE vote = 'for'),
    COUNT(*) FILTER (WHERE vote = 'against'),
    COUNT(*) FILTER (WHERE vote = 'abstention')
  INTO v_votes_for, v_votes_against, v_votes_abstention,
       v_voters_for, v_voters_against, v_voters_abstention
  FROM ag_votes
  WHERE resolution_id = p_resolution_id
    AND (is_excluded = false OR is_excluded IS NULL);

  -- 4b. NOUVEAU: Agréger par source de vote
  SELECT
    COALESCE(SUM(CASE WHEN vote = 'for' AND vote_source = 'live' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'against' AND vote_source = 'live' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'abstention' AND vote_source = 'live' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'for' AND vote_source = 'correspondence' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'against' AND vote_source = 'correspondence' THEN tantiemes ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN vote = 'abstention' AND vote_source = 'correspondence' THEN tantiemes ELSE 0 END), 0),
    COUNT(*) FILTER (WHERE vote_source = 'live'),
    COUNT(*) FILTER (WHERE vote_source = 'correspondence')
  INTO v_live_for, v_live_against, v_live_abstention,
       v_corr_for, v_corr_against, v_corr_abstention,
       v_live_voters, v_corr_voters
  FROM ag_votes
  WHERE resolution_id = p_resolution_id
    AND (is_excluded = false OR is_excluded IS NULL);

  -- 5. Calculer le seuil selon le type de majorité
  SELECT * INTO v_threshold FROM compute_majority_threshold(
    v_resolution.majority_type,
    v_quorum.total_tantiemes,
    v_quorum.present_tantiemes,
    v_total_owners,
    v_present_owners
  );

  -- 6. Déterminer si approuvé selon le type de majorité
  CASE v_resolution.majority_type
    WHEN 'art24', 'art25_1' THEN
      -- Majorité simple: POUR > seuil
      v_is_approved := v_votes_for > v_threshold.threshold_tantiemes;

    WHEN 'art25' THEN
      -- Majorité absolue: POUR > seuil
      v_is_approved := v_votes_for > v_threshold.threshold_tantiemes;
      -- Vérifier si passerelle 25-1 applicable (> 1/3 des voix totales)
      IF NOT v_is_approved THEN
        v_bridge_threshold := FLOOR(v_quorum.total_tantiemes / 3);
        v_is_bridgeable := v_votes_for > v_bridge_threshold;
      END IF;

    WHEN 'art26' THEN
      -- Double majorité: POUR > 2/3 tantièmes ET POUR votants > majorité copros
      v_is_approved := v_votes_for > v_threshold.threshold_tantiemes
        AND v_voters_for > v_threshold.threshold_owners;
      -- Vérifier si passerelle 26-1 applicable (> 1/2 des voix totales)
      IF NOT v_is_approved THEN
        v_bridge_threshold := FLOOR(v_quorum.total_tantiemes / 2);
        v_is_bridgeable := v_votes_for > v_bridge_threshold;
      END IF;

    WHEN 'art26_1' THEN
      -- Majorité absolue après passerelle
      v_is_approved := v_votes_for > v_threshold.threshold_tantiemes;

    WHEN 'unanimity' THEN
      -- Unanimité: POUR = total tantièmes et aucun CONTRE
      v_is_approved := v_votes_for >= v_threshold.threshold_tantiemes
        AND v_votes_against = 0;

    ELSE
      v_is_approved := v_votes_for > v_threshold.threshold_tantiemes;
  END CASE;

  -- 7. Mettre à jour la résolution avec détails enrichis
  UPDATE ag_resolutions
  SET
    tantiemes_for = v_votes_for,
    tantiemes_against = v_votes_against,
    tantiemes_abstention = v_votes_abstention,
    voters_for = v_voters_for,
    voters_against = v_voters_against,
    voters_abstention = v_voters_abstention,
    threshold_tantiemes = v_threshold.threshold_tantiemes,
    threshold_voters = v_threshold.threshold_owners,
    is_approved = v_is_approved,
    is_bridgeable = v_is_bridgeable,
    status = CASE WHEN v_is_approved THEN 'approved' ELSE 'rejected' END,
    vote_details = jsonb_build_object(
      'calculation_date', NOW(),
      'majority_rule', v_threshold.description,
      'total_tantiemes', v_quorum.total_tantiemes,
      'present_tantiemes', v_quorum.present_tantiemes,
      'total_owners', v_total_owners,
      'present_owners', v_present_owners,
      'bridge_threshold', v_bridge_threshold,
      -- NOUVEAU: Détail par source de vote
      'by_source', jsonb_build_object(
        'live', jsonb_build_object(
          'voters', v_live_voters,
          'for', v_live_for,
          'against', v_live_against,
          'abstention', v_live_abstention
        ),
        'correspondence', jsonb_build_object(
          'voters', v_corr_voters,
          'for', v_corr_for,
          'against', v_corr_against,
          'abstention', v_corr_abstention
        )
      )
    ),
    voted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_resolution_id;

  -- 8. Construire le résultat enrichi
  v_result := jsonb_build_object(
    'success', true,
    'resolution_id', p_resolution_id,
    'majority_type', v_resolution.majority_type,
    'majority_rule', v_threshold.description,
    'is_approved', v_is_approved,
    'is_bridgeable', v_is_bridgeable,
    'votes', jsonb_build_object(
      'for', jsonb_build_object('tantiemes', v_votes_for, 'voters', v_voters_for),
      'against', jsonb_build_object('tantiemes', v_votes_against, 'voters', v_voters_against),
      'abstention', jsonb_build_object('tantiemes', v_votes_abstention, 'voters', v_voters_abstention)
    ),
    'votes_by_source', jsonb_build_object(
      'live', jsonb_build_object(
        'voters', v_live_voters,
        'for', v_live_for,
        'against', v_live_against,
        'abstention', v_live_abstention
      ),
      'correspondence', jsonb_build_object(
        'voters', v_corr_voters,
        'for', v_corr_for,
        'against', v_corr_against,
        'abstention', v_corr_abstention
      )
    ),
    'thresholds', jsonb_build_object(
      'tantiemes_required', v_threshold.threshold_tantiemes,
      'owners_required', v_threshold.threshold_owners
    ),
    'quorum', jsonb_build_object(
      'total_tantiemes', v_quorum.total_tantiemes,
      'present_tantiemes', v_quorum.present_tantiemes,
      'ratio', v_quorum.quorum_ratio,
      'attendees_count', v_quorum.attendees_count
    )
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 7) VUE: Détail des votes avec source
-- ============================================

-- Mise à jour de v_ag_votes_detailed pour inclure plus de détails
DROP VIEW IF EXISTS v_ag_votes_detailed;

CREATE OR REPLACE VIEW v_ag_votes_detailed AS
SELECT
  v.id AS vote_id,
  v.resolution_id,
  r.title AS resolution_title,
  r.resolution_number,
  r.majority_type,

  v.copro_id,
  m.id AS ag_id,
  m.title AS ag_title,
  m.meeting_date,

  v.coproprietaire_id,
  CASE WHEN cp.is_company THEN cp.company_name
    ELSE CONCAT(cp.first_name, ' ', cp.last_name)
  END AS voter_name,
  cp.email AS voter_email,

  v.vote,
  v.tantiemes,
  v.vote_source,
  v.is_excluded,
  v.exclusion_reason,

  -- Info correspondance si applicable
  cvd.correspondence_form_id,
  cvd.recorded_at AS correspondence_recorded_at,
  cf.received_at AS form_received_at,
  cf.mode_reception,

  v.created_at AS voted_at

FROM ag_votes v
JOIN ag_resolutions r ON r.id = v.resolution_id
JOIN ag_meetings m ON m.id = r.ag_id
JOIN coproprietaires cp ON cp.id = v.coproprietaire_id
LEFT JOIN ag_correspondence_vote_details cvd ON cvd.integrated_vote_id = v.id
LEFT JOIN ag_correspondence_votes cf ON cf.id = cvd.correspondence_form_id
ORDER BY m.meeting_date DESC, r.resolution_number, cp.last_name;

ALTER VIEW v_ag_votes_detailed SET (security_invoker = true);

COMMENT ON VIEW v_ag_votes_detailed IS 'Détail des votes par résolution avec source (live/correspondance) pour audit et PV';


-- ============================================
-- 8) VUE: Résumé votes par résolution avec breakdown
-- ============================================

CREATE OR REPLACE VIEW v_ag_resolution_vote_summary AS
SELECT
  r.id AS resolution_id,
  r.ag_id,
  r.resolution_number,
  r.title,
  r.majority_type,
  r.status,

  -- Totaux
  r.tantiemes_for,
  r.tantiemes_against,
  r.tantiemes_abstention,
  r.voters_for,
  r.voters_against,
  r.voters_abstention,
  r.threshold_tantiemes,
  r.is_approved,

  -- Breakdown par source (depuis vote_details)
  (r.vote_details->'by_source'->'live'->>'voters')::INT AS live_voters,
  (r.vote_details->'by_source'->'live'->>'for')::NUMERIC AS live_for,
  (r.vote_details->'by_source'->'live'->>'against')::NUMERIC AS live_against,
  (r.vote_details->'by_source'->'live'->>'abstention')::NUMERIC AS live_abstention,

  (r.vote_details->'by_source'->'correspondence'->>'voters')::INT AS correspondence_voters,
  (r.vote_details->'by_source'->'correspondence'->>'for')::NUMERIC AS correspondence_for,
  (r.vote_details->'by_source'->'correspondence'->>'against')::NUMERIC AS correspondence_against,
  (r.vote_details->'by_source'->'correspondence'->>'abstention')::NUMERIC AS correspondence_abstention,

  -- Pourcentage
  CASE WHEN (r.tantiemes_for + r.tantiemes_against + r.tantiemes_abstention) > 0
    THEN ROUND(r.tantiemes_for * 100 / (r.tantiemes_for + r.tantiemes_against + r.tantiemes_abstention), 2)
    ELSE 0
  END AS percent_for,

  r.voted_at

FROM ag_resolutions r
ORDER BY r.ag_id, r.resolution_number;

ALTER VIEW v_ag_resolution_vote_summary SET (security_invoker = true);

COMMENT ON VIEW v_ag_resolution_vote_summary IS 'Résumé des votes par résolution avec breakdown live/correspondance';


-- ============================================
-- 9) VUE: Statut votes correspondance par AG
-- ============================================

CREATE OR REPLACE VIEW v_ag_correspondence_status AS
SELECT
  m.id AS ag_id,
  m.title AS ag_title,
  m.meeting_date,
  m.status AS ag_status,
  m.copro_id,

  -- Stats formulaires
  COUNT(DISTINCT cf.id) AS forms_received,
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.validated = true) AS forms_validated,
  COUNT(DISTINCT cf.id) FILTER (WHERE cf.integration_status = 'integrated') AS forms_integrated,

  -- Stats votes
  COUNT(DISTINCT cvd.id) AS vote_details_count,
  COUNT(DISTINCT cvd.integrated_vote_id) AS votes_integrated,

  -- Tantièmes par correspondance
  COALESCE(SUM(DISTINCT a.tantiemes) FILTER (WHERE a.presence_type = 'correspondence'), 0) AS correspondence_tantiemes,

  -- Total tantièmes copro
  (SELECT COALESCE(SUM(l.tantiemes_generaux), 0) FROM lots l WHERE l.copro_id = m.copro_id) AS total_tantiemes,

  -- Pourcentage participation correspondance
  CASE
    WHEN (SELECT COALESCE(SUM(l.tantiemes_generaux), 0) FROM lots l WHERE l.copro_id = m.copro_id) > 0
    THEN ROUND(
      COALESCE(SUM(DISTINCT a.tantiemes) FILTER (WHERE a.presence_type = 'correspondence'), 0) * 100.0 /
      (SELECT COALESCE(SUM(l.tantiemes_generaux), 0) FROM lots l WHERE l.copro_id = m.copro_id), 2
    )
    ELSE 0
  END AS correspondence_ratio

FROM ag_meetings m
LEFT JOIN ag_correspondence_votes cf ON cf.ag_id = m.id
LEFT JOIN ag_correspondence_vote_details cvd ON cvd.correspondence_form_id = cf.id
LEFT JOIN ag_attendance a ON a.ag_id = m.id AND a.presence_type = 'correspondence'
GROUP BY m.id, m.title, m.meeting_date, m.status, m.copro_id;

ALTER VIEW v_ag_correspondence_status SET (security_invoker = true);

COMMENT ON VIEW v_ag_correspondence_status IS 'Statut des votes par correspondance pour chaque AG';


-- ============================================
-- 10) FONCTION: Obtenir les résultats en temps réel pour le projecteur
-- ============================================

CREATE OR REPLACE FUNCTION get_ag_live_results(p_ag_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ag RECORD;
  v_quorum RECORD;
  v_resolutions JSONB;
BEGIN
  -- 1. Récupérer l'AG
  SELECT * INTO v_ag FROM ag_meetings WHERE id = p_ag_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG not found');
  END IF;

  -- 2. Calculer le quorum
  SELECT * INTO v_quorum FROM compute_ag_quorum(p_ag_id);

  -- 3. Récupérer les résolutions avec leurs résultats
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'resolution_number', r.resolution_number,
      'title', r.title,
      'majority_type', r.majority_type,
      'status', r.status,
      'tantiemes_for', COALESCE(r.tantiemes_for, 0),
      'tantiemes_against', COALESCE(r.tantiemes_against, 0),
      'tantiemes_abstention', COALESCE(r.tantiemes_abstention, 0),
      'voters_for', COALESCE(r.voters_for, 0),
      'voters_against', COALESCE(r.voters_against, 0),
      'voters_abstention', COALESCE(r.voters_abstention, 0),
      'threshold_tantiemes', r.threshold_tantiemes,
      'is_approved', r.is_approved,
      'vote_details', r.vote_details,
      -- Votes en direct
      'live_votes', (
        SELECT jsonb_build_object(
          'for', COALESCE(SUM(CASE WHEN v.vote = 'for' THEN v.tantiemes ELSE 0 END), 0),
          'against', COALESCE(SUM(CASE WHEN v.vote = 'against' THEN v.tantiemes ELSE 0 END), 0),
          'abstention', COALESCE(SUM(CASE WHEN v.vote = 'abstention' THEN v.tantiemes ELSE 0 END), 0),
          'voters', COUNT(*)
        )
        FROM ag_votes v
        WHERE v.resolution_id = r.id AND (v.is_excluded = false OR v.is_excluded IS NULL)
      ),
      -- Pourcentage de participation
      'participation_percent', CASE
        WHEN v_quorum.present_tantiemes > 0 THEN
          ROUND((COALESCE(r.tantiemes_for, 0) + COALESCE(r.tantiemes_against, 0) + COALESCE(r.tantiemes_abstention, 0)) * 100.0 / v_quorum.present_tantiemes, 1)
        ELSE 0
      END
    ) ORDER BY r.resolution_number
  )
  INTO v_resolutions
  FROM ag_resolutions r
  WHERE r.ag_id = p_ag_id;

  RETURN jsonb_build_object(
    'success', true,
    'ag', jsonb_build_object(
      'id', v_ag.id,
      'title', v_ag.title,
      'status', v_ag.status,
      'meeting_date', v_ag.meeting_date,
      'session_started_at', v_ag.session_started_at
    ),
    'quorum', jsonb_build_object(
      'total_tantiemes', v_quorum.total_tantiemes,
      'present_tantiemes', v_quorum.present_tantiemes,
      'quorum_ratio', v_quorum.quorum_ratio,
      'attendees_count', v_quorum.attendees_count,
      'present_count', v_quorum.present_count,
      'proxy_count', v_quorum.proxy_count,
      'correspondence_count', v_quorum.correspondence_count
    ),
    'resolutions', COALESCE(v_resolutions, '[]'::jsonb),
    'timestamp', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION get_ag_live_results IS 'Récupère les résultats en temps réel d''une AG pour le mode projecteur';


-- ============================================
-- 11) FONCTION: Obtenir les copropriétaires éligibles au vote par correspondance
-- ============================================

CREATE OR REPLACE FUNCTION get_correspondence_eligible_owners(p_ag_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ag RECORD;
  v_owners JSONB;
BEGIN
  -- 1. Récupérer l'AG
  SELECT * INTO v_ag FROM ag_meetings WHERE id = p_ag_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG not found');
  END IF;

  -- 2. Récupérer tous les copropriétaires avec leur statut
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cp.id,
      'name', CASE WHEN cp.is_company THEN cp.company_name
                   ELSE CONCAT(cp.civility, ' ', cp.first_name, ' ', cp.last_name) END,
      'email', cp.email,
      'lots', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', l.id,
          'ref', l.ref,
          'tantiemes', l.tantiemes_generaux
        ))
        FROM lots l
        JOIN lot_owners lo ON lo.lot_id = l.id
        WHERE lo.coproprietaire_id = cp.id
          AND lo.copro_id = v_ag.copro_id
          AND lo.end_date IS NULL
      ),
      'total_tantiemes', COALESCE((
        SELECT SUM(l.tantiemes_generaux)
        FROM lots l
        JOIN lot_owners lo ON lo.lot_id = l.id
        WHERE lo.coproprietaire_id = cp.id
          AND lo.copro_id = v_ag.copro_id
          AND lo.end_date IS NULL
      ), 0),
      -- Statut de participation
      'attendance', (
        SELECT jsonb_build_object(
          'registered', a.id IS NOT NULL,
          'presence_type', a.presence_type,
          'signed', a.signed
        )
        FROM ag_attendance a
        WHERE a.ag_id = p_ag_id AND a.coproprietaire_id = cp.id
      ),
      -- Statut vote par correspondance
      'correspondence', (
        SELECT jsonb_build_object(
          'form_id', cf.id,
          'received_at', cf.received_at,
          'validated', cf.validated,
          'integration_status', cf.integration_status,
          'votes_count', (
            SELECT COUNT(*) FROM ag_correspondence_vote_details cvd WHERE cvd.correspondence_form_id = cf.id
          )
        )
        FROM ag_correspondence_votes cf
        WHERE cf.ag_id = p_ag_id AND cf.coproprietaire_id = cp.id
      ),
      -- Résolutions déjà votées
      'voted_resolutions', (
        SELECT jsonb_agg(jsonb_build_object(
          'resolution_id', v.resolution_id,
          'vote', v.vote,
          'vote_source', v.vote_source
        ))
        FROM ag_votes v
        JOIN ag_resolutions r ON r.id = v.resolution_id
        WHERE r.ag_id = p_ag_id AND v.coproprietaire_id = cp.id
      )
    )
    ORDER BY cp.last_name, cp.first_name
  )
  INTO v_owners
  FROM coproprietaires cp
  WHERE cp.copro_id = v_ag.copro_id
    AND EXISTS (
      SELECT 1 FROM lot_owners lo
      WHERE lo.coproprietaire_id = cp.id
        AND lo.copro_id = v_ag.copro_id
        AND lo.end_date IS NULL
    );

  RETURN jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'ag_title', v_ag.title,
    'ag_status', v_ag.status,
    'owners', COALESCE(v_owners, '[]'::jsonb)
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION get_correspondence_eligible_owners IS 'Liste les copropriétaires éligibles au vote par correspondance avec leur statut';


-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
