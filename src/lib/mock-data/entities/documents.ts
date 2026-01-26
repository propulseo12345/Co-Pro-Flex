/**
 * Mock Data - Documents GED
 *
 * @source src/data/mock/documents-ged.ts (142 docs → sélection ~55)
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - assemblee_id → assemblees.id (optionnel)
 * - contrat_id → contrats.id (optionnel)
 * - facture_id → factures.id (optionnel)
 * - lot_id → lots.id (optionnel)
 * - uploaded_by_user_id → users.id (optionnel)
 *
 * Notes:
 * - ~55 documents réalistes couvrant toutes les catégories
 * - Structure hiérarchique de dossiers GED
 * - Historique sur 10 ans (2015-2024)
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { USER_IDS } from './users';

// ============================================
// TYPES
// ============================================

export type CategorieDocument =
  | 'PV_AG'
  | 'REGLEMENT'
  | 'CONTRAT'
  | 'FACTURE'
  | 'DIAGNOSTIC'
  | 'PLAN'
  | 'CORRESPONDANCE'
  | 'PHOTO'
  | 'ORDRE_SERVICE'
  | 'COMPTABILITE'
  | 'AUTRE';

export type TypeFichier = 'PDF' | 'DOCX' | 'XLSX' | 'JPG' | 'PNG' | 'ZIP' | 'AUTRE';

export type VisibiliteDocument = 'tous' | 'conseil_syndical' | 'syndic_seul';

export interface DossierGED {
  id: string;
  nom: string;
  parent_id: string | null;
  icone?: string;
  couleur?: string;
  ordre: number;
}

export interface Document extends BaseEntity {
  // FK Relations
  copropriete_id: string;
  assemblee_id?: string;
  contrat_id?: string;
  facture_id?: string;
  lot_id?: string;
  uploaded_by_user_id?: string;

  // Identification
  titre: string;
  description?: string;

  // Classification
  categorie: CategorieDocument;
  sous_categorie?: string;
  tags?: string[];
  dossier_id?: string;

  // Fichier
  fichier_url: string;
  fichier_nom: string;
  fichier_type: TypeFichier;
  fichier_taille: string; // "2.5 Mo"

  // Dates
  date_document?: string; // Date du document (pas upload)

  // Accès
  visibilite: VisibiliteDocument;

  // Versioning
  version?: number;
  document_parent_id?: string;
}

// ============================================
// DOSSIERS GED
// ============================================

export const DOSSIERS_GED: DossierGED[] = [
  // Racine
  { id: 'assemblees', nom: 'Assemblées Générales', parent_id: null, icone: 'Users', couleur: '#3B82F6', ordre: 1 },
  { id: 'documents-legaux', nom: 'Documents Légaux', parent_id: null, icone: 'Scale', couleur: '#8B5CF6', ordre: 2 },
  { id: 'contrats', nom: 'Contrats', parent_id: null, icone: 'FileSignature', couleur: '#10B981', ordre: 3 },
  { id: 'factures', nom: 'Factures & Devis', parent_id: null, icone: 'Receipt', couleur: '#F59E0B', ordre: 4 },
  { id: 'diagnostics', nom: 'Diagnostics & Contrôles', parent_id: null, icone: 'ClipboardCheck', couleur: '#EF4444', ordre: 5 },
  { id: 'plans', nom: 'Plans & Schémas', parent_id: null, icone: 'Map', couleur: '#06B6D4', ordre: 6 },
  { id: 'correspondances', nom: 'Correspondances', parent_id: null, icone: 'Mail', couleur: '#EC4899', ordre: 7 },
  { id: 'maintenance', nom: 'Maintenance', parent_id: null, icone: 'Wrench', couleur: '#F97316', ordre: 8 },
  { id: 'photos', nom: 'Photos', parent_id: null, icone: 'Image', couleur: '#84CC16', ordre: 9 },
  { id: 'comptabilite', nom: 'Comptabilité', parent_id: null, icone: 'Calculator', couleur: '#6366F1', ordre: 10 },
  // Sous-dossiers AG
  { id: 'ag-2024', nom: '2024', parent_id: 'assemblees', ordre: 1 },
  { id: 'ag-2023', nom: '2023', parent_id: 'assemblees', ordre: 2 },
  { id: 'ag-archives', nom: 'Archives (2015-2022)', parent_id: 'assemblees', ordre: 3 },
  // Sous-dossiers Contrats
  { id: 'ctr-assurances', nom: 'Assurances', parent_id: 'contrats', ordre: 1 },
  { id: 'ctr-syndic', nom: 'Syndic', parent_id: 'contrats', ordre: 2 },
  { id: 'ctr-maintenance', nom: 'Maintenance', parent_id: 'contrats', ordre: 3 },
  // Sous-dossiers Factures
  { id: 'fac-2024', nom: '2024', parent_id: 'factures', ordre: 1 },
  { id: 'fac-2023', nom: '2023', parent_id: 'factures', ordre: 2 },
  { id: 'fac-devis', nom: 'Devis en cours', parent_id: 'factures', ordre: 3 },
  // Sous-dossiers Comptabilité
  { id: 'compta-budgets', nom: 'Budgets', parent_id: 'comptabilite', ordre: 1 },
  { id: 'compta-appels', nom: 'Appels de Fonds', parent_id: 'comptabilite', ordre: 2 },
];

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const DOCUMENT_IDS = {
  // PV AG
  PV_AG_2024: 'doc_11111111-1111-4111-8111-111111111111',
  PV_AG_2023: 'doc_22222222-2222-4222-8222-222222222222',
  PV_AGE_RAVALEMENT_2023: 'doc_33333333-3333-4333-8333-333333333333',
  CONVOC_AG_2024: 'doc_44444444-4444-4444-8444-444444444444',
  // Règlements
  REGLEMENT_COPRO: 'doc_55555555-5555-4555-8555-555555555555',
  REGLEMENT_INTERIEUR: 'doc_66666666-6666-4666-8666-666666666666',
  EDD: 'doc_77777777-7777-4777-8777-777777777777',
  CARNET_ENTRETIEN: 'doc_88888888-8888-4888-8888-888888888888',
  // Contrats
  CTR_ASSURANCE_2024: 'doc_99999999-9999-4999-8999-999999999999',
  CTR_SYNDIC_2024: 'doc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  CTR_ASCENSEUR: 'doc_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  CTR_CHAUFFAGE: 'doc_cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  CTR_NETTOYAGE: 'doc_dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  // Diagnostics
  DIAG_DTA: 'doc_eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  DIAG_DPE: 'doc_ffffffff-ffff-4fff-8fff-ffffffffffff',
  DIAG_ELEC: 'doc_10101010-1010-4010-8010-101010101010',
  DIAG_ASCENSEUR_2024: 'doc_12121212-1212-4212-8212-121212121212',
  // Plans
  PLAN_MASSE: 'doc_13131313-1313-4313-8313-131313131313',
  PLAN_EVACUATION: 'doc_14141414-1414-4414-8414-141414141414',
  // Comptabilité
  BUDGET_2025: 'doc_15151515-1515-4515-8515-151515151515',
  BUDGET_2024: 'doc_16161616-1616-4616-8616-161616161616',
  APPEL_FONDS_Q1_2025: 'doc_17171717-1717-4717-8717-171717171717',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

export const DOCUMENTS_MOCK: Document[] = [
  // ============================================
  // PV ASSEMBLÉES GÉNÉRALES
  // ============================================
  {
    id: DOCUMENT_IDS.PV_AG_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'PV AG Ordinaire 2024',
    description: "Procès-verbal de l'Assemblée Générale Ordinaire du 15 juin 2024",
    categorie: 'PV_AG',
    tags: ['ag', 'pv', '2024', 'ordinaire'],
    dossier_id: 'ag-2024',
    fichier_url: '/documents/pv-ag-2024.pdf',
    fichier_nom: 'PV AG Ordinaire 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '4.2 Mo',
    date_document: '2024-06-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-06-20T00:00:00Z',
    updated_at: '2024-06-20T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.PV_AG_2023,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'PV AG Ordinaire 2023',
    description: "Procès-verbal de l'Assemblée Générale Ordinaire du 20 mai 2023",
    categorie: 'PV_AG',
    tags: ['ag', 'pv', '2023', 'ordinaire'],
    dossier_id: 'ag-2023',
    fichier_url: '/documents/pv-ag-2023.pdf',
    fichier_nom: 'PV AG Ordinaire 2023.pdf',
    fichier_type: 'PDF',
    fichier_taille: '3.8 Mo',
    date_document: '2023-05-20',
    visibilite: 'tous',
    version: 1,
    created_at: '2023-05-25T00:00:00Z',
    updated_at: '2023-05-25T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.PV_AGE_RAVALEMENT_2023,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'PV AG Extraordinaire - Ravalement 2023',
    description: 'Vote des travaux de ravalement de façade',
    categorie: 'PV_AG',
    tags: ['ag', 'pv', '2023', 'extraordinaire', 'travaux'],
    dossier_id: 'ag-2023',
    fichier_url: '/documents/pv-age-ravalement-2023.pdf',
    fichier_nom: 'PV AG Extraordinaire - Ravalement 2023.pdf',
    fichier_type: 'PDF',
    fichier_taille: '2.1 Mo',
    date_document: '2023-10-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2023-10-20T00:00:00Z',
    updated_at: '2023-10-20T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.CONVOC_AG_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'Convocation AG 2024',
    description: "Convocation à l'AG Ordinaire 2024 avec ordre du jour",
    categorie: 'PV_AG',
    tags: ['ag', 'convocation', '2024'],
    dossier_id: 'ag-2024',
    fichier_url: '/documents/convoc-ag-2024.pdf',
    fichier_nom: 'Convocation AG 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.8 Mo',
    date_document: '2024-05-01',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-05-01T00:00:00Z',
  },

  // ============================================
  // RÈGLEMENTS ET DOCUMENTS LÉGAUX
  // ============================================
  {
    id: DOCUMENT_IDS.REGLEMENT_COPRO,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Règlement de copropriété',
    description: 'Règlement de copropriété initial (1992)',
    categorie: 'REGLEMENT',
    tags: ['reglement', 'juridique', 'fondateur'],
    dossier_id: 'documents-legaux',
    fichier_url: '/documents/reglement-copropriete.pdf',
    fichier_nom: 'Règlement de copropriété.pdf',
    fichier_type: 'PDF',
    fichier_taille: '8.5 Mo',
    date_document: '1992-03-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2010-03-15T00:00:00Z',
    updated_at: '2010-03-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.REGLEMENT_INTERIEUR,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Règlement intérieur',
    description: 'Règles de vie commune dans la copropriété',
    categorie: 'REGLEMENT',
    tags: ['reglement', 'interieur', 'vie-commune'],
    dossier_id: 'documents-legaux',
    fichier_url: '/documents/reglement-interieur.pdf',
    fichier_nom: 'Règlement intérieur.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.2 Mo',
    date_document: '2019-06-20',
    visibilite: 'tous',
    version: 2,
    created_at: '2019-06-20T00:00:00Z',
    updated_at: '2019-06-20T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.EDD,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'État descriptif de division',
    description: 'Description des lots et tantièmes',
    categorie: 'REGLEMENT',
    tags: ['edd', 'tantiemes', 'lots'],
    dossier_id: 'documents-legaux',
    fichier_url: '/documents/edd.pdf',
    fichier_nom: 'État descriptif de division.pdf',
    fichier_type: 'PDF',
    fichier_taille: '12.3 Mo',
    date_document: '1992-03-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2010-03-15T00:00:00Z',
    updated_at: '2010-03-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.CARNET_ENTRETIEN,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: "Carnet d'entretien de l'immeuble",
    description: 'Historique des travaux et entretiens (obligation légale)',
    categorie: 'REGLEMENT',
    tags: ['carnet', 'entretien', 'legal'],
    dossier_id: 'documents-legaux',
    fichier_url: '/documents/carnet-entretien.pdf',
    fichier_nom: "Carnet d'entretien de l'immeuble.pdf",
    fichier_type: 'PDF',
    fichier_taille: '3.4 Mo',
    date_document: '2024-01-15',
    visibilite: 'tous',
    version: 8,
    created_at: '2015-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },

  // ============================================
  // CONTRATS
  // ============================================
  {
    id: DOCUMENT_IDS.CTR_ASSURANCE_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Contrat Assurance Immeuble 2024-2025',
    description: 'Contrat multirisque immeuble AXA',
    categorie: 'CONTRAT',
    tags: ['contrat', 'assurance', 'mri'],
    dossier_id: 'ctr-assurances',
    fichier_url: '/documents/contrat-assurance-2024.pdf',
    fichier_nom: 'Contrat Assurance Immeuble 2024-2025.pdf',
    fichier_type: 'PDF',
    fichier_taille: '2.8 Mo',
    date_document: '2024-01-01',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.CTR_SYNDIC_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Contrat Syndic Bénévole 2024-2027',
    description: 'Mandat de syndic bénévole renouvelé en AG 2024',
    categorie: 'CONTRAT',
    tags: ['contrat', 'syndic', 'mandat'],
    dossier_id: 'ctr-syndic',
    fichier_url: '/documents/contrat-syndic-2024.pdf',
    fichier_nom: 'Contrat Syndic Bénévole 2024-2027.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.5 Mo',
    date_document: '2024-06-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.CTR_ASCENSEUR,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Contrat Maintenance Ascenseur Schindler',
    description: 'Contrat de maintenance préventive et curative',
    categorie: 'CONTRAT',
    tags: ['contrat', 'ascenseur', 'maintenance'],
    dossier_id: 'ctr-maintenance',
    fichier_url: '/documents/contrat-ascenseur.pdf',
    fichier_nom: 'Contrat Maintenance Ascenseur Schindler.pdf',
    fichier_type: 'PDF',
    fichier_taille: '3.2 Mo',
    date_document: '2025-01-01',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-12-15T00:00:00Z',
    updated_at: '2024-12-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.CTR_CHAUFFAGE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Contrat Entretien Chaudière',
    description: 'Contrat annuel entretien chauffage collectif',
    categorie: 'CONTRAT',
    tags: ['contrat', 'chauffage', 'entretien'],
    dossier_id: 'ctr-maintenance',
    fichier_url: '/documents/contrat-chauffage.pdf',
    fichier_nom: 'Contrat Entretien Chaudière.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.8 Mo',
    date_document: '2025-09-01',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2025-08-15T00:00:00Z',
    updated_at: '2025-08-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.CTR_NETTOYAGE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Contrat Nettoyage Parties Communes',
    description: 'Prestations hebdomadaires de nettoyage',
    categorie: 'CONTRAT',
    tags: ['contrat', 'nettoyage', 'menage'],
    dossier_id: 'ctr-maintenance',
    fichier_url: '/documents/contrat-nettoyage.pdf',
    fichier_nom: 'Contrat Nettoyage Parties Communes.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.1 Mo',
    date_document: '2025-01-01',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },

  // ============================================
  // DIAGNOSTICS
  // ============================================
  {
    id: DOCUMENT_IDS.DIAG_DTA,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Dossier Technique Amiante (DTA)',
    description: 'Diagnostic réglementaire amiante parties communes',
    categorie: 'DIAGNOSTIC',
    tags: ['diagnostic', 'amiante', 'dta', 'obligatoire'],
    dossier_id: 'diagnostics',
    fichier_url: '/documents/diag-dta.pdf',
    fichier_nom: 'Dossier Technique Amiante (DTA).pdf',
    fichier_type: 'PDF',
    fichier_taille: '8.5 Mo',
    date_document: '2023-05-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2023-05-15T00:00:00Z',
    updated_at: '2023-05-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.DIAG_DPE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'DPE Collectif Immeuble',
    description: 'Diagnostic de Performance Énergétique collectif',
    categorie: 'DIAGNOSTIC',
    tags: ['diagnostic', 'dpe', 'energie', 'obligatoire'],
    dossier_id: 'diagnostics',
    fichier_url: '/documents/diag-dpe.pdf',
    fichier_nom: 'DPE Collectif Immeuble.pdf',
    fichier_type: 'PDF',
    fichier_taille: '5.1 Mo',
    date_document: '2022-03-22',
    visibilite: 'tous',
    version: 1,
    created_at: '2022-03-22T00:00:00Z',
    updated_at: '2022-03-22T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.DIAG_ELEC,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Diagnostic Électrique Parties Communes',
    description: 'Contrôle installation électrique',
    categorie: 'DIAGNOSTIC',
    tags: ['diagnostic', 'electricite', 'securite'],
    dossier_id: 'diagnostics',
    fichier_url: '/documents/diag-elec.pdf',
    fichier_nom: 'Diagnostic Électrique Parties Communes.pdf',
    fichier_type: 'PDF',
    fichier_taille: '3.8 Mo',
    date_document: '2024-10-05',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-10-05T00:00:00Z',
    updated_at: '2024-10-05T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.DIAG_ASCENSEUR_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Rapport Contrôle Technique Ascenseur 2024',
    description: 'Contrôle périodique obligatoire ascenseur',
    categorie: 'DIAGNOSTIC',
    tags: ['diagnostic', 'ascenseur', 'controle', 'obligatoire'],
    dossier_id: 'diagnostics',
    fichier_url: '/documents/diag-ascenseur-2024.pdf',
    fichier_nom: 'Rapport Contrôle Technique Ascenseur 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '2.3 Mo',
    date_document: '2024-06-15',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },

  // ============================================
  // PLANS
  // ============================================
  {
    id: DOCUMENT_IDS.PLAN_MASSE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Plan Masse Copropriété',
    description: 'Plan général de la copropriété',
    categorie: 'PLAN',
    tags: ['plan', 'masse', 'batiment'],
    dossier_id: 'plans',
    fichier_url: '/documents/plan-masse.pdf',
    fichier_nom: 'Plan Masse Copropriété.pdf',
    fichier_type: 'PDF',
    fichier_taille: '15.2 Mo',
    date_document: '1992-03-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2010-03-15T00:00:00Z',
    updated_at: '2010-03-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.PLAN_EVACUATION,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Plan Évacuation Incendie',
    description: "Plan d'évacuation obligatoire en cas d'incendie",
    categorie: 'PLAN',
    tags: ['plan', 'evacuation', 'securite', 'incendie'],
    dossier_id: 'plans',
    fichier_url: '/documents/plan-evacuation.pdf',
    fichier_nom: 'Plan Évacuation Incendie.pdf',
    fichier_type: 'PDF',
    fichier_taille: '2.1 Mo',
    date_document: '2020-02-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2020-02-15T00:00:00Z',
    updated_at: '2020-02-15T00:00:00Z',
  },

  // ============================================
  // COMPTABILITÉ
  // ============================================
  {
    id: DOCUMENT_IDS.BUDGET_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'Budget Prévisionnel 2025',
    description: 'Budget voté en AG 2024',
    categorie: 'COMPTABILITE',
    tags: ['budget', 'previsionnel', '2025'],
    dossier_id: 'compta-budgets',
    fichier_url: '/documents/budget-2025.pdf',
    fichier_nom: 'Budget Prévisionnel 2025.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.8 Mo',
    date_document: '2024-06-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-06-15T00:00:00Z',
    updated_at: '2024-06-15T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.BUDGET_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'Budget Prévisionnel 2024',
    description: 'Budget voté en AG 2023',
    categorie: 'COMPTABILITE',
    tags: ['budget', 'previsionnel', '2024'],
    dossier_id: 'compta-budgets',
    fichier_url: '/documents/budget-2024.pdf',
    fichier_nom: 'Budget Prévisionnel 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.6 Mo',
    date_document: '2023-05-20',
    visibilite: 'tous',
    version: 1,
    created_at: '2023-05-20T00:00:00Z',
    updated_at: '2023-05-20T00:00:00Z',
  },
  {
    id: DOCUMENT_IDS.APPEL_FONDS_Q1_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'Appel de Fonds T1 2025',
    description: 'Premier trimestre 2025 - charges courantes',
    categorie: 'COMPTABILITE',
    tags: ['appel', 'fonds', 'T1', '2025'],
    dossier_id: 'compta-appels',
    fichier_url: '/documents/appel-fonds-t1-2025.pdf',
    fichier_nom: 'Appel de Fonds T1 2025.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.8 Mo',
    date_document: '2025-01-01',
    visibilite: 'tous',
    version: 1,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },

  // ============================================
  // FACTURES (échantillon représentatif)
  // ============================================
  {
    id: 'doc_fac_elec_2024',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Récapitulatif Factures EDF 2024',
    description: 'Consommation électrique parties communes',
    categorie: 'FACTURE',
    tags: ['facture', 'edf', 'electricite', '2024'],
    dossier_id: 'fac-2024',
    fichier_url: '/documents/fac-elec-2024.pdf',
    fichier_nom: 'Récapitulatif Factures EDF 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.5 Mo',
    date_document: '2024-12-31',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-12-31T00:00:00Z',
    updated_at: '2024-12-31T00:00:00Z',
  },
  {
    id: 'doc_fac_assur_2024',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Prime Assurance Immeuble 2024',
    description: 'Appel de prime annuelle MRI',
    categorie: 'FACTURE',
    tags: ['facture', 'assurance', 'prime', '2024'],
    dossier_id: 'fac-2024',
    fichier_url: '/documents/fac-assur-2024.pdf',
    fichier_nom: 'Prime Assurance Immeuble 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.8 Mo',
    date_document: '2024-01-05',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'doc_devis_toiture',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Devis Réfection Toiture Partielle',
    description: 'Devis pour travaux de toiture - en attente vote AG',
    categorie: 'FACTURE',
    tags: ['devis', 'toiture', 'travaux'],
    dossier_id: 'fac-devis',
    fichier_url: '/documents/devis-toiture-2024.pdf',
    fichier_nom: 'Devis Réfection Toiture Partielle 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.8 Mo',
    date_document: '2024-09-05',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-09-05T00:00:00Z',
    updated_at: '2024-09-05T00:00:00Z',
  },

  // ============================================
  // CORRESPONDANCES
  // ============================================
  {
    id: 'doc_corr_mairie',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Courrier Mairie - Autorisation Ravalement',
    description: 'Autorisation administrative pour travaux de façade',
    categorie: 'CORRESPONDANCE',
    tags: ['courrier', 'mairie', 'autorisation', 'ravalement'],
    dossier_id: 'correspondances',
    fichier_url: '/documents/courrier-mairie.pdf',
    fichier_nom: 'Courrier Mairie - Autorisation Ravalement.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.8 Mo',
    date_document: '2024-02-20',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-02-20T00:00:00Z',
    updated_at: '2024-02-20T00:00:00Z',
  },
  {
    id: 'doc_info_copro_q4',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.SYNDIC,
    titre: 'Information Copropriétaires Q4 2024',
    description: 'Newsletter trimestrielle',
    categorie: 'CORRESPONDANCE',
    tags: ['info', 'newsletter', 'Q4', '2024'],
    dossier_id: 'correspondances',
    fichier_url: '/documents/info-copro-q4-2024.pdf',
    fichier_nom: 'Information Copropriétaires Q4 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '1.8 Mo',
    date_document: '2024-12-01',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-12-01T00:00:00Z',
    updated_at: '2024-12-01T00:00:00Z',
  },
  {
    id: 'doc_cr_cs_dec',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    uploaded_by_user_id: USER_IDS.PRESIDENT_CS,
    titre: 'Compte-rendu Conseil Syndical Décembre 2024',
    description: 'Réunion préparatoire budget et travaux',
    categorie: 'CORRESPONDANCE',
    tags: ['conseil-syndical', 'compte-rendu', 'decembre', '2024'],
    dossier_id: 'correspondances',
    fichier_url: '/documents/cr-cs-dec-2024.pdf',
    fichier_nom: 'Compte-rendu Conseil Syndical Décembre 2024.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.9 Mo',
    date_document: '2024-12-18',
    visibilite: 'conseil_syndical',
    version: 1,
    created_at: '2024-12-18T00:00:00Z',
    updated_at: '2024-12-18T00:00:00Z',
  },

  // ============================================
  // PHOTOS
  // ============================================
  {
    id: 'doc_photo_facade_avant',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Photo Façade Avant Ravalement',
    description: 'État de la façade avant travaux',
    categorie: 'PHOTO',
    tags: ['photo', 'facade', 'avant', 'ravalement'],
    dossier_id: 'photos',
    fichier_url: '/documents/photo-facade-avant.jpg',
    fichier_nom: 'Photo Façade Avant Ravalement.jpg',
    fichier_type: 'JPG',
    fichier_taille: '2.5 Mo',
    date_document: '2024-03-01',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-03-01T00:00:00Z',
    updated_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'doc_photo_facade_apres',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'Photo Façade Après Ravalement',
    description: 'Résultat des travaux de ravalement',
    categorie: 'PHOTO',
    tags: ['photo', 'facade', 'apres', 'ravalement'],
    dossier_id: 'photos',
    fichier_url: '/documents/photo-facade-apres.jpg',
    fichier_nom: 'Photo Façade Après Ravalement.jpg',
    fichier_type: 'JPG',
    fichier_taille: '2.8 Mo',
    date_document: '2024-11-15',
    visibilite: 'tous',
    version: 1,
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2024-11-15T00:00:00Z',
  },

  // ============================================
  // ORDRES DE SERVICE (documents)
  // ============================================
  {
    id: 'doc_os_2024_001',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'OS n°2024-001 - Réparation Ascenseur',
    description: 'Ordre de service pour intervention ascenseur',
    categorie: 'ORDRE_SERVICE',
    tags: ['os', 'ascenseur', 'reparation', '2024'],
    dossier_id: 'maintenance',
    fichier_url: '/documents/os-2024-001.pdf',
    fichier_nom: 'OS n°2024-001 - Réparation Ascenseur.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.4 Mo',
    date_document: '2024-01-18',
    visibilite: 'syndic_seul',
    version: 1,
    created_at: '2024-01-18T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z',
  },
  {
    id: 'doc_os_2024_002',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    titre: 'OS n°2024-002 - Fuite Chaufferie',
    description: 'Intervention urgente fuite sur circuit chauffage',
    categorie: 'ORDRE_SERVICE',
    tags: ['os', 'chauffage', 'fuite', '2024'],
    dossier_id: 'maintenance',
    fichier_url: '/documents/os-2024-002.pdf',
    fichier_nom: 'OS n°2024-002 - Fuite Chaufferie.pdf',
    fichier_type: 'PDF',
    fichier_taille: '0.5 Mo',
    date_document: '2024-02-25',
    visibilite: 'syndic_seul',
    version: 1,
    created_at: '2024-02-25T00:00:00Z',
    updated_at: '2024-02-25T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const DOCUMENTS_STATS = {
  total: DOCUMENTS_MOCK.length,
  par_categorie: {
    PV_AG: DOCUMENTS_MOCK.filter((d) => d.categorie === 'PV_AG').length,
    REGLEMENT: DOCUMENTS_MOCK.filter((d) => d.categorie === 'REGLEMENT').length,
    CONTRAT: DOCUMENTS_MOCK.filter((d) => d.categorie === 'CONTRAT').length,
    FACTURE: DOCUMENTS_MOCK.filter((d) => d.categorie === 'FACTURE').length,
    DIAGNOSTIC: DOCUMENTS_MOCK.filter((d) => d.categorie === 'DIAGNOSTIC').length,
    PLAN: DOCUMENTS_MOCK.filter((d) => d.categorie === 'PLAN').length,
    CORRESPONDANCE: DOCUMENTS_MOCK.filter((d) => d.categorie === 'CORRESPONDANCE')
      .length,
    PHOTO: DOCUMENTS_MOCK.filter((d) => d.categorie === 'PHOTO').length,
    ORDRE_SERVICE: DOCUMENTS_MOCK.filter((d) => d.categorie === 'ORDRE_SERVICE')
      .length,
    COMPTABILITE: DOCUMENTS_MOCK.filter((d) => d.categorie === 'COMPTABILITE')
      .length,
    AUTRE: DOCUMENTS_MOCK.filter((d) => d.categorie === 'AUTRE').length,
  },
  par_visibilite: {
    tous: DOCUMENTS_MOCK.filter((d) => d.visibilite === 'tous').length,
    conseil_syndical: DOCUMENTS_MOCK.filter(
      (d) => d.visibilite === 'conseil_syndical'
    ).length,
    syndic_seul: DOCUMENTS_MOCK.filter((d) => d.visibilite === 'syndic_seul')
      .length,
  },
};

// ============================================
// TABLE DE CORRESPONDANCE (migration)
// ============================================

export const DOCUMENT_ID_MAP: Record<string, string> = {
  'pv-ag-2024': DOCUMENT_IDS.PV_AG_2024,
  'pv-ag-2023': DOCUMENT_IDS.PV_AG_2023,
  'pv-age-2023': DOCUMENT_IDS.PV_AGE_RAVALEMENT_2023,
  'convoc-ag-2024': DOCUMENT_IDS.CONVOC_AG_2024,
  'reg-copro': DOCUMENT_IDS.REGLEMENT_COPRO,
  'reg-interieur': DOCUMENT_IDS.REGLEMENT_INTERIEUR,
  edd: DOCUMENT_IDS.EDD,
  'carnet-entretien': DOCUMENT_IDS.CARNET_ENTRETIEN,
  'ctr-assur-2024': DOCUMENT_IDS.CTR_ASSURANCE_2024,
  'ctr-syndic-2024': DOCUMENT_IDS.CTR_SYNDIC_2024,
  'diag-dta': DOCUMENT_IDS.DIAG_DTA,
  'diag-dpe': DOCUMENT_IDS.DIAG_DPE,
  'plan-masse': DOCUMENT_IDS.PLAN_MASSE,
  'budget-prev-2025': DOCUMENT_IDS.BUDGET_2025,
};

// ============================================
// HELPERS
// ============================================

export function getDocumentById(id: string): Document | undefined {
  return DOCUMENTS_MOCK.find((d) => d.id === id);
}

export function getDocumentsByCopropriete(coproprieteId: string): Document[] {
  return DOCUMENTS_MOCK.filter((d) => d.copropriete_id === coproprieteId);
}

export function getDocumentsByCategorie(categorie: CategorieDocument): Document[] {
  return DOCUMENTS_MOCK.filter((d) => d.categorie === categorie);
}

export function getDocumentsByDossier(dossierId: string): Document[] {
  return DOCUMENTS_MOCK.filter((d) => d.dossier_id === dossierId);
}

export function getDocumentsVisiblesParRole(
  role: 'coproprietaire' | 'conseil_syndical' | 'syndic'
): Document[] {
  if (role === 'syndic') return DOCUMENTS_MOCK;
  if (role === 'conseil_syndical') {
    return DOCUMENTS_MOCK.filter((d) => d.visibilite !== 'syndic_seul');
  }
  return DOCUMENTS_MOCK.filter((d) => d.visibilite === 'tous');
}

export function searchDocuments(query: string): Document[] {
  const q = query.toLowerCase();
  return DOCUMENTS_MOCK.filter(
    (d) =>
      d.titre.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.tags?.some((t) => t.includes(q)) ||
      d.fichier_nom.toLowerCase().includes(q)
  );
}

export function getDossierById(id: string): DossierGED | undefined {
  return DOSSIERS_GED.find((d) => d.id === id);
}

export function getSousDossiers(parentId: string | null): DossierGED[] {
  return DOSSIERS_GED.filter((d) => d.parent_id === parentId).sort(
    (a, b) => a.ordre - b.ordre
  );
}

export function getDossierPath(dossierId: string): DossierGED[] {
  const path: DossierGED[] = [];
  let current = DOSSIERS_GED.find((d) => d.id === dossierId);
  while (current) {
    path.unshift(current);
    current = current.parent_id
      ? DOSSIERS_GED.find((d) => d.id === current!.parent_id)
      : undefined;
  }
  return path;
}
