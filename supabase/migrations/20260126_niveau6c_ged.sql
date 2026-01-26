-- ============================================================================
-- NIVEAU 6C : GED - Gestion Électronique de Documents
-- CoProFlex - Migration Complète
-- Date: 2026-01-26
-- ============================================================================

-- ============================================================================
-- 1) ENUMS
-- ============================================================================

DO $$ BEGIN
  ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'ordre_service';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'correspondance';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'carnet_entretien';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE document_category ADD VALUE IF NOT EXISTS 'fiche_synthetique';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_confidentiality AS ENUM ('public', 'council', 'manager', 'restricted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_source AS ENUM ('ag', 'finance', 'maintenance', 'communication', 'legal', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM ('draft', 'active', 'archived', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2) TABLES
-- ============================================================================

-- Table document_folders
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  copro_id UUID NOT NULL REFERENCES copros(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  category_default document_category,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(copro_id, parent_id, name)
);

CREATE INDEX IF NOT EXISTS idx_document_folders_copro ON document_folders(copro_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent ON document_folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_hierarchy ON document_folders(copro_id, parent_id, sort_order);

-- Extensions table documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status document_status DEFAULT 'active';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confidentiality document_confidentiality DEFAULT 'public';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source_module document_source DEFAULT 'manual';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ag_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS resolution_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS service_order_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mutation_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS dossier_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS retention_years INTEGER DEFAULT 10;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiration_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS deletion_blocked BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES documents(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_current_version BOOLEAN DEFAULT true;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_text TSVECTOR;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_confidentiality ON documents(copro_id, confidentiality);
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(search_text);

-- Table document_versions
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id);

-- Table document_access
CREATE TABLE IF NOT EXISTS document_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  coproprietaire_id UUID REFERENCES coproprietaires(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_download BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  CHECK (user_id IS NOT NULL OR coproprietaire_id IS NOT NULL OR lot_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_document_access_document ON document_access(document_id);

-- Table document_links
CREATE TABLE IF NOT EXISTS document_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  link_type TEXT DEFAULT 'related',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  UNIQUE(document_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_document_links_document ON document_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_links_entity ON document_links(entity_type, entity_id);

-- ============================================================================
-- 3) FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_document_expiration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.retention_years IS NULL THEN
    NEW.retention_years := CASE NEW.category
      WHEN 'pv_ag' THEN 10
      WHEN 'convocation' THEN 10
      WHEN 'reglement' THEN 0
      WHEN 'contrat' THEN 15
      WHEN 'facture' THEN 10
      WHEN 'diagnostic' THEN 10
      WHEN 'plan' THEN 0
      ELSE 5
    END;
  END IF;

  IF NEW.retention_years > 0 THEN
    NEW.expiration_date := (COALESCE(NEW.document_date, NEW.created_at::DATE) + (NEW.retention_years || ' years')::INTERVAL)::DATE;
  END IF;

  IF NEW.category IN ('pv_ag', 'reglement', 'contrat', 'diagnostic', 'plan') THEN
    NEW.deletion_blocked := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_expiration ON documents;
CREATE TRIGGER trg_document_expiration
  BEFORE INSERT OR UPDATE OF category, retention_years, document_date ON documents
  FOR EACH ROW EXECUTE FUNCTION calculate_document_expiration();

CREATE OR REPLACE FUNCTION update_document_search_text()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_text := to_tsvector('french',
    COALESCE(NEW.file_name, '') || ' ' ||
    COALESCE(NEW.title, '') || ' ' ||
    COALESCE(NEW.description, '') || ' ' ||
    COALESCE(array_to_string(NEW.tags, ' '), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_search_text ON documents;
CREATE TRIGGER trg_document_search_text
  BEFORE INSERT OR UPDATE OF file_name, title, description, tags ON documents
  FOR EACH ROW EXECUTE FUNCTION update_document_search_text();

CREATE OR REPLACE FUNCTION generate_document_path(
  p_copro_id UUID,
  p_category document_category,
  p_year INTEGER DEFAULT NULL,
  p_file_name TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_year INTEGER;
  v_path TEXT;
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);
  v_path := 'ged/' || p_copro_id::TEXT || '/' || p_category::TEXT || '/' || v_year::TEXT;
  IF p_file_name IS NOT NULL THEN
    v_path := v_path || '/' || p_file_name;
  END IF;
  RETURN v_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION create_document_system_folders(p_copro_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_folder_id UUID;
BEGIN
  INSERT INTO document_folders (copro_id, name, icon, color, sort_order, is_system, category_default, created_by)
  VALUES
    (p_copro_id, 'Assemblées Générales', 'Users', '#3B82F6', 1, true, 'pv_ag', p_user_id),
    (p_copro_id, 'Documents Légaux', 'Scale', '#8B5CF6', 2, true, 'reglement', p_user_id),
    (p_copro_id, 'Contrats', 'FileSignature', '#10B981', 3, true, 'contrat', p_user_id),
    (p_copro_id, 'Factures & Devis', 'Receipt', '#F59E0B', 4, true, 'facture', p_user_id),
    (p_copro_id, 'Diagnostics', 'ClipboardCheck', '#EF4444', 5, true, 'diagnostic', p_user_id),
    (p_copro_id, 'Plans', 'Map', '#06B6D4', 6, true, 'plan', p_user_id),
    (p_copro_id, 'Correspondances', 'Mail', '#EC4899', 7, true, 'correspondance', p_user_id),
    (p_copro_id, 'Maintenance', 'Wrench', '#F97316', 8, true, 'ordre_service', p_user_id),
    (p_copro_id, 'Comptabilité', 'Calculator', '#6366F1', 9, true, 'budget', p_user_id),
    (p_copro_id, 'Photos', 'Image', '#84CC16', 10, true, 'photo', p_user_id)
  ON CONFLICT (copro_id, parent_id, name) DO NOTHING;

  SELECT id INTO v_folder_id FROM document_folders WHERE copro_id = p_copro_id AND name = 'Assemblées Générales' AND parent_id IS NULL;
  IF v_folder_id IS NOT NULL THEN
    INSERT INTO document_folders (copro_id, parent_id, name, sort_order, is_system, category_default, created_by)
    VALUES
      (p_copro_id, v_folder_id, '2026', 1, true, 'pv_ag', p_user_id),
      (p_copro_id, v_folder_id, '2025', 2, true, 'pv_ag', p_user_id),
      (p_copro_id, v_folder_id, '2024', 3, true, 'pv_ag', p_user_id),
      (p_copro_id, v_folder_id, 'Archives', 10, true, 'pv_ag', p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_folder_id FROM document_folders WHERE copro_id = p_copro_id AND name = 'Contrats' AND parent_id IS NULL;
  IF v_folder_id IS NOT NULL THEN
    INSERT INTO document_folders (copro_id, parent_id, name, sort_order, is_system, category_default, created_by)
    VALUES
      (p_copro_id, v_folder_id, 'Assurances', 1, true, 'assurance', p_user_id),
      (p_copro_id, v_folder_id, 'Syndic', 2, true, 'contrat', p_user_id),
      (p_copro_id, v_folder_id, 'Maintenance', 3, true, 'contrat', p_user_id),
      (p_copro_id, v_folder_id, 'Prestataires', 4, true, 'contrat', p_user_id),
      (p_copro_id, v_folder_id, 'Travaux', 5, true, 'contrat', p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_folder_id FROM document_folders WHERE copro_id = p_copro_id AND name = 'Factures & Devis' AND parent_id IS NULL;
  IF v_folder_id IS NOT NULL THEN
    INSERT INTO document_folders (copro_id, parent_id, name, sort_order, is_system, category_default, created_by)
    VALUES
      (p_copro_id, v_folder_id, '2026', 1, true, 'facture', p_user_id),
      (p_copro_id, v_folder_id, '2025', 2, true, 'facture', p_user_id),
      (p_copro_id, v_folder_id, 'Devis en cours', 10, true, 'devis', p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  SELECT id INTO v_folder_id FROM document_folders WHERE copro_id = p_copro_id AND name = 'Comptabilité' AND parent_id IS NULL;
  IF v_folder_id IS NOT NULL THEN
    INSERT INTO document_folders (copro_id, parent_id, name, sort_order, is_system, category_default, created_by)
    VALUES
      (p_copro_id, v_folder_id, 'Budgets', 1, true, 'budget', p_user_id),
      (p_copro_id, v_folder_id, 'Appels de Fonds', 2, true, 'appel_fonds', p_user_id),
      (p_copro_id, v_folder_id, 'États des Charges', 3, true, 'releve_charges', p_user_id),
      (p_copro_id, v_folder_id, 'États Datés', 4, true, 'etat_date', p_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_protected_document_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.deletion_blocked = true THEN
    IF OLD.expiration_date IS NULL OR OLD.expiration_date > CURRENT_DATE THEN
      RAISE EXCEPTION 'Ce document est protégé et ne peut pas être supprimé avant sa date d''expiration';
    END IF;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_document_deletion ON documents;
CREATE TRIGGER trg_prevent_document_deletion
  BEFORE DELETE ON documents
  FOR EACH ROW EXECUTE FUNCTION prevent_protected_document_deletion();

-- ============================================================================
-- 4) RLS POLICIES
-- ============================================================================

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "folders_select_members" ON document_folders
  FOR SELECT USING (copro_id IN (SELECT copro_id FROM memberships WHERE user_id = auth.uid()));

CREATE POLICY "folders_insert_managers" ON document_folders
  FOR INSERT WITH CHECK (copro_id IN (SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('gestionnaire', 'admin')));

CREATE POLICY "folders_update_managers" ON document_folders
  FOR UPDATE USING (NOT is_system AND copro_id IN (SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('gestionnaire', 'admin')));

CREATE POLICY "folders_delete_managers" ON document_folders
  FOR DELETE USING (NOT is_system AND copro_id IN (SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('gestionnaire', 'admin')));

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versions_select_via_document" ON document_versions
  FOR SELECT USING (document_id IN (SELECT id FROM documents));

ALTER TABLE document_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "access_select_managers" ON document_access
  FOR SELECT USING (
    document_id IN (SELECT id FROM documents WHERE copro_id IN (SELECT copro_id FROM memberships WHERE user_id = auth.uid() AND role IN ('gestionnaire', 'admin')))
    OR user_id = auth.uid()
  );

ALTER TABLE document_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links_select_via_document" ON document_links
  FOR SELECT USING (document_id IN (SELECT id FROM documents));

-- ============================================================================
-- 5) VIEWS (security_invoker=true)
-- ============================================================================

CREATE VIEW v_documents_with_folder WITH (security_invoker = true) AS
SELECT d.*, f.name as folder_name, f.icon as folder_icon, f.color as folder_color,
       pf.name as parent_folder_name, c.name as copro_name
FROM documents d
LEFT JOIN document_folders f ON f.id = d.folder_id
LEFT JOIN document_folders pf ON pf.id = f.parent_id
LEFT JOIN copros c ON c.id = d.copro_id;

CREATE VIEW v_folders_with_counts WITH (security_invoker = true) AS
SELECT f.*, pf.name as parent_name,
  (SELECT COUNT(*) FROM documents d WHERE d.folder_id = f.id AND d.status = 'active') as document_count,
  (SELECT COUNT(*) FROM document_folders sf WHERE sf.parent_id = f.id) as subfolder_count
FROM document_folders f
LEFT JOIN document_folders pf ON pf.id = f.parent_id;

CREATE VIEW v_recent_documents WITH (security_invoker = true) AS
SELECT d.id, d.copro_id, d.file_name, d.title, d.category, d.file_size, d.mime_type,
       d.confidentiality, d.folder_id, f.name as folder_name, d.created_at, d.created_by,
       p.full_name as created_by_name
FROM documents d
LEFT JOIN document_folders f ON f.id = d.folder_id
LEFT JOIN profiles p ON p.id = d.created_by
WHERE d.status = 'active' AND d.is_current_version = true
ORDER BY d.created_at DESC;

CREATE VIEW v_documents_stats WITH (security_invoker = true) AS
SELECT d.copro_id, COUNT(*) as total_documents,
  COUNT(*) FILTER (WHERE d.category = 'pv_ag') as pv_ag_count,
  COUNT(*) FILTER (WHERE d.category = 'contrat') as contrat_count,
  COUNT(*) FILTER (WHERE d.category = 'facture') as facture_count,
  COUNT(*) FILTER (WHERE d.category = 'diagnostic') as diagnostic_count,
  COUNT(*) FILTER (WHERE d.status = 'active') as active_count,
  COUNT(*) FILTER (WHERE d.status = 'archived') as archived_count,
  COUNT(*) FILTER (WHERE d.expiration_date IS NOT NULL AND d.expiration_date <= CURRENT_DATE + INTERVAL '30 days') as expiring_soon_count,
  SUM(d.file_size) as total_size_bytes,
  MAX(d.created_at) as last_document_date
FROM documents d WHERE d.is_current_version = true GROUP BY d.copro_id;

CREATE VIEW v_documents_expiring WITH (security_invoker = true) AS
SELECT d.*, f.name as folder_name, d.expiration_date - CURRENT_DATE as days_until_expiration
FROM documents d
LEFT JOIN document_folders f ON f.id = d.folder_id
WHERE d.status = 'active' AND d.expiration_date IS NOT NULL AND d.expiration_date <= CURRENT_DATE + INTERVAL '90 days'
ORDER BY d.expiration_date ASC;

CREATE VIEW v_documents_by_category WITH (security_invoker = true) AS
SELECT d.copro_id, d.category, COUNT(*) as count, SUM(d.file_size) as total_size, MAX(d.created_at) as last_added
FROM documents d WHERE d.status = 'active' AND d.is_current_version = true
GROUP BY d.copro_id, d.category;

CREATE VIEW v_document_versions WITH (security_invoker = true) AS
SELECT dv.*, d.title as document_title, d.category as document_category, p.full_name as created_by_name
FROM document_versions dv
JOIN documents d ON d.id = dv.document_id
LEFT JOIN profiles p ON p.id = dv.created_by
ORDER BY dv.document_id, dv.version_number DESC;
