import type { SearchFilters } from './types';

export const ITEMS_PER_PAGE = 24;
export const MAX_SEARCH_HISTORY = 10;
export const SEARCH_HISTORY_KEY = 'ged_search_history';

export const DEFAULT_FILTERS: SearchFilters = {
  categories: [],
  dateFrom: '',
  dateTo: '',
  sizeMin: '',
  sizeMax: '',
  fileTypes: [],
};

export const AVAILABLE_MONTHS = [
  { value: '01', label: 'Janvier' },
  { value: '02', label: 'Février' },
  { value: '03', label: 'Mars' },
  { value: '04', label: 'Avril' },
  { value: '05', label: 'Mai' },
  { value: '06', label: 'Juin' },
  { value: '07', label: 'Juillet' },
  { value: '08', label: 'Août' },
  { value: '09', label: 'Septembre' },
  { value: '10', label: 'Octobre' },
  { value: '11', label: 'Novembre' },
  { value: '12', label: 'Décembre' },
];

export const CATEGORY_COLORS: Record<string, string> = {
  PV_AG: '#3B82F6',
  pv_ag: '#3B82F6',
  REGLEMENT: '#8B5CF6',
  reglement: '#8B5CF6',
  CONTRAT: '#10B981',
  contrat: '#10B981',
  FACTURE: '#F59E0B',
  facture: '#F59E0B',
  DIAGNOSTIC: '#EF4444',
  diagnostic: '#EF4444',
  PLAN: '#06B6D4',
  plan: '#06B6D4',
  CORRESPONDANCE: '#EC4899',
  correspondance: '#EC4899',
  PHOTO: '#84CC16',
  photo: '#84CC16',
  ORDRE_SERVICE: '#F97316',
  ordre_service: '#F97316',
  AUTRE: '#6B7280',
  autre: '#6B7280',
  CONVOCATION: '#3B82F6',
  convocation: '#3B82F6',
  DEVIS: '#F59E0B',
  devis: '#F59E0B',
  ASSURANCE: '#10B981',
  assurance: '#10B981',
  BUDGET: '#6366F1',
  budget: '#6366F1',
  APPEL_FONDS: '#EC4899',
  appel_fonds: '#EC4899',
  RELEVE_CHARGES: '#6366F1',
  releve_charges: '#6366F1',
  ETAT_DATE: '#06B6D4',
  etat_date: '#06B6D4',
  COURRIER: '#EC4899',
  courrier: '#EC4899',
  CARNET_ENTRETIEN: '#F97316',
  carnet_entretien: '#F97316',
  FICHE_SYNTHETIQUE: '#8B5CF6',
  fiche_synthetique: '#8B5CF6',
};

export const FILE_TYPES = ['PDF', 'Image', 'Excel', 'Autre'];

/**
 * Document categories matching DB enum: document_category
 */
export const DOCUMENT_CATEGORIES = [
  { value: 'TOUS', label: 'Tous les documents', dbValue: null },
  { value: 'PV_AG', label: "PV d'Assemblées Générales", dbValue: 'pv_ag' },
  { value: 'CONVOCATION', label: 'Convocations', dbValue: 'convocation' },
  { value: 'REGLEMENT', label: 'Règlements', dbValue: 'reglement' },
  { value: 'CONTRAT', label: 'Contrats', dbValue: 'contrat' },
  { value: 'FACTURE', label: 'Factures', dbValue: 'facture' },
  { value: 'DEVIS', label: 'Devis', dbValue: 'devis' },
  { value: 'DIAGNOSTIC', label: 'Diagnostics', dbValue: 'diagnostic' },
  { value: 'ASSURANCE', label: 'Assurances', dbValue: 'assurance' },
  { value: 'BUDGET', label: 'Budgets', dbValue: 'budget' },
  { value: 'APPEL_FONDS', label: 'Appels de Fonds', dbValue: 'appel_fonds' },
  { value: 'RELEVE_CHARGES', label: 'Relevés de Charges', dbValue: 'releve_charges' },
  { value: 'ETAT_DATE', label: 'États Datés', dbValue: 'etat_date' },
  { value: 'COURRIER', label: 'Courriers', dbValue: 'courrier' },
  { value: 'CORRESPONDANCE', label: 'Correspondances', dbValue: 'correspondance' },
  { value: 'ORDRE_SERVICE', label: 'Ordres de Service', dbValue: 'ordre_service' },
  { value: 'PHOTO', label: 'Photos', dbValue: 'photo' },
  { value: 'PLAN', label: 'Plans', dbValue: 'plan' },
  { value: 'CARNET_ENTRETIEN', label: "Carnet d'Entretien", dbValue: 'carnet_entretien' },
  { value: 'FICHE_SYNTHETIQUE', label: 'Fiches Synthétiques', dbValue: 'fiche_synthetique' },
  { value: 'AUTRE', label: 'Autres documents', dbValue: 'autre' },
];

/**
 * Map DB category to UI label
 */
export const CATEGORY_LABELS: Record<string, string> = {
  pv_ag: "PV d'AG",
  convocation: 'Convocation',
  reglement: 'Règlement',
  contrat: 'Contrat',
  facture: 'Facture',
  devis: 'Devis',
  diagnostic: 'Diagnostic',
  assurance: 'Assurance',
  budget: 'Budget',
  appel_fonds: 'Appel de Fonds',
  releve_charges: 'Relevé de Charges',
  etat_date: 'État Daté',
  courrier: 'Courrier',
  correspondance: 'Correspondance',
  ordre_service: 'Ordre de Service',
  photo: 'Photo',
  plan: 'Plan',
  carnet_entretien: "Carnet d'Entretien",
  fiche_synthetique: 'Fiche Synthétique',
  autre: 'Autre',
  // Legacy uppercase values for compatibility
  PV_AG: "PV d'AG",
  CONVOCATION: 'Convocation',
  REGLEMENT: 'Règlement',
  CONTRAT: 'Contrat',
  FACTURE: 'Facture',
  DEVIS: 'Devis',
  DIAGNOSTIC: 'Diagnostic',
  ASSURANCE: 'Assurance',
  BUDGET: 'Budget',
  APPEL_FONDS: 'Appel de Fonds',
  RELEVE_CHARGES: 'Relevé de Charges',
  ETAT_DATE: 'État Daté',
  COURRIER: 'Courrier',
  CORRESPONDANCE: 'Correspondance',
  ORDRE_SERVICE: 'Ordre de Service',
  PHOTO: 'Photo',
  PLAN: 'Plan',
  CARNET_ENTRETIEN: "Carnet d'Entretien",
  FICHE_SYNTHETIQUE: 'Fiche Synthétique',
  AUTRE: 'Autre',
};

/**
 * Required documents checklist (regulatory compliance)
 */
export const DOCUMENTS_OBLIGATOIRES_CHECKLIST = [
  { type: 'reglement', nom: 'Règlement de copropriété', present: false },
  { type: 'reglement', nom: 'État descriptif de division', present: false },
  { type: 'carnet_entretien', nom: "Carnet d'entretien", present: false },
  { type: 'diagnostic', nom: 'DTA (Amiante)', present: false },
  { type: 'diagnostic', nom: 'DPE Collectif', present: false },
  { type: 'diagnostic', nom: 'Diagnostic Électrique', present: false },
  { type: 'pv_ag', nom: 'PV AG année en cours', present: false },
  { type: 'contrat', nom: 'Contrat Assurance', present: false },
  { type: 'contrat', nom: 'Contrat Syndic', present: false },
  { type: 'plan', nom: 'Plan Évacuation Incendie', present: false },
];
