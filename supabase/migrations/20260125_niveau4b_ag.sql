-- ============================================
-- Migration: NIVEAU 4B - ASSEMBLÉES GÉNÉRALES (AG)
-- Date: 2026-01-25
-- Description: Tables AG, résolutions, présences, votes, fonctions de calcul majorité
-- Référentiel légal: Loi 65-557, Décret 67-223, Loi ALUR, Ordonnance 2019-1101
-- Dépendances: copros, lots, coproprietaires, lot_owners, profiles, budgets
-- ============================================

-- ============================================
-- 0) TYPES ENUM
-- ============================================

-- Type d'AG
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ag_meeting_type') THEN
    CREATE TYPE ag_meeting_type AS ENUM (
      'ordinary',       -- AG ordinaire annuelle
      'extraordinary',  -- AG extraordinaire
      'mixed'          -- Mixte (ordinaire + extraordinaire)
    );
  END IF;
END $$;

-- Statut de l'AG
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ag_status') THEN
    CREATE TYPE ag_status AS ENUM (
      'draft',          -- Brouillon (en préparation)
      'convoked',       -- Convocations envoyées
      'in_progress',    -- Séance en cours
      'closed',         -- Séance clôturée, votes terminés
      'pv_generated'    -- PV généré et archivé
    );
  END IF;
END $$;

-- Type de résolution
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resolution_type') THEN
    CREATE TYPE resolution_type AS ENUM (
      'budget',         -- Approbation budget prévisionnel
      'accounts',       -- Approbation des comptes
      'works',          -- Travaux (entretien, amélioration)
      'appointment',    -- Nomination (syndic, CS, etc.)
      'contract',       -- Contrat (renouvellement, résiliation)
      'rules',          -- Règlement de copropriété
      'other'           -- Autre
    );
  END IF;
END $$;

-- Type de majorité (Art. 24, 25, 25-1, 26, unanimité)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'majority_type') THEN
    CREATE TYPE majority_type AS ENUM (
      'art24',          -- Majorité simple des présents/représentés (Art. 24)
      'art25',          -- Majorité absolue de tous les copropriétaires (Art. 25)
      'art25_1',        -- Passerelle Art. 25-1 (second vote si > 1/3)
      'art26',          -- Double majorité (Art. 26)
      'art26_1',        -- Passerelle Art. 26-1 (second vote si > 1/2)
      'unanimity'       -- Unanimité (100% tantièmes)
    );
  END IF;
END $$;

-- Statut de résolution
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resolution_status') THEN
    CREATE TYPE resolution_status AS ENUM (
      'draft',          -- En préparation
      'pending',        -- Prête pour le vote
      'voting',         -- Vote en cours
      'voted',          -- Votée (résultat calculé)
      'approved',       -- Adoptée
      'rejected',       -- Rejetée
      'adjourned',      -- Ajournée (reportée)
      'withdrawn'       -- Retirée
    );
  END IF;
END $$;

-- Type de présence
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_type') THEN
    CREATE TYPE attendance_type AS ENUM (
      'present',        -- Présent physiquement
      'proxy',          -- Représenté par procuration
      'correspondence'  -- Vote par correspondance (Art. 17-1 A)
    );
  END IF;
END $$;

-- Direction du vote
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_direction') THEN
    CREATE TYPE vote_direction AS ENUM (
      'for',            -- Pour
      'against',        -- Contre
      'abstention'      -- Abstention
    );
  END IF;
END $$;

-- Source du vote
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vote_source') THEN
    CREATE TYPE vote_source AS ENUM (
      'live',           -- Vote en séance
      'correspondence'  -- Vote par correspondance préalable
    );
  END IF;
END $$;


-- ============================================
-- 1) TABLE ag_meetings - Assemblées Générales
-- ============================================

CREATE TABLE IF NOT EXISTS ag_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Informations générales
  title TEXT NOT NULL,
  meeting_type ag_meeting_type NOT NULL DEFAULT 'ordinary',
  meeting_date TIMESTAMPTZ NOT NULL,
  location TEXT,

  -- Convocation
  convocation_date TIMESTAMPTZ,  -- Date d'envoi des convocations
  convocation_deadline TIMESTAMPTZ GENERATED ALWAYS AS (meeting_date - INTERVAL '21 days') STORED,

  -- Statut et workflow
  status ag_status NOT NULL DEFAULT 'draft',
  quorum_required BOOLEAN NOT NULL DEFAULT true,

  -- Bureau de l'AG (désignés en début de séance)
  president_id UUID REFERENCES coproprietaires(id),
  president_name TEXT,  -- Nom si non copropriétaire
  secretary_id UUID REFERENCES profiles(id),  -- Souvent le syndic
  secretary_name TEXT,
  scrutineer1_id UUID REFERENCES coproprietaires(id),
  scrutineer1_name TEXT,
  scrutineer2_id UUID REFERENCES coproprietaires(id),
  scrutineer2_name TEXT,

  -- Session
  session_started_at TIMESTAMPTZ,
  session_ended_at TIMESTAMPTZ,

  -- Notes et incidents
  opening_notes TEXT,
  closing_notes TEXT,
  incidents TEXT,

  -- Lien vers PV archivé
  pv_document_id UUID REFERENCES documents(id),

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ag_meetings_copro ON ag_meetings(copro_id);
CREATE INDEX IF NOT EXISTS idx_ag_meetings_status ON ag_meetings(status);
CREATE INDEX IF NOT EXISTS idx_ag_meetings_date ON ag_meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_ag_meetings_copro_date ON ag_meetings(copro_id, meeting_date DESC);

COMMENT ON TABLE ag_meetings IS 'Assemblées Générales - Loi 65-557, Décret 67-223';
COMMENT ON COLUMN ag_meetings.convocation_deadline IS 'Délai minimum 21j avant AG (Art. 64 décret)';
COMMENT ON COLUMN ag_meetings.quorum_required IS 'Quorum requis pour valider l''AG';


-- ============================================
-- 2) TABLE ag_resolutions - Résolutions à voter
-- ============================================

CREATE TABLE IF NOT EXISTS ag_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Numéro d'ordre dans l'AG
  resolution_number INT NOT NULL,

  -- Contenu
  title TEXT NOT NULL,
  description TEXT,
  resolution_type resolution_type NOT NULL DEFAULT 'other',

  -- Majorité applicable
  majority_type majority_type NOT NULL DEFAULT 'art24',

  -- Liens optionnels vers budget/travaux
  linked_budget_id UUID REFERENCES budgets(id),
  linked_work_budget_id UUID REFERENCES budgets(id),

  -- Résultats du vote
  status resolution_status NOT NULL DEFAULT 'draft',

  -- Tantièmes votés
  tantiemes_for NUMERIC(15,2) DEFAULT 0,
  tantiemes_against NUMERIC(15,2) DEFAULT 0,
  tantiemes_abstention NUMERIC(15,2) DEFAULT 0,

  -- Nombre de votants
  voters_for INT DEFAULT 0,
  voters_against INT DEFAULT 0,
  voters_abstention INT DEFAULT 0,

  -- Seuil calculé et résultat
  threshold_tantiemes NUMERIC(15,2),  -- Seuil de tantièmes requis
  threshold_voters INT,                -- Seuil de votants requis (Art. 26)
  is_approved BOOLEAN,
  vote_details JSONB DEFAULT '{}'::jsonb,  -- Détails du calcul

  -- Passerelle Art. 25-1 / 26-1
  is_bridgeable BOOLEAN DEFAULT false,  -- Peut bénéficier de la passerelle
  bridge_vote_id UUID REFERENCES ag_resolutions(id),  -- Résolution de second vote

  -- Horodatage du vote
  voted_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(ag_id, resolution_number)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ag_resolutions_ag ON ag_resolutions(ag_id);
CREATE INDEX IF NOT EXISTS idx_ag_resolutions_status ON ag_resolutions(status);
CREATE INDEX IF NOT EXISTS idx_ag_resolutions_majority ON ag_resolutions(majority_type);
CREATE INDEX IF NOT EXISTS idx_ag_resolutions_copro ON ag_resolutions(copro_id);

COMMENT ON TABLE ag_resolutions IS 'Résolutions d''AG avec type de majorité - Art. 24/25/26 loi 65-557';
COMMENT ON COLUMN ag_resolutions.majority_type IS 'Type de majorité applicable (Art. 24, 25, 25-1, 26, unanimité)';
COMMENT ON COLUMN ag_resolutions.is_bridgeable IS 'Si true et rejeté, peut bénéficier d''un second vote (Art. 25-1 ou 26-1)';


-- ============================================
-- 3) TABLE ag_attendance - Feuille de présence
-- ============================================

CREATE TABLE IF NOT EXISTS ag_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id),

  -- Lots représentés (peut avoir plusieurs lots)
  lot_ids UUID[] NOT NULL DEFAULT '{}',

  -- Tantièmes représentés (somme des lots)
  tantiemes NUMERIC(15,2) NOT NULL DEFAULT 0,

  -- Type de présence
  presence_type attendance_type NOT NULL DEFAULT 'present',

  -- Si représenté (proxy)
  represented_by_id UUID REFERENCES coproprietaires(id),  -- Mandataire copropriétaire
  represented_by_name TEXT,  -- Nom du mandataire si externe
  proxy_document_id UUID REFERENCES documents(id),  -- Pouvoir signé

  -- Signature de la feuille de présence
  signed BOOLEAN NOT NULL DEFAULT false,
  signed_at TIMESTAMPTZ,
  signature_data TEXT,  -- Données de signature (base64 ou référence)

  -- Heure d'arrivée/départ (pour présents)
  arrived_at TIMESTAMPTZ,
  left_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un copropriétaire ne peut être enregistré qu'une fois par AG
  UNIQUE(ag_id, coproprietaire_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ag_attendance_ag ON ag_attendance(ag_id);
CREATE INDEX IF NOT EXISTS idx_ag_attendance_copro ON ag_attendance(coproprietaire_id);
CREATE INDEX IF NOT EXISTS idx_ag_attendance_type ON ag_attendance(presence_type);
CREATE INDEX IF NOT EXISTS idx_ag_attendance_copro_id ON ag_attendance(copro_id);

COMMENT ON TABLE ag_attendance IS 'Feuille de présence AG - Art. 14 décret 67-223';
COMMENT ON COLUMN ag_attendance.tantiemes IS 'Total tantièmes généraux des lots représentés';
COMMENT ON COLUMN ag_attendance.presence_type IS 'Type: présent, représenté (proxy), vote par correspondance';


-- ============================================
-- 4) TABLE ag_votes - Votes par résolution
-- ============================================

CREATE TABLE IF NOT EXISTS ag_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resolution_id UUID NOT NULL REFERENCES ag_resolutions(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id),

  -- Sens du vote
  vote vote_direction NOT NULL,

  -- Tantièmes exprimés
  tantiemes NUMERIC(15,2) NOT NULL,

  -- Source du vote
  vote_source vote_source NOT NULL DEFAULT 'live',

  -- Si conflit d'intérêt détecté (ne peut pas voter)
  is_excluded BOOLEAN DEFAULT false,
  exclusion_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un copropriétaire ne peut voter qu'une fois par résolution
  UNIQUE(resolution_id, coproprietaire_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ag_votes_resolution ON ag_votes(resolution_id);
CREATE INDEX IF NOT EXISTS idx_ag_votes_coproprietaire ON ag_votes(coproprietaire_id);
CREATE INDEX IF NOT EXISTS idx_ag_votes_vote ON ag_votes(vote);
CREATE INDEX IF NOT EXISTS idx_ag_votes_copro ON ag_votes(copro_id);

COMMENT ON TABLE ag_votes IS 'Votes individuels par résolution - Art. 17 décret 67-223';
COMMENT ON COLUMN ag_votes.is_excluded IS 'Exclu du vote (conflit d''intérêt, ex: Art. 22 travaux sur partie privative)';


-- ============================================
-- 5) TABLE ag_correspondence_votes - Formulaires votes par correspondance
-- ============================================

CREATE TABLE IF NOT EXISTS ag_correspondence_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id),

  -- Document du formulaire signé
  form_document_id UUID REFERENCES documents(id),

  -- Statut
  received_at TIMESTAMPTZ,
  validated BOOLEAN DEFAULT false,
  validated_by UUID REFERENCES profiles(id),
  validated_at TIMESTAMPTZ,

  -- Intégration dans la session
  integrated_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(ag_id, coproprietaire_id)
);

COMMENT ON TABLE ag_correspondence_votes IS 'Formulaires de vote par correspondance - Art. 17-1 A loi 65-557';


-- ============================================
-- 6) FONCTIONS DE CALCUL
-- ============================================

-- A) Fonction: Calculer le quorum d'une AG
CREATE OR REPLACE FUNCTION compute_ag_quorum(p_ag_id UUID)
RETURNS TABLE (
  total_tantiemes NUMERIC,
  present_tantiemes NUMERIC,
  quorum_ratio NUMERIC,
  is_quorum_reached BOOLEAN,
  attendees_count INT,
  present_count INT,
  proxy_count INT,
  correspondence_count INT
) AS $$
BEGIN
  RETURN QUERY
  WITH copro_info AS (
    SELECT
      m.copro_id,
      COALESCE(SUM(l.tantiemes_generaux), 0) AS total_tantiemes
    FROM ag_meetings m
    JOIN lots l ON l.copro_id = m.copro_id
    WHERE m.id = p_ag_id
    GROUP BY m.copro_id
  ),
  attendance_stats AS (
    SELECT
      COALESCE(SUM(a.tantiemes), 0) AS present_tantiemes,
      COUNT(*) AS attendees_count,
      COUNT(*) FILTER (WHERE a.presence_type = 'present') AS present_count,
      COUNT(*) FILTER (WHERE a.presence_type = 'proxy') AS proxy_count,
      COUNT(*) FILTER (WHERE a.presence_type = 'correspondence') AS correspondence_count
    FROM ag_attendance a
    WHERE a.ag_id = p_ag_id
  )
  SELECT
    ci.total_tantiemes::NUMERIC,
    ast.present_tantiemes::NUMERIC,
    CASE WHEN ci.total_tantiemes > 0
      THEN ROUND((ast.present_tantiemes / ci.total_tantiemes * 100), 2)
      ELSE 0
    END::NUMERIC AS quorum_ratio,
    -- Pas de quorum minimum légal en copropriété, mais on retourne la donnée
    (ast.present_tantiemes > 0)::BOOLEAN AS is_quorum_reached,
    ast.attendees_count::INT,
    ast.present_count::INT,
    ast.proxy_count::INT,
    ast.correspondence_count::INT
  FROM copro_info ci
  CROSS JOIN attendance_stats ast;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION compute_ag_quorum IS 'Calcule le quorum d''une AG (tantièmes présents/représentés/correspondance)';


-- B) Fonction: Calculer le seuil de majorité selon le type
CREATE OR REPLACE FUNCTION compute_majority_threshold(
  p_majority_type majority_type,
  p_total_tantiemes NUMERIC,
  p_present_tantiemes NUMERIC,
  p_total_owners INT,
  p_present_owners INT
)
RETURNS TABLE (
  threshold_tantiemes NUMERIC,
  threshold_owners INT,
  description TEXT
) AS $$
BEGIN
  CASE p_majority_type
    -- Article 24: Majorité simple des présents/représentés
    WHEN 'art24' THEN
      RETURN QUERY SELECT
        FLOOR(p_present_tantiemes / 2) + 1,
        NULL::INT,
        'Majorité simple des présents/représentés (Art. 24)';

    -- Article 25: Majorité absolue de tous les copropriétaires
    WHEN 'art25' THEN
      RETURN QUERY SELECT
        FLOOR(p_total_tantiemes / 2) + 1,
        NULL::INT,
        'Majorité absolue de tous les tantièmes (Art. 25)';

    -- Article 25-1: Second vote après échec Art. 25 si > 1/3 des voix
    WHEN 'art25_1' THEN
      RETURN QUERY SELECT
        FLOOR(p_present_tantiemes / 2) + 1,
        NULL::INT,
        'Passerelle Art. 25-1: majorité simple après échec Art. 25 avec > 1/3';

    -- Article 26: Double majorité (2/3 tantièmes + majorité copropriétaires)
    WHEN 'art26' THEN
      RETURN QUERY SELECT
        FLOOR(p_total_tantiemes * 2 / 3) + 1,
        FLOOR(p_total_owners / 2) + 1,
        'Double majorité: 2/3 tantièmes + majorité copropriétaires (Art. 26)';

    -- Article 26-1: Second vote après échec Art. 26 si > 1/2 des voix
    WHEN 'art26_1' THEN
      RETURN QUERY SELECT
        FLOOR(p_total_tantiemes / 2) + 1,
        NULL::INT,
        'Passerelle Art. 26-1: majorité absolue après échec Art. 26 avec > 1/2';

    -- Unanimité
    WHEN 'unanimity' THEN
      RETURN QUERY SELECT
        p_total_tantiemes,
        p_total_owners,
        'Unanimité: 100% des tantièmes (aliénation parties communes)';

    ELSE
      RETURN QUERY SELECT
        FLOOR(p_present_tantiemes / 2) + 1,
        NULL::INT,
        'Majorité par défaut (Art. 24)';
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION compute_majority_threshold IS 'Calcule les seuils de majorité selon l''article applicable';


-- C) Fonction principale: Calculer le résultat d'une résolution
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

  -- 4. Agréger les votes (hors exclusions)
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

  -- 7. Mettre à jour la résolution
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
      'bridge_threshold', v_bridge_threshold
    ),
    voted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_resolution_id;

  -- 8. Construire le résultat
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

COMMENT ON FUNCTION calculate_resolution_result IS 'Calcule le résultat d''une résolution selon les règles de majorité françaises';


-- ============================================
-- 7) TRIGGERS
-- ============================================

-- A) Trigger: Mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION trg_ag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ag_meetings_updated ON ag_meetings;
CREATE TRIGGER trg_ag_meetings_updated
  BEFORE UPDATE ON ag_meetings
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_updated_at();

DROP TRIGGER IF EXISTS trg_ag_resolutions_updated ON ag_resolutions;
CREATE TRIGGER trg_ag_resolutions_updated
  BEFORE UPDATE ON ag_resolutions
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_updated_at();

DROP TRIGGER IF EXISTS trg_ag_attendance_updated ON ag_attendance;
CREATE TRIGGER trg_ag_attendance_updated
  BEFORE UPDATE ON ag_attendance
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_updated_at();


-- B) Trigger: Calculer automatiquement les tantièmes lors de l'inscription présence
CREATE OR REPLACE FUNCTION trg_ag_attendance_calc_tantiemes()
RETURNS TRIGGER AS $$
DECLARE
  v_total_tantiemes NUMERIC := 0;
BEGIN
  -- Calculer la somme des tantièmes des lots représentés
  SELECT COALESCE(SUM(l.tantiemes_generaux), 0)
  INTO v_total_tantiemes
  FROM lots l
  WHERE l.id = ANY(NEW.lot_ids);

  NEW.tantiemes := v_total_tantiemes;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ag_attendance_tantiemes ON ag_attendance;
CREATE TRIGGER trg_ag_attendance_tantiemes
  BEFORE INSERT OR UPDATE OF lot_ids ON ag_attendance
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_attendance_calc_tantiemes();


-- C) Trigger: Empêcher double vote
CREATE OR REPLACE FUNCTION trg_ag_vote_check_duplicate()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier que le copropriétaire est bien présent/représenté
  IF NOT EXISTS (
    SELECT 1 FROM ag_attendance a
    JOIN ag_resolutions r ON r.ag_id = a.ag_id
    WHERE r.id = NEW.resolution_id
      AND a.coproprietaire_id = NEW.coproprietaire_id
  ) THEN
    RAISE EXCEPTION 'Coproprietaire % is not registered for attendance at this AG', NEW.coproprietaire_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ag_vote_check ON ag_votes;
CREATE TRIGGER trg_ag_vote_check
  BEFORE INSERT ON ag_votes
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_vote_check_duplicate();


-- ============================================
-- 8) VUES
-- ============================================

-- A) Vue: Liste des AG avec statistiques
CREATE OR REPLACE VIEW v_ag_overview AS
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

  -- Bureau
  m.president_name,
  m.secretary_name,

  -- Stats de présence
  q.total_tantiemes,
  q.present_tantiemes,
  q.quorum_ratio,
  q.attendees_count,
  q.present_count,
  q.proxy_count,
  q.correspondence_count,

  -- Stats résolutions
  (SELECT COUNT(*) FROM ag_resolutions WHERE ag_id = m.id) AS resolutions_count,
  (SELECT COUNT(*) FROM ag_resolutions WHERE ag_id = m.id AND status = 'approved') AS approved_count,
  (SELECT COUNT(*) FROM ag_resolutions WHERE ag_id = m.id AND status = 'rejected') AS rejected_count,

  -- Audit
  m.created_at,
  m.created_by,
  p.full_name AS created_by_name

FROM ag_meetings m
JOIN copros c ON c.id = m.copro_id
LEFT JOIN profiles p ON p.id = m.created_by
LEFT JOIN LATERAL compute_ag_quorum(m.id) q ON true;

ALTER VIEW v_ag_overview SET (security_invoker = true);

COMMENT ON VIEW v_ag_overview IS 'Vue synthétique des AG avec statistiques de présence et résolutions';


-- B) Vue: Résolutions avec résultats
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
  r.created_at

FROM ag_resolutions r
JOIN ag_meetings m ON m.id = r.ag_id
ORDER BY r.ag_id, r.resolution_number;

ALTER VIEW v_ag_resolutions_results SET (security_invoker = true);

COMMENT ON VIEW v_ag_resolutions_results IS 'Résolutions avec calculs de résultat et pourcentages';


-- C) Vue: Feuille de présence détaillée
CREATE OR REPLACE VIEW v_ag_attendance_summary AS
SELECT
  a.id,
  a.ag_id,
  m.title AS ag_title,
  m.meeting_date AS ag_date,
  a.copro_id,

  a.coproprietaire_id,
  CASE WHEN cp.is_company THEN cp.company_name
    ELSE CONCAT(cp.civility, ' ', cp.first_name, ' ', cp.last_name)
  END AS owner_name,
  cp.email AS owner_email,

  a.lot_ids,
  (SELECT array_agg(l.ref) FROM lots l WHERE l.id = ANY(a.lot_ids)) AS lot_refs,
  a.tantiemes,

  a.presence_type,
  a.represented_by_name,

  a.signed,
  a.signed_at,
  a.arrived_at,
  a.left_at,

  a.created_at

FROM ag_attendance a
JOIN ag_meetings m ON m.id = a.ag_id
JOIN coproprietaires cp ON cp.id = a.coproprietaire_id
ORDER BY a.ag_id, cp.last_name, cp.first_name;

ALTER VIEW v_ag_attendance_summary SET (security_invoker = true);

COMMENT ON VIEW v_ag_attendance_summary IS 'Feuille de présence détaillée avec noms et lots';


-- D) Vue: Détail des votes pour audit
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

  v.vote,
  v.tantiemes,
  v.vote_source,
  v.is_excluded,
  v.exclusion_reason,

  v.created_at

FROM ag_votes v
JOIN ag_resolutions r ON r.id = v.resolution_id
JOIN ag_meetings m ON m.id = r.ag_id
JOIN coproprietaires cp ON cp.id = v.coproprietaire_id
ORDER BY m.meeting_date DESC, r.resolution_number, cp.last_name;

ALTER VIEW v_ag_votes_detailed SET (security_invoker = true);

COMMENT ON VIEW v_ag_votes_detailed IS 'Détail des votes par résolution pour audit et PV';


-- ============================================
-- 9) RLS POLICIES
-- ============================================

-- Activer RLS
ALTER TABLE ag_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_correspondence_votes ENABLE ROW LEVEL SECURITY;

-- ag_meetings: SELECT pour tous les membres
CREATE POLICY "Users can view AG of their copros"
ON ag_meetings FOR SELECT
USING (user_has_copro_access(copro_id));

-- ag_meetings: INSERT/UPDATE/DELETE pour gestionnaires
CREATE POLICY "Only managers can create AG"
ON ag_meetings FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can update AG"
ON ag_meetings FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can delete AG"
ON ag_meetings FOR DELETE
USING (user_is_copro_manager(copro_id));

-- ag_resolutions: SELECT pour tous les membres
CREATE POLICY "Users can view resolutions of their copros"
ON ag_resolutions FOR SELECT
USING (user_has_copro_access(copro_id));

-- ag_resolutions: INSERT/UPDATE/DELETE pour gestionnaires
CREATE POLICY "Only managers can manage resolutions"
ON ag_resolutions FOR ALL
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

-- ag_attendance: SELECT pour tous les membres
CREATE POLICY "Users can view attendance of their copros"
ON ag_attendance FOR SELECT
USING (user_has_copro_access(copro_id));

-- ag_attendance: INSERT/UPDATE/DELETE pour gestionnaires
CREATE POLICY "Only managers can manage attendance"
ON ag_attendance FOR ALL
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

-- ag_votes: SELECT pour tous les membres
CREATE POLICY "Users can view votes of their copros"
ON ag_votes FOR SELECT
USING (user_has_copro_access(copro_id));

-- ag_votes: INSERT pour gestionnaires OU copropriétaire votant pour lui-même
CREATE POLICY "Managers can insert any vote"
ON ag_votes FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

-- ag_votes: UPDATE/DELETE pour gestionnaires uniquement
CREATE POLICY "Only managers can update votes"
ON ag_votes FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can delete votes"
ON ag_votes FOR DELETE
USING (user_is_copro_manager(copro_id));

-- ag_correspondence_votes: policies similaires
CREATE POLICY "Users can view correspondence votes"
ON ag_correspondence_votes FOR SELECT
USING (user_has_copro_access(copro_id));

CREATE POLICY "Only managers can manage correspondence votes"
ON ag_correspondence_votes FOR ALL
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));


-- ============================================
-- 10) FONCTIONS UTILITAIRES SUPPLÉMENTAIRES
-- ============================================

-- Fonction: Créer une AG avec les 14 résolutions ordinaires standard
CREATE OR REPLACE FUNCTION create_ag_with_standard_resolutions(
  p_copro_id UUID,
  p_title TEXT,
  p_meeting_date TIMESTAMPTZ,
  p_location TEXT DEFAULT NULL,
  p_meeting_type ag_meeting_type DEFAULT 'ordinary'
)
RETURNS JSONB AS $$
DECLARE
  v_ag_id UUID;
  v_resolution_num INT := 1;
BEGIN
  -- 1. Créer l'AG
  INSERT INTO ag_meetings (copro_id, title, meeting_date, location, meeting_type, created_by)
  VALUES (p_copro_id, p_title, p_meeting_date, p_location, p_meeting_type, auth.uid())
  RETURNING id INTO v_ag_id;

  -- 2. Créer les résolutions standard pour une AG ordinaire
  IF p_meeting_type IN ('ordinary', 'mixed') THEN
    -- Résolution 1: Désignation du bureau
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Désignation du président de séance',
            'Désignation du président de séance, du secrétaire et des scrutateurs', 'art24', 'appointment');
    v_resolution_num := v_resolution_num + 1;

    -- Résolution 2: Approbation des comptes
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Approbation des comptes de l''exercice clos',
            'Approbation des comptes de gestion de l''exercice écoulé', 'art24', 'accounts');
    v_resolution_num := v_resolution_num + 1;

    -- Résolution 3: Quitus au syndic
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Quitus au syndic pour sa gestion',
            'Donner quitus au syndic pour sa gestion au cours de l''exercice écoulé', 'art24', 'other');
    v_resolution_num := v_resolution_num + 1;

    -- Résolution 4: Approbation du budget prévisionnel
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Approbation du budget prévisionnel',
            'Approbation du budget prévisionnel pour l''exercice à venir', 'art24', 'budget');
    v_resolution_num := v_resolution_num + 1;

    -- Résolution 5: Cotisation fonds travaux ALUR
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Cotisation au fonds de travaux ALUR',
            'Fixation de la cotisation annuelle au fonds de travaux (Art. 14-2 loi 65-557)', 'art24', 'budget');
    v_resolution_num := v_resolution_num + 1;

    -- Résolution 6: Renouvellement contrat syndic
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Renouvellement du contrat de syndic',
            'Renouvellement du contrat de syndic pour une durée de 3 ans', 'art25', 'contract');
    v_resolution_num := v_resolution_num + 1;

    -- Résolution 7: Élection/renouvellement conseil syndical
    INSERT INTO ag_resolutions (ag_id, copro_id, resolution_number, title, description, majority_type, resolution_type)
    VALUES (v_ag_id, p_copro_id, v_resolution_num, 'Élection des membres du conseil syndical',
            'Élection ou renouvellement des membres du conseil syndical', 'art24', 'appointment');
    v_resolution_num := v_resolution_num + 1;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'ag_id', v_ag_id,
    'resolutions_created', v_resolution_num - 1
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_ag_with_standard_resolutions IS 'Crée une AG avec les résolutions ordinaires standards';


-- Fonction: Enregistrer un vote (avec vérifications)
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

  -- 2. Vérifier que l'AG est en cours
  IF v_resolution.ag_status != 'in_progress' THEN
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

  -- 5. Vérifier s'il n'a pas déjà voté
  SELECT * INTO v_existing_vote
  FROM ag_votes
  WHERE resolution_id = p_resolution_id
    AND coproprietaire_id = p_coproprietaire_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Coproprietaire has already voted',
      'existing_vote', v_existing_vote.vote
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
    'vote', p_vote
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cast_vote IS 'Enregistre un vote avec vérifications (présence, doublon, AG en cours)';


-- Fonction: Clôturer une AG (calculer tous les résultats)
CREATE OR REPLACE FUNCTION close_ag(p_ag_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_ag RECORD;
  v_resolution RECORD;
  v_results JSONB := '[]'::jsonb;
  v_result JSONB;
BEGIN
  -- 1. Vérifier l'AG
  SELECT * INTO v_ag FROM ag_meetings WHERE id = p_ag_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG not found');
  END IF;

  IF v_ag.status != 'in_progress' THEN
    RETURN jsonb_build_object('success', false, 'error', 'AG is not in progress');
  END IF;

  -- 2. Calculer les résultats de toutes les résolutions non encore calculées
  FOR v_resolution IN
    SELECT * FROM ag_resolutions
    WHERE ag_id = p_ag_id
      AND status IN ('pending', 'voting')
    ORDER BY resolution_number
  LOOP
    v_result := calculate_resolution_result(v_resolution.id);
    v_results := v_results || jsonb_build_object(
      'resolution_number', v_resolution.resolution_number,
      'title', v_resolution.title,
      'result', v_result
    );
  END LOOP;

  -- 3. Mettre à jour le statut de l'AG
  UPDATE ag_meetings
  SET
    status = 'closed',
    session_ended_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ag_id;

  RETURN jsonb_build_object(
    'success', true,
    'ag_id', p_ag_id,
    'closed_at', NOW(),
    'resolutions_calculated', jsonb_array_length(v_results),
    'results', v_results
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION close_ag IS 'Clôture une AG: calcule tous les résultats et met à jour le statut';


-- ============================================
-- 11) COMMENTS FINAUX
-- ============================================

COMMENT ON COLUMN ag_resolutions.majority_type IS '
  Art. 24: Majorité simple des présents/représentés (décisions courantes)
  Art. 25: Majorité absolue de tous les copropriétaires (travaux amélioration)
  Art. 25-1: Passerelle - second vote à majorité simple si > 1/3 au premier vote
  Art. 26: Double majorité 2/3 tantièmes + majorité copros (actes disposition)
  Art. 26-1: Passerelle - second vote à majorité absolue si > 1/2 au premier vote
  Unanimité: 100% tantièmes (aliénation parties communes)
';

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
