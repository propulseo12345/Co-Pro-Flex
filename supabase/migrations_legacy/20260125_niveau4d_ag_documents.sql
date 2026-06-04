-- ============================================
-- Migration: NIVEAU 4D - DOCUMENTS AG (GED Integration)
-- Date: 2026-01-25
-- Description: Tables documents, ag_documents pour génération PDF (convocation, présence, PV)
-- Référentiel légal: Art. 9, 11, 14, 15, 17, 64 décret 67-223
-- Conservation: 10 ans minimum (Art. 33 décret 67-223)
-- Dépendances: copros, ag_meetings, storage bucket "ged"
-- ============================================

-- ============================================
-- 0) TYPES ENUM
-- ============================================

-- Type de document
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_type') THEN
    CREATE TYPE document_type AS ENUM (
      'pv_ag',              -- Procès-verbal AG
      'convocation',        -- Convocation AG
      'attendance_sheet',   -- Feuille de présence
      'budget',             -- Budget prévisionnel
      'accounts',           -- Comptes annuels
      'contract',           -- Contrat
      'invoice',            -- Facture
      'quote',              -- Devis
      'correspondence',     -- Correspondance
      'diagnostic',         -- Diagnostic (DPE, amiante, etc.)
      'regulation',         -- Règlement de copropriété
      'etat_date',          -- État daté
      'other'               -- Autre
    );
  END IF;
END $$;

-- Type de document AG spécifique
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ag_document_type') THEN
    CREATE TYPE ag_document_type AS ENUM (
      'convocation',        -- Convocation AG (Art. 9, 64 décret)
      'attendance_sheet',   -- Feuille de présence (Art. 14, 15 décret)
      'pv'                  -- Procès-verbal (Art. 17 décret)
    );
  END IF;
END $$;


-- ============================================
-- 1) TABLE documents - GED Générale
-- ============================================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,

  -- Informations du document
  name TEXT NOT NULL,
  description TEXT,
  document_type document_type NOT NULL DEFAULT 'other',

  -- Stockage
  storage_path TEXT NOT NULL,  -- Chemin dans le bucket: ged/{copro_id}/...
  file_name TEXT NOT NULL,     -- Nom du fichier original
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  file_size BIGINT,            -- Taille en octets

  -- Métadonnées
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Version et archivage
  version INT NOT NULL DEFAULT 1,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  retention_until TIMESTAMPTZ,  -- Date de fin de conservation obligatoire

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_documents_copro ON documents(copro_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_storage ON documents(storage_path);
CREATE INDEX IF NOT EXISTS idx_documents_archived ON documents(is_archived) WHERE is_archived = false;

COMMENT ON TABLE documents IS 'Gestion Électronique de Documents (GED) - Tous documents copropriété';
COMMENT ON COLUMN documents.storage_path IS 'Chemin dans le bucket Supabase Storage (ged/{copro_id}/...)';
COMMENT ON COLUMN documents.retention_until IS 'Date minimale de conservation (10 ans pour PV AG - Art. 33 décret)';


-- ============================================
-- 2) TABLE ag_documents - Documents AG spécifiques
-- ============================================

CREATE TABLE IF NOT EXISTS ag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  ag_id UUID NOT NULL REFERENCES ag_meetings(id) ON DELETE CASCADE,

  -- Type de document AG
  doc_type ag_document_type NOT NULL,

  -- Lien vers document GED (optionnel, créé après stockage)
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Stockage direct
  storage_path TEXT NOT NULL,  -- ged/{copro_id}/ag/{ag_id}/{doc_type}.pdf
  file_name TEXT NOT NULL,
  file_size BIGINT,

  -- Statut de génération
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES profiles(id),

  -- Version (si régénéré)
  version INT NOT NULL DEFAULT 1,

  -- Métadonnées de génération
  generation_metadata JSONB DEFAULT '{}'::jsonb,  -- Infos sur les données utilisées

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_ag_documents_copro ON ag_documents(copro_id);
CREATE INDEX IF NOT EXISTS idx_ag_documents_ag ON ag_documents(ag_id);
CREATE INDEX IF NOT EXISTS idx_ag_documents_type ON ag_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_ag_documents_ag_type ON ag_documents(ag_id, doc_type);

-- Contrainte: un seul document actif par type par AG (la dernière version)
-- (On garde l'historique mais on peut identifier la dernière)

COMMENT ON TABLE ag_documents IS 'Documents générés pour les AG (convocation, présence, PV)';
COMMENT ON COLUMN ag_documents.storage_path IS 'Convention: ged/{copro_id}/ag/{ag_id}/{doc_type}.pdf';
COMMENT ON COLUMN ag_documents.generation_metadata IS 'Données de génération (nb résolutions, nb présents, etc.)';


-- ============================================
-- 3) TRIGGERS
-- ============================================

-- A) Trigger: Mise à jour automatique de updated_at pour documents
CREATE OR REPLACE FUNCTION trg_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated ON documents;
CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trg_documents_updated_at();


-- B) Trigger: Créer automatiquement le document GED lors de l'insertion ag_document
CREATE OR REPLACE FUNCTION trg_ag_documents_create_ged_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_document_id UUID;
  v_document_type document_type;
  v_name TEXT;
  v_retention DATE;
BEGIN
  -- Mapper le type AG vers le type document
  v_document_type := CASE NEW.doc_type
    WHEN 'convocation' THEN 'convocation'::document_type
    WHEN 'attendance_sheet' THEN 'other'::document_type  -- Pas de type spécifique
    WHEN 'pv' THEN 'pv_ag'::document_type
  END;

  -- Générer le nom
  v_name := CASE NEW.doc_type
    WHEN 'convocation' THEN 'Convocation AG'
    WHEN 'attendance_sheet' THEN 'Feuille de présence AG'
    WHEN 'pv' THEN 'Procès-verbal AG'
  END;

  -- Conservation 10 ans pour tous les documents AG (Art. 33 décret)
  v_retention := (CURRENT_DATE + INTERVAL '10 years')::DATE;

  -- Créer l'entrée dans documents
  INSERT INTO documents (
    copro_id,
    name,
    document_type,
    storage_path,
    file_name,
    mime_type,
    file_size,
    retention_until,
    created_by
  ) VALUES (
    NEW.copro_id,
    v_name,
    v_document_type,
    NEW.storage_path,
    NEW.file_name,
    'application/pdf',
    NEW.file_size,
    v_retention,
    NEW.generated_by
  )
  RETURNING id INTO v_document_id;

  -- Mettre à jour ag_documents avec le lien
  NEW.document_id := v_document_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ag_documents_ged ON ag_documents;
CREATE TRIGGER trg_ag_documents_ged
  BEFORE INSERT ON ag_documents
  FOR EACH ROW
  EXECUTE FUNCTION trg_ag_documents_create_ged_entry();


-- ============================================
-- 4) VUES
-- ============================================

-- A) Vue: Documents AG avec infos complètes
CREATE OR REPLACE VIEW v_ag_documents AS
SELECT
  ad.id,
  ad.copro_id,
  ad.ag_id,
  m.title AS ag_title,
  m.meeting_date AS ag_date,
  m.status AS ag_status,

  ad.doc_type,
  ad.storage_path,
  ad.file_name,
  ad.file_size,
  ad.version,

  ad.generated_at,
  ad.generated_by,
  p.full_name AS generated_by_name,

  ad.generation_metadata,

  -- Lien document GED
  ad.document_id,
  d.name AS document_name,
  d.retention_until

FROM ag_documents ad
JOIN ag_meetings m ON m.id = ad.ag_id
LEFT JOIN profiles p ON p.id = ad.generated_by
LEFT JOIN documents d ON d.id = ad.document_id;

ALTER VIEW v_ag_documents SET (security_invoker = true);

COMMENT ON VIEW v_ag_documents IS 'Documents AG avec métadonnées complètes';


-- B) Vue: Documents par copropriété avec catégories
CREATE OR REPLACE VIEW v_documents_by_copro AS
SELECT
  d.id,
  d.copro_id,
  c.name AS copro_name,
  d.name,
  d.description,
  d.document_type,
  d.storage_path,
  d.file_name,
  d.mime_type,
  d.file_size,
  d.tags,
  d.version,
  d.is_archived,
  d.retention_until,
  d.created_by,
  p.full_name AS created_by_name,
  d.created_at,
  d.updated_at
FROM documents d
JOIN copros c ON c.id = d.copro_id
LEFT JOIN profiles p ON p.id = d.created_by
WHERE d.is_archived = false
ORDER BY d.created_at DESC;

ALTER VIEW v_documents_by_copro SET (security_invoker = true);


-- ============================================
-- 5) RLS POLICIES
-- ============================================

-- Activer RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ag_documents ENABLE ROW LEVEL SECURITY;

-- documents: SELECT pour tous les membres
CREATE POLICY "Users can view documents of their copros"
ON documents FOR SELECT
USING (user_has_copro_access(copro_id));

-- documents: INSERT/UPDATE/DELETE pour gestionnaires
CREATE POLICY "Only managers can create documents"
ON documents FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can update documents"
ON documents FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can delete documents"
ON documents FOR DELETE
USING (user_is_copro_manager(copro_id));

-- ag_documents: SELECT pour tous les membres
CREATE POLICY "Users can view AG documents of their copros"
ON ag_documents FOR SELECT
USING (user_has_copro_access(copro_id));

-- ag_documents: INSERT/UPDATE/DELETE pour gestionnaires
CREATE POLICY "Only managers can create AG documents"
ON ag_documents FOR INSERT
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can update AG documents"
ON ag_documents FOR UPDATE
USING (user_is_copro_manager(copro_id))
WITH CHECK (user_is_copro_manager(copro_id));

CREATE POLICY "Only managers can delete AG documents"
ON ag_documents FOR DELETE
USING (user_is_copro_manager(copro_id));


-- ============================================
-- 6) FONCTIONS UTILITAIRES
-- ============================================

-- A) Fonction: Obtenir le dernier document AG par type
CREATE OR REPLACE FUNCTION get_latest_ag_document(
  p_ag_id UUID,
  p_doc_type ag_document_type
)
RETURNS TABLE (
  id UUID,
  storage_path TEXT,
  file_name TEXT,
  version INT,
  generated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ad.id,
    ad.storage_path,
    ad.file_name,
    ad.version,
    ad.generated_at
  FROM ag_documents ad
  WHERE ad.ag_id = p_ag_id
    AND ad.doc_type = p_doc_type
  ORDER BY ad.version DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER;

COMMENT ON FUNCTION get_latest_ag_document IS 'Récupère le dernier document AG généré pour un type donné';


-- B) Fonction: Enregistrer un nouveau document AG
CREATE OR REPLACE FUNCTION register_ag_document(
  p_copro_id UUID,
  p_ag_id UUID,
  p_doc_type ag_document_type,
  p_storage_path TEXT,
  p_file_name TEXT,
  p_file_size BIGINT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_existing RECORD;
  v_new_version INT := 1;
  v_ag_doc_id UUID;
BEGIN
  -- Vérifier s'il existe déjà une version
  SELECT * INTO v_existing
  FROM ag_documents
  WHERE ag_id = p_ag_id
    AND doc_type = p_doc_type
  ORDER BY version DESC
  LIMIT 1;

  IF FOUND THEN
    v_new_version := v_existing.version + 1;
  END IF;

  -- Insérer le nouveau document
  INSERT INTO ag_documents (
    copro_id,
    ag_id,
    doc_type,
    storage_path,
    file_name,
    file_size,
    version,
    generation_metadata,
    generated_by
  ) VALUES (
    p_copro_id,
    p_ag_id,
    p_doc_type,
    p_storage_path,
    p_file_name,
    p_file_size,
    v_new_version,
    p_metadata,
    auth.uid()
  )
  RETURNING id INTO v_ag_doc_id;

  RETURN jsonb_build_object(
    'success', true,
    'ag_document_id', v_ag_doc_id,
    'version', v_new_version,
    'storage_path', p_storage_path
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_ag_document IS 'Enregistre un document AG avec versioning automatique';


-- C) Fonction: Générer le chemin de stockage standard
CREATE OR REPLACE FUNCTION generate_ag_document_path(
  p_copro_id UUID,
  p_ag_id UUID,
  p_doc_type ag_document_type
)
RETURNS TEXT AS $$
BEGIN
  RETURN format('ged/%s/ag/%s/%s.pdf', p_copro_id, p_ag_id, p_doc_type);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION generate_ag_document_path IS 'Génère le chemin de stockage standard pour un document AG';


-- ============================================
-- 7) STORAGE BUCKET POLICY (à exécuter manuellement si pas déjà fait)
-- ============================================
-- Note: Ces commandes doivent être exécutées via l'interface Supabase
-- ou avec les permissions appropriées

/*
-- Créer le bucket GED s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ged',
  'ged',
  false,  -- Bucket privé
  52428800,  -- 50MB max
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Lecture pour membres de la copro
CREATE POLICY "Users can read their copro documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ged' AND
  user_has_copro_access(
    (string_to_array(name, '/'))[2]::uuid  -- Extrait copro_id du path
  )
);

-- Policy: Upload pour gestionnaires
CREATE POLICY "Managers can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ged' AND
  user_is_copro_manager(
    (string_to_array(name, '/'))[2]::uuid
  )
);

-- Policy: Delete pour gestionnaires
CREATE POLICY "Managers can delete documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ged' AND
  user_is_copro_manager(
    (string_to_array(name, '/'))[2]::uuid
  )
);
*/


-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
