-- ============================================
-- Migration: Création des tables Conseil Syndical
-- Date: 2024-12-31
-- Description: Tables pour la gestion du CS et de ses rapports d'activité
-- ============================================

-- Table conseil_syndical
CREATE TABLE IF NOT EXISTS conseil_syndical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,
  nombre_membres_statutaire INTEGER DEFAULT 3,
  date_debut_mandat DATE,
  date_fin_mandat DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(copropriete_id)
);

-- Table membres_conseil_syndical
CREATE TABLE IF NOT EXISTS membres_conseil_syndical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conseil_syndical_id UUID NOT NULL REFERENCES conseil_syndical(id) ON DELETE CASCADE,
  coproprietaire_id UUID NOT NULL REFERENCES coproprietaires(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'membre' CHECK (role IN ('president', 'secretaire', 'tresorier', 'membre')),
  date_debut_mandat DATE NOT NULL,
  date_fin_mandat DATE,
  est_actif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(conseil_syndical_id, coproprietaire_id)
);

-- Table rapports_activite_cs
CREATE TABLE IF NOT EXISTS rapports_activite_cs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conseil_syndical_id UUID NOT NULL REFERENCES conseil_syndical(id) ON DELETE CASCADE,
  copropriete_id UUID NOT NULL REFERENCES coproprietes(id) ON DELETE CASCADE,

  periode_debut DATE NOT NULL,
  periode_fin DATE NOT NULL,

  titre VARCHAR(255) NOT NULL,
  introduction TEXT,
  contenu TEXT,
  contenu_brut TEXT,

  statut VARCHAR(20) NOT NULL DEFAULT 'brouillon'
    CHECK (statut IN ('brouillon', 'en_revision', 'valide', 'publie', 'archive')),

  ag_id UUID REFERENCES ag(id) ON DELETE SET NULL,
  resolution_id UUID REFERENCES resolutions(id) ON DELETE SET NULL,

  valide_par UUID REFERENCES membres_conseil_syndical(id),
  date_validation TIMESTAMPTZ,

  auteur_id UUID NOT NULL REFERENCES membres_conseil_syndical(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table sections_rapport_cs
CREATE TABLE IF NOT EXISTS sections_rapport_cs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id UUID NOT NULL REFERENCES rapports_activite_cs(id) ON DELETE CASCADE,
  ordre INTEGER NOT NULL,
  titre VARCHAR(255) NOT NULL,
  contenu TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table annexes_rapport_cs
CREATE TABLE IF NOT EXISTS annexes_rapport_cs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id UUID NOT NULL REFERENCES rapports_activite_cs(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('document', 'image', 'tableau')),
  fichier_url TEXT,
  fichier_nom VARCHAR(255),
  fichier_taille INTEGER,
  contenu_integre TEXT,
  ordre INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table commentaires_rapport_cs (pour la révision collaborative)
CREATE TABLE IF NOT EXISTS commentaires_rapport_cs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rapport_id UUID NOT NULL REFERENCES rapports_activite_cs(id) ON DELETE CASCADE,
  auteur_id UUID NOT NULL REFERENCES membres_conseil_syndical(id) ON DELETE CASCADE,
  contenu TEXT NOT NULL,
  section_id UUID REFERENCES sections_rapport_cs(id) ON DELETE SET NULL,
  resolu BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Index pour les recherches
-- ============================================
CREATE INDEX IF NOT EXISTS idx_conseil_syndical_copropriete ON conseil_syndical(copropriete_id);
CREATE INDEX IF NOT EXISTS idx_membres_cs_conseil ON membres_conseil_syndical(conseil_syndical_id);
CREATE INDEX IF NOT EXISTS idx_membres_cs_coproprietaire ON membres_conseil_syndical(coproprietaire_id);
CREATE INDEX IF NOT EXISTS idx_membres_cs_actif ON membres_conseil_syndical(est_actif);
CREATE INDEX IF NOT EXISTS idx_rapports_cs_copropriete ON rapports_activite_cs(copropriete_id);
CREATE INDEX IF NOT EXISTS idx_rapports_cs_statut ON rapports_activite_cs(statut);
CREATE INDEX IF NOT EXISTS idx_rapports_cs_ag ON rapports_activite_cs(ag_id);
CREATE INDEX IF NOT EXISTS idx_rapports_cs_conseil ON rapports_activite_cs(conseil_syndical_id);
CREATE INDEX IF NOT EXISTS idx_sections_rapport ON sections_rapport_cs(rapport_id);
CREATE INDEX IF NOT EXISTS idx_annexes_rapport ON annexes_rapport_cs(rapport_id);
CREATE INDEX IF NOT EXISTS idx_commentaires_rapport ON commentaires_rapport_cs(rapport_id);

-- ============================================
-- Triggers pour updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conseil_syndical_updated_at
  BEFORE UPDATE ON conseil_syndical
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_membres_cs_updated_at
  BEFORE UPDATE ON membres_conseil_syndical
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rapports_cs_updated_at
  BEFORE UPDATE ON rapports_activite_cs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sections_rapport_cs_updated_at
  BEFORE UPDATE ON sections_rapport_cs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commentaires_rapport_cs_updated_at
  BEFORE UPDATE ON commentaires_rapport_cs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE conseil_syndical ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_conseil_syndical ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_activite_cs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections_rapport_cs ENABLE ROW LEVEL SECURITY;
ALTER TABLE annexes_rapport_cs ENABLE ROW LEVEL SECURITY;
ALTER TABLE commentaires_rapport_cs ENABLE ROW LEVEL SECURITY;

-- Les membres du CS peuvent voir et gérer leur conseil syndical
CREATE POLICY "Membres CS peuvent voir leur conseil"
ON conseil_syndical
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membres_conseil_syndical m
    WHERE m.conseil_syndical_id = conseil_syndical.id
    AND m.coproprietaire_id = auth.uid()
    AND m.est_actif = TRUE
  )
);

-- Les membres du CS peuvent voir les autres membres
CREATE POLICY "Membres CS peuvent voir les membres"
ON membres_conseil_syndical
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM membres_conseil_syndical m2
    WHERE m2.conseil_syndical_id = membres_conseil_syndical.conseil_syndical_id
    AND m2.coproprietaire_id = auth.uid()
    AND m2.est_actif = TRUE
  )
);

-- Les membres du CS peuvent gérer leurs rapports
CREATE POLICY "Membres CS peuvent gérer leurs rapports"
ON rapports_activite_cs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM membres_conseil_syndical m
    WHERE m.conseil_syndical_id = rapports_activite_cs.conseil_syndical_id
    AND m.coproprietaire_id = auth.uid()
    AND m.est_actif = TRUE
  )
);

-- Les copropriétaires peuvent voir les rapports publiés
CREATE POLICY "Copropriétaires peuvent voir rapports publiés"
ON rapports_activite_cs
FOR SELECT
USING (
  statut = 'publie'
  AND EXISTS (
    SELECT 1 FROM coproprietaires c
    WHERE c.copropriete_id = rapports_activite_cs.copropriete_id
    AND c.id = auth.uid()
  )
);

-- Les membres du CS peuvent gérer les sections
CREATE POLICY "Membres CS peuvent gérer les sections"
ON sections_rapport_cs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rapports_activite_cs r
    JOIN membres_conseil_syndical m ON m.conseil_syndical_id = r.conseil_syndical_id
    WHERE r.id = sections_rapport_cs.rapport_id
    AND m.coproprietaire_id = auth.uid()
    AND m.est_actif = TRUE
  )
);

-- Les membres du CS peuvent gérer les annexes
CREATE POLICY "Membres CS peuvent gérer les annexes"
ON annexes_rapport_cs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rapports_activite_cs r
    JOIN membres_conseil_syndical m ON m.conseil_syndical_id = r.conseil_syndical_id
    WHERE r.id = annexes_rapport_cs.rapport_id
    AND m.coproprietaire_id = auth.uid()
    AND m.est_actif = TRUE
  )
);

-- Les membres du CS peuvent gérer les commentaires
CREATE POLICY "Membres CS peuvent gérer les commentaires"
ON commentaires_rapport_cs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM rapports_activite_cs r
    JOIN membres_conseil_syndical m ON m.conseil_syndical_id = r.conseil_syndical_id
    WHERE r.id = commentaires_rapport_cs.rapport_id
    AND m.coproprietaire_id = auth.uid()
    AND m.est_actif = TRUE
  )
);
