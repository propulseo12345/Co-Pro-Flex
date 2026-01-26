-- ============================================================================
-- NIVEAU 6C : GED - Seed Data
-- CoProFlex - Données de test réalistes
-- Date: 2026-01-26
-- ============================================================================

-- Utilise les copros existantes du seed niveau 2d
-- copro1: Résidence Les Jardins (Paris 15)
-- copro2: Le Clos des Lilas (Lyon 6)

DO $$
DECLARE
  v_copro1_id UUID;
  v_copro2_id UUID;
  v_user_id UUID;
  -- Folders copro1
  v_folder_ag1 UUID;
  v_folder_ag1_2026 UUID;
  v_folder_ag1_2025 UUID;
  v_folder_legal1 UUID;
  v_folder_contracts1 UUID;
  v_folder_contracts1_assur UUID;
  v_folder_contracts1_maint UUID;
  v_folder_invoices1 UUID;
  v_folder_invoices1_2026 UUID;
  v_folder_diagnostics1 UUID;
  v_folder_maint1 UUID;
  v_folder_compta1 UUID;
  -- Folders copro2
  v_folder_ag2 UUID;
  v_folder_contracts2 UUID;
  v_folder_invoices2 UUID;
BEGIN
  -- Récupérer les IDs des copros
  SELECT id INTO v_copro1_id FROM copros WHERE name ILIKE '%Jardins%' LIMIT 1;
  SELECT id INTO v_copro2_id FROM copros WHERE name ILIKE '%Lilas%' LIMIT 1;
  SELECT id INTO v_user_id FROM profiles LIMIT 1;

  IF v_copro1_id IS NULL OR v_copro2_id IS NULL THEN
    RAISE NOTICE 'Copros non trouvées, seed ignoré';
    RETURN;
  END IF;

  RAISE NOTICE 'Création des dossiers système pour copro1: %', v_copro1_id;
  PERFORM create_document_system_folders(v_copro1_id, v_user_id);

  RAISE NOTICE 'Création des dossiers système pour copro2: %', v_copro2_id;
  PERFORM create_document_system_folders(v_copro2_id, v_user_id);

  -- Récupérer les IDs des dossiers créés
  SELECT id INTO v_folder_ag1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Assemblées Générales' AND parent_id IS NULL;
  SELECT id INTO v_folder_ag1_2026 FROM document_folders WHERE copro_id = v_copro1_id AND name = '2026' AND parent_id = v_folder_ag1;
  SELECT id INTO v_folder_ag1_2025 FROM document_folders WHERE copro_id = v_copro1_id AND name = '2025' AND parent_id = v_folder_ag1;
  SELECT id INTO v_folder_legal1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Documents Légaux' AND parent_id IS NULL;
  SELECT id INTO v_folder_contracts1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Contrats' AND parent_id IS NULL;
  SELECT id INTO v_folder_contracts1_assur FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Assurances' AND parent_id = v_folder_contracts1;
  SELECT id INTO v_folder_contracts1_maint FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Maintenance' AND parent_id = v_folder_contracts1;
  SELECT id INTO v_folder_invoices1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Factures & Devis' AND parent_id IS NULL;
  SELECT id INTO v_folder_invoices1_2026 FROM document_folders WHERE copro_id = v_copro1_id AND name = '2026' AND parent_id = v_folder_invoices1;
  SELECT id INTO v_folder_diagnostics1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Diagnostics' AND parent_id IS NULL;
  SELECT id INTO v_folder_maint1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Maintenance' AND parent_id IS NULL;
  SELECT id INTO v_folder_compta1 FROM document_folders WHERE copro_id = v_copro1_id AND name = 'Comptabilité' AND parent_id IS NULL;

  SELECT id INTO v_folder_ag2 FROM document_folders WHERE copro_id = v_copro2_id AND name = 'Assemblées Générales' AND parent_id IS NULL;
  SELECT id INTO v_folder_contracts2 FROM document_folders WHERE copro_id = v_copro2_id AND name = 'Contrats' AND parent_id IS NULL;
  SELECT id INTO v_folder_invoices2 FROM document_folders WHERE copro_id = v_copro2_id AND name = 'Factures & Devis' AND parent_id IS NULL;

  -- ============================================================================
  -- DOCUMENTS COPRO 1 - Résidence Les Jardins
  -- ============================================================================

  -- PV AG 2025
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_ag1_2025, 'PV_AG_2025_06_15.pdf', 'ged/' || v_copro1_id || '/pv_ag/2025/PV_AG_2025_06_15.pdf', 524288, 'application/pdf', 'pv_ag', 'Procès-verbal AG Ordinaire 2025', 'AG ordinaire annuelle - Approbation des comptes 2024', ARRAY['ag', 'pv', '2025', 'comptes'], '2025-06-15', 'public', 'ag', 10, v_user_id),
  (v_copro1_id, v_folder_ag1_2025, 'Convocation_AG_2025.pdf', 'ged/' || v_copro1_id || '/convocation/2025/Convocation_AG_2025.pdf', 256000, 'application/pdf', 'convocation', 'Convocation AG Ordinaire 2025', 'Convocation avec ordre du jour et projets de résolutions', ARRAY['ag', 'convocation', '2025'], '2025-05-15', 'public', 'ag', 10, v_user_id),
  (v_copro1_id, v_folder_ag1_2025, 'Feuille_presence_AG_2025.pdf', 'ged/' || v_copro1_id || '/pv_ag/2025/Feuille_presence_AG_2025.pdf', 128000, 'application/pdf', 'pv_ag', 'Feuille de présence AG 2025', 'Emargement des copropriétaires présents et représentés', ARRAY['ag', 'presence', '2025'], '2025-06-15', 'manager', 'ag', 10, v_user_id);

  -- Convocation AG 2026 (à venir)
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, status, created_by)
  VALUES
  (v_copro1_id, v_folder_ag1_2026, 'Projet_convocation_AG_2026.pdf', 'ged/' || v_copro1_id || '/convocation/2026/Projet_convocation_AG_2026.pdf', 312000, 'application/pdf', 'convocation', 'Projet convocation AG 2026', 'Brouillon de convocation pour AG du 20/06/2026', ARRAY['ag', 'convocation', '2026', 'brouillon'], '2026-01-20', 'manager', 'ag', 'draft', v_user_id);

  -- Documents légaux
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_legal1, 'Reglement_copropriete.pdf', 'ged/' || v_copro1_id || '/reglement/Reglement_copropriete.pdf', 2097152, 'application/pdf', 'reglement', 'Règlement de copropriété', 'Règlement initial de la copropriété - Version originale 1985', ARRAY['reglement', 'legal', 'fondateur'], '1985-03-10', 'public', 'manual', 0, v_user_id),
  (v_copro1_id, v_folder_legal1, 'Modificatif_1_2018.pdf', 'ged/' || v_copro1_id || '/reglement/Modificatif_1_2018.pdf', 524288, 'application/pdf', 'reglement', 'Modificatif n°1 au règlement', 'Mise en conformité loi ELAN - Parties communes', ARRAY['reglement', 'modificatif', '2018', 'elan'], '2018-11-20', 'public', 'ag', 0, v_user_id),
  (v_copro1_id, v_folder_legal1, 'EDD_Etat_descriptif_division.pdf', 'ged/' || v_copro1_id || '/reglement/EDD_Etat_descriptif_division.pdf', 1048576, 'application/pdf', 'reglement', 'État descriptif de division', 'EDD avec répartition des tantièmes', ARRAY['edd', 'tantiemes', 'legal'], '1985-03-10', 'public', 'manual', 0, v_user_id),
  (v_copro1_id, v_folder_legal1, 'Fiche_synthetique_2026.pdf', 'ged/' || v_copro1_id || '/fiche_synthetique/Fiche_synthetique_2026.pdf', 156000, 'application/pdf', 'fiche_synthetique', 'Fiche synthétique 2026', 'Fiche synthétique ALUR - Données financières et techniques', ARRAY['alur', 'fiche', '2026'], '2026-01-01', 'public', 'finance', 5, v_user_id);

  -- Contrats assurances
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_contracts1_assur, 'Contrat_MRH_AXA_2024_2027.pdf', 'ged/' || v_copro1_id || '/assurance/Contrat_MRH_AXA_2024_2027.pdf', 892000, 'application/pdf', 'assurance', 'Contrat MRH Immeuble', 'Multirisque habitation - AXA - Valable 2024-2027', ARRAY['assurance', 'mrh', 'axa', 'contrat'], '2024-01-01', 'council', 'maintenance', 15, v_user_id),
  (v_copro1_id, v_folder_contracts1_assur, 'Attestation_RC_2026.pdf', 'ged/' || v_copro1_id || '/assurance/Attestation_RC_2026.pdf', 128000, 'application/pdf', 'assurance', 'Attestation RC 2026', 'Attestation responsabilité civile annuelle', ARRAY['assurance', 'rc', 'attestation', '2026'], '2026-01-01', 'public', 'maintenance', 5, v_user_id);

  -- Contrats maintenance
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_contracts1_maint, 'Contrat_ascenseur_OTIS_2023.pdf', 'ged/' || v_copro1_id || '/contrat/Contrat_ascenseur_OTIS_2023.pdf', 1256000, 'application/pdf', 'contrat', 'Contrat entretien ascenseur', 'Contrat complet OTIS - Ascenseurs A et B', ARRAY['contrat', 'ascenseur', 'otis', 'maintenance'], '2023-07-01', 'council', 'maintenance', 15, v_user_id),
  (v_copro1_id, v_folder_contracts1_maint, 'Contrat_chauffage_ENGIE_2024.pdf', 'ged/' || v_copro1_id || '/contrat/Contrat_chauffage_ENGIE_2024.pdf', 980000, 'application/pdf', 'contrat', 'Contrat chauffage collectif', 'Contrat exploitation chauffage - ENGIE', ARRAY['contrat', 'chauffage', 'engie', 'maintenance'], '2024-10-01', 'council', 'maintenance', 15, v_user_id),
  (v_copro1_id, v_folder_contracts1_maint, 'Contrat_nettoyage_CleanPro_2025.pdf', 'ged/' || v_copro1_id || '/contrat/Contrat_nettoyage_CleanPro_2025.pdf', 456000, 'application/pdf', 'contrat', 'Contrat nettoyage parties communes', 'Prestation mensuelle - CleanPro Services', ARRAY['contrat', 'nettoyage', 'cleanpro'], '2025-01-01', 'manager', 'maintenance', 15, v_user_id);

  -- Factures 2026
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_invoices1_2026, 'FAC_2026_001_ENGIE.pdf', 'ged/' || v_copro1_id || '/facture/2026/FAC_2026_001_ENGIE.pdf', 245000, 'application/pdf', 'facture', 'Facture ENGIE Janvier 2026', 'Consommation gaz + maintenance chauffage', ARRAY['facture', 'engie', 'chauffage', 'janvier'], '2026-01-15', 'manager', 'finance', 10, v_user_id),
  (v_copro1_id, v_folder_invoices1_2026, 'FAC_2026_002_EAU.pdf', 'ged/' || v_copro1_id || '/facture/2026/FAC_2026_002_EAU.pdf', 178000, 'application/pdf', 'facture', 'Facture Eau de Paris Q4-2025', 'Relevé compteur général - T4 2025', ARRAY['facture', 'eau', 'q4', '2025'], '2026-01-10', 'manager', 'finance', 10, v_user_id),
  (v_copro1_id, v_folder_invoices1_2026, 'FAC_2026_003_OTIS.pdf', 'ged/' || v_copro1_id || '/facture/2026/FAC_2026_003_OTIS.pdf', 312000, 'application/pdf', 'facture', 'Facture OTIS Q1-2026', 'Maintenance ascenseurs T1 2026', ARRAY['facture', 'otis', 'ascenseur', 'q1'], '2026-01-20', 'manager', 'finance', 10, v_user_id),
  (v_copro1_id, v_folder_invoices1_2026, 'DEV_2026_001_ravalement.pdf', 'ged/' || v_copro1_id || '/devis/2026/DEV_2026_001_ravalement.pdf', 1540000, 'application/pdf', 'devis', 'Devis ravalement façade principale', 'Entreprise BatiFrance - Devis détaillé ravalement', ARRAY['devis', 'ravalement', 'facade', 'travaux'], '2026-01-05', 'council', 'maintenance', 5, v_user_id);

  -- Diagnostics
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_diagnostics1, 'DPE_collectif_2024.pdf', 'ged/' || v_copro1_id || '/diagnostic/DPE_collectif_2024.pdf', 2560000, 'application/pdf', 'diagnostic', 'DPE Collectif 2024', 'Diagnostic de Performance Énergétique - Classe D', ARRAY['diagnostic', 'dpe', 'energie', '2024'], '2024-03-15', 'public', 'maintenance', 10, v_user_id),
  (v_copro1_id, v_folder_diagnostics1, 'Amiante_parties_communes_2022.pdf', 'ged/' || v_copro1_id || '/diagnostic/Amiante_parties_communes_2022.pdf', 1890000, 'application/pdf', 'diagnostic', 'Diagnostic amiante', 'Repérage amiante parties communes - Négatif', ARRAY['diagnostic', 'amiante', 'securite'], '2022-09-10', 'public', 'maintenance', 10, v_user_id),
  (v_copro1_id, v_folder_diagnostics1, 'Controle_ascenseur_2025.pdf', 'ged/' || v_copro1_id || '/diagnostic/Controle_ascenseur_2025.pdf', 456000, 'application/pdf', 'diagnostic', 'Contrôle technique ascenseur 2025', 'Bureau Veritas - Contrôle quinquennal', ARRAY['diagnostic', 'ascenseur', 'controle', '2025'], '2025-11-20', 'public', 'maintenance', 10, v_user_id);

  -- Ordres de service
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_maint1, 'OS_2025_042_fuite_eau.pdf', 'ged/' || v_copro1_id || '/ordre_service/2025/OS_2025_042_fuite_eau.pdf', 89000, 'application/pdf', 'ordre_service', 'OS Fuite eau parking -1', 'Intervention urgente - Fuite canalisation', ARRAY['os', 'fuite', 'plomberie', 'urgence'], '2025-12-10', 'manager', 'maintenance', 5, v_user_id),
  (v_copro1_id, v_folder_maint1, 'Rapport_intervention_fuite.pdf', 'ged/' || v_copro1_id || '/ordre_service/2025/Rapport_intervention_fuite.pdf', 523000, 'application/pdf', 'ordre_service', 'Rapport intervention fuite', 'Compte-rendu PlombExpress + photos', ARRAY['rapport', 'intervention', 'plomberie', 'photos'], '2025-12-11', 'manager', 'maintenance', 5, v_user_id);

  -- Comptabilité
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  (v_copro1_id, v_folder_compta1, 'Budget_previsionnel_2026.pdf', 'ged/' || v_copro1_id || '/budget/Budget_previsionnel_2026.pdf', 678000, 'application/pdf', 'budget', 'Budget prévisionnel 2026', 'Budget voté en AG 2025', ARRAY['budget', 'previsionnel', '2026'], '2025-06-15', 'public', 'finance', 10, v_user_id),
  (v_copro1_id, v_folder_compta1, 'Appel_fonds_T1_2026.pdf', 'ged/' || v_copro1_id || '/appel_fonds/Appel_fonds_T1_2026.pdf', 234000, 'application/pdf', 'appel_fonds', 'Appel de fonds T1 2026', 'Premier trimestre - Charges courantes', ARRAY['appel', 'fonds', 't1', '2026'], '2026-01-02', 'public', 'finance', 10, v_user_id),
  (v_copro1_id, v_folder_compta1, 'Releve_charges_2025.pdf', 'ged/' || v_copro1_id || '/releve_charges/Releve_charges_2025.pdf', 1240000, 'application/pdf', 'releve_charges', 'Relevé de charges 2025', 'Arrêté des comptes exercice 2025', ARRAY['releve', 'charges', 'comptes', '2025'], '2026-01-15', 'public', 'finance', 10, v_user_id);

  -- ============================================================================
  -- DOCUMENTS COPRO 2 - Le Clos des Lilas
  -- ============================================================================

  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, created_by)
  VALUES
  -- AG
  (v_copro2_id, v_folder_ag2, 'PV_AG_2025_05_20.pdf', 'ged/' || v_copro2_id || '/pv_ag/2025/PV_AG_2025_05_20.pdf', 498000, 'application/pdf', 'pv_ag', 'PV AG Ordinaire 2025', 'Assemblée générale ordinaire annuelle', ARRAY['ag', 'pv', '2025'], '2025-05-20', 'public', 'ag', 10, v_user_id),
  (v_copro2_id, v_folder_ag2, 'Convocation_AG_2025.pdf', 'ged/' || v_copro2_id || '/convocation/2025/Convocation_AG_2025.pdf', 287000, 'application/pdf', 'convocation', 'Convocation AG 2025', 'Convocation + projets résolutions', ARRAY['ag', 'convocation', '2025'], '2025-04-20', 'public', 'ag', 10, v_user_id),
  -- Contrats
  (v_copro2_id, v_folder_contracts2, 'Contrat_gardiennage_2024.pdf', 'ged/' || v_copro2_id || '/contrat/Contrat_gardiennage_2024.pdf', 756000, 'application/pdf', 'contrat', 'Contrat gardien', 'Contrat travail gardien - M. Durand', ARRAY['contrat', 'gardien', 'emploi'], '2024-01-01', 'restricted', 'maintenance', 50, v_user_id),
  (v_copro2_id, v_folder_contracts2, 'Contrat_espaces_verts_2025.pdf', 'ged/' || v_copro2_id || '/contrat/Contrat_espaces_verts_2025.pdf', 412000, 'application/pdf', 'contrat', 'Contrat entretien espaces verts', 'Prestation mensuelle - JardinPro', ARRAY['contrat', 'jardin', 'espaces verts'], '2025-03-01', 'council', 'maintenance', 15, v_user_id),
  -- Factures
  (v_copro2_id, v_folder_invoices2, 'FAC_2026_001_EDF.pdf', 'ged/' || v_copro2_id || '/facture/2026/FAC_2026_001_EDF.pdf', 198000, 'application/pdf', 'facture', 'Facture EDF Janvier', 'Électricité parties communes', ARRAY['facture', 'edf', 'electricite'], '2026-01-18', 'manager', 'finance', 10, v_user_id);

  -- ============================================================================
  -- VERSIONING - Créer quelques versions pour certains documents
  -- ============================================================================

  -- Version 2 du règlement (mise à jour)
  INSERT INTO documents (copro_id, folder_id, file_name, file_path, file_size, mime_type, category, title, description, tags, document_date, confidentiality, source_module, retention_years, version, parent_document_id, is_current_version, created_by)
  SELECT
    d.copro_id, d.folder_id,
    'Reglement_copropriete_v2.pdf',
    'ged/' || d.copro_id || '/reglement/Reglement_copropriete_v2.pdf',
    2150000, 'application/pdf', 'reglement',
    'Règlement de copropriété (v2)',
    'Version consolidée avec modificatif n°1',
    ARRAY['reglement', 'legal', 'consolide', 'v2'],
    '2018-12-01', 'public', 'manual', 0, 2, d.id, true, v_user_id
  FROM documents d
  WHERE d.copro_id = v_copro1_id AND d.file_name = 'Reglement_copropriete.pdf';

  -- Marquer l'ancienne version comme non courante
  UPDATE documents SET is_current_version = false
  WHERE copro_id = v_copro1_id AND file_name = 'Reglement_copropriete.pdf';

  -- Créer les entrées dans document_versions
  INSERT INTO document_versions (document_id, version_number, file_path, file_name, file_size, change_summary, created_by)
  SELECT d.id, 1, d.file_path, d.file_name, d.file_size, 'Version initiale', v_user_id
  FROM documents d
  WHERE d.copro_id = v_copro1_id AND d.file_name = 'Reglement_copropriete.pdf';

  INSERT INTO document_versions (document_id, version_number, file_path, file_name, file_size, change_summary, created_by)
  SELECT d.parent_document_id, 2, d.file_path, d.file_name, d.file_size, 'Intégration modificatif n°1 ELAN', v_user_id
  FROM documents d
  WHERE d.copro_id = v_copro1_id AND d.file_name = 'Reglement_copropriete_v2.pdf';

  RAISE NOTICE 'Seed GED terminé avec succès';
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  v_doc_count INTEGER;
  v_folder_count INTEGER;
  v_version_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_doc_count FROM documents;
  SELECT COUNT(*) INTO v_folder_count FROM document_folders;
  SELECT COUNT(*) INTO v_version_count FROM document_versions;

  RAISE NOTICE 'GED Seed Stats: % documents, % dossiers, % versions', v_doc_count, v_folder_count, v_version_count;
END $$;
