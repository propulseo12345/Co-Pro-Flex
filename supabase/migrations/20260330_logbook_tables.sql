-- ============================================================================
-- MIGRATION: Tables carnet d'entretien (logbook)
-- Remplace les données mock par des tables Supabase structurées
-- ============================================================================

-- ============================================================================
-- 1. ALTER TABLE copros — Ajout colonnes informations complémentaires
-- ============================================================================

ALTER TABLE copros
  ADD COLUMN IF NOT EXISTS construction_year INT NULL,
  ADD COLUMN IF NOT EXISTS buildings_count INT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lots_count INT NULL,
  ADD COLUMN IF NOT EXISTS total_tantiemes INT NULL;

COMMENT ON COLUMN copros.construction_year IS 'Année de construction de l''immeuble';
COMMENT ON COLUMN copros.buildings_count IS 'Nombre de bâtiments dans la copropriété';
COMMENT ON COLUMN copros.lots_count IS 'Nombre total de lots (privatifs + communs)';
COMMENT ON COLUMN copros.total_tantiemes IS 'Total des tantièmes de la copropriété';

-- ============================================================================
-- 2. CREATE TABLE technical_documents — Documents techniques obligatoires
-- (DTA, DPE, diagnostics, contrôles réglementaires)
-- ============================================================================

CREATE TYPE technical_doc_type AS ENUM (
  'dta',                    -- Dossier Technique Amiante
  'dpe_collectif',          -- DPE collectif
  'diagnostic_plomb',       -- Diagnostic plomb parties communes
  'diagnostic_electricite', -- Diagnostic électrique
  'diagnostic_gaz',         -- Diagnostic gaz
  'carnet_entretien',       -- Carnet d'entretien (document lui-même)
  'controle_ascenseur',     -- Contrôle technique ascenseur
  'controle_chaufferie',    -- Contrôle annuel chaufferie
  'controle_incendie',      -- Vérification installations incendie
  'controle_jeux',          -- Contrôle aires de jeux
  'garantie_decennale',     -- Garantie décennale travaux
  'garantie_biennale',      -- Garantie biennale équipements
  'plan_copropriete',       -- Plans de l''immeuble
  'reglement_copropriete',  -- Règlement de copropriété
  'etat_descriptif',        -- État descriptif de division
  'ppt',                    -- Plan Pluriannuel de Travaux
  'dtg',                    -- Diagnostic Technique Global
  'audit_energetique',      -- Audit énergétique
  'autre'
);

CREATE TABLE technical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Identification
  name TEXT NOT NULL,
  doc_type technical_doc_type NOT NULL,

  -- Dates
  added_date DATE NOT NULL DEFAULT CURRENT_DATE,
  validity_date DATE NULL,  -- NULL = pas d'expiration

  -- Lien GED (document physique)
  document_id UUID NULL REFERENCES documents(id),
  storage_path TEXT NULL,

  -- Observations
  observations TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES profiles(id)
);

-- Index
CREATE INDEX idx_technical_documents_copro ON technical_documents(copro_id);
CREATE INDEX idx_technical_documents_type ON technical_documents(copro_id, doc_type);
CREATE INDEX idx_technical_documents_validity ON technical_documents(copro_id, validity_date)
  WHERE validity_date IS NOT NULL;

COMMENT ON TABLE technical_documents IS
  'Documents techniques obligatoires du carnet d''entretien (Art. 18 loi 65-557). DTA, diagnostics, contrôles réglementaires.';

-- RLS
ALTER TABLE technical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "technical_documents_select"
  ON technical_documents FOR SELECT
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "technical_documents_insert"
  ON technical_documents FOR INSERT
  WITH CHECK (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

CREATE POLICY "technical_documents_update"
  ON technical_documents FOR UPDATE
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

CREATE POLICY "technical_documents_delete"
  ON technical_documents FOR DELETE
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

-- ============================================================================
-- 3. CREATE TABLE planned_works — Travaux prévisionnels / PPT
-- ============================================================================

CREATE TYPE planned_work_type AS ENUM (
  'facade',
  'toiture',
  'etancheite',
  'chauffage',
  'ascenseur',
  'electricite',
  'plomberie',
  'espaces_verts',
  'securite_incendie',
  'accessibilite',
  'isolation',
  'menuiserie',
  'parking',
  'autre'
);

CREATE TYPE planned_work_status AS ENUM (
  'identified',    -- Identifié (besoin repéré)
  'planned',       -- Prévu (inscrit au PPT)
  'voted',         -- Voté en AG
  'in_progress',   -- En cours de réalisation
  'completed',     -- Terminé
  'cancelled'      -- Annulé
);

CREATE TYPE work_priority AS ENUM (
  'urgent',
  'high',
  'medium',
  'low'
);

CREATE TABLE planned_works (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Identification
  title TEXT NOT NULL,
  description TEXT NULL,
  work_type planned_work_type NOT NULL,

  -- Dates
  planned_date DATE NULL,        -- Date prévisionnelle de réalisation
  vote_date DATE NULL,           -- Date de vote en AG
  completion_date DATE NULL,     -- Date de réalisation effective

  -- Montants
  estimated_amount NUMERIC(12,2) NULL,
  voted_amount NUMERIC(12,2) NULL,
  actual_amount NUMERIC(12,2) NULL,

  -- Statut et priorité
  status planned_work_status NOT NULL DEFAULT 'identified',
  priority work_priority NOT NULL DEFAULT 'medium',

  -- PPT (Plan Pluriannuel de Travaux)
  from_ppt BOOLEAN NOT NULL DEFAULT false,
  ppt_year INT NULL,  -- Année dans le PPT

  -- Liens
  ag_id UUID NULL,           -- AG où le vote a eu lieu
  resolution_id UUID NULL,   -- Résolution de vote
  budget_line_id UUID NULL REFERENCES budget_lines(id),

  -- Observations
  observations TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES profiles(id)
);

-- Index
CREATE INDEX idx_planned_works_copro ON planned_works(copro_id);
CREATE INDEX idx_planned_works_status ON planned_works(copro_id, status);
CREATE INDEX idx_planned_works_ppt ON planned_works(copro_id, from_ppt) WHERE from_ppt = true;

COMMENT ON TABLE planned_works IS
  'Travaux prévisionnels et Plan Pluriannuel de Travaux (PPT, Art. 14-2 loi 65-557). Suivi du cycle identification → vote → réalisation.';

-- RLS
ALTER TABLE planned_works ENABLE ROW LEVEL SECURITY;

CREATE POLICY "planned_works_select"
  ON planned_works FOR SELECT
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "planned_works_insert"
  ON planned_works FOR INSERT
  WITH CHECK (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

CREATE POLICY "planned_works_update"
  ON planned_works FOR UPDATE
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

CREATE POLICY "planned_works_delete"
  ON planned_works FOR DELETE
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

-- ============================================================================
-- 4. CREATE TABLE insurance_policies — Détails assurance copropriété
-- Liée à contracts (contract_type = 'assurance')
-- ============================================================================

CREATE TYPE insurance_sub_type AS ENUM (
  'mri',              -- Multirisque Immeuble (obligatoire)
  'rc_syndicat',      -- Responsabilité Civile Syndicat
  'do',               -- Dommages-Ouvrage
  'pj',               -- Protection Juridique
  'rc_mandataires',   -- RC Mandataires sociaux (CS)
  'pno',              -- Propriétaire Non Occupant
  'autre'
);

CREATE TABLE insurance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Identification assurance
  sub_type insurance_sub_type NOT NULL,
  policy_number TEXT NOT NULL,
  insurer_name TEXT NOT NULL,

  -- Montants
  annual_premium NUMERIC(12,2) NOT NULL,
  deductible NUMERIC(12,2) NULL DEFAULT 0,

  -- Garanties (array PostgreSQL — pas JSONB)
  guarantees TEXT[] NOT NULL DEFAULT '{}',

  -- Spécifique Dommages-Ouvrage
  related_works TEXT NULL,
  works_reception_date DATE NULL,

  -- Observations
  observations TEXT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_insurance_policies_copro ON insurance_policies(copro_id);
CREATE INDEX idx_insurance_policies_contract ON insurance_policies(contract_id);
CREATE INDEX idx_insurance_policies_type ON insurance_policies(copro_id, sub_type);

COMMENT ON TABLE insurance_policies IS
  'Détails des polices d''assurance copropriété. Liée à contracts (contract_type = assurance). Données réglementaires (Art. 18 loi 65-557).';

-- RLS (hérite de la même logique que contracts)
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_policies_select"
  ON insurance_policies FOR SELECT
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid()
  ));

CREATE POLICY "insurance_policies_insert"
  ON insurance_policies FOR INSERT
  WITH CHECK (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

CREATE POLICY "insurance_policies_update"
  ON insurance_policies FOR UPDATE
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

CREATE POLICY "insurance_policies_delete"
  ON insurance_policies FOR DELETE
  USING (copro_id IN (
    SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('admin', 'gestionnaire')
  ));

-- ============================================================================
-- 5. TRIGGER updated_at automatique
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ne créer les triggers que si pas déjà existants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_technical_documents_updated_at') THEN
    CREATE TRIGGER trg_technical_documents_updated_at
      BEFORE UPDATE ON technical_documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_planned_works_updated_at') THEN
    CREATE TRIGGER trg_planned_works_updated_at
      BEFORE UPDATE ON planned_works
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_insurance_policies_updated_at') THEN
    CREATE TRIGGER trg_insurance_policies_updated_at
      BEFORE UPDATE ON insurance_policies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
