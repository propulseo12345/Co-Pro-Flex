/**
 * Mock Data - Budgets
 *
 * @source Fusionné depuis :
 *   - src/hooks/modules/useBudget.ts → MOCK_BUDGETS_TRAVAUX, DEFAULT_BUDGETS
 *   - src/components/features/finance/Budget/mock-data.ts
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - resolution_ag_id → resolutions.id (optionnel)
 *
 * KPIs Dashboard à respecter :
 * - Budget consommé : 25% (1 309 € / 5 300 €)
 */

import { BaseEntity, BudgetStatut, BudgetType } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';

// ============================================
// TYPES
// ============================================

export interface LigneBudget {
  id: string;
  poste: string;
  montant_prevu: number;
  montant_realise: number;
  ecart: number;
  pourcentage_realise: number;
}

export interface Budget extends BaseEntity {
  // Relations
  copropriete_id: string;
  resolution_ag_id?: string;

  // Identification
  nom: string;
  type: BudgetType;
  annee: number;
  exercice_debut: string;
  exercice_fin: string;

  // Montants
  montant_total: number;
  montant_consomme: number;
  montant_reste: number;

  // Lignes détaillées
  lignes: LigneBudget[];

  // Statut
  statut: BudgetStatut;
  date_vote?: string;

  // Métadonnées
  notes?: string;
}

// Budget Travaux spécifique
export interface BudgetTravaux extends Budget {
  titre_travaux: string;
  description_travaux?: string;
  devis_associe?: number;
  cle_repartition_id?: string;
  date_debut_travaux?: string;
  date_fin_prevue?: string;
  prestataire_principal_id?: string;
}

// ============================================
// IDS PRÉGÉNÉRÉS
// ============================================

export const BUDGET_IDS = {
  FONCTIONNEMENT_2025: 'bdg_11111111-1111-4111-8111-111111111111',
  FONCTIONNEMENT_2024: 'bdg_22222222-2222-4222-8222-222222222222',
  TRAVAUX_ISOLATION: 'bdgt_33333333-3333-4333-8333-333333333333',
  TRAVAUX_ECLAIRAGE: 'bdgt_44444444-4444-4444-8444-444444444444',
  ALUR_2025: 'bdg_55555555-5555-4555-8555-555555555555',
} as const;

// ============================================
// DONNÉES MOCK
// ============================================

/**
 * KPI Dashboard : Budget consommé 25% (1 309 € / 5 300 €)
 * On utilise le budget T1 2025 pour ce calcul
 */
export const BUDGETS_MOCK: Budget[] = [
  // === BUDGET FONCTIONNEMENT 2025 ===
  {
    id: BUDGET_IDS.FONCTIONNEMENT_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    resolution_ag_id: 'res_11111111-1111-4111-8111-111111111111',
    nom: 'Budget prévisionnel 2025',
    type: BudgetType.FONCTIONNEMENT,
    annee: 2025,
    exercice_debut: '2025-01-01',
    exercice_fin: '2025-12-31',
    montant_total: 87500,
    montant_consomme: 5235.50, // ~6% au 19/01
    montant_reste: 82264.50,
    lignes: [
      {
        id: 'ligne-eau',
        poste: 'Eau',
        montant_prevu: 12000,
        montant_realise: 890.00,
        ecart: -11110,
        pourcentage_realise: 7.4,
      },
      {
        id: 'ligne-elec',
        poste: 'Électricité',
        montant_prevu: 8500,
        montant_realise: 1245.50,
        ecart: -7254.50,
        pourcentage_realise: 14.7,
      },
      {
        id: 'ligne-assurance',
        poste: 'Assurance',
        montant_prevu: 18500,
        montant_realise: 3200.00,
        ecart: -15300,
        pourcentage_realise: 17.3,
      },
      {
        id: 'ligne-menage',
        poste: 'Ménage',
        montant_prevu: 15000,
        montant_realise: 450.00,
        ecart: -14550,
        pourcentage_realise: 3.0,
      },
      {
        id: 'ligne-ascenseur',
        poste: 'Ascenseur',
        montant_prevu: 8000,
        montant_realise: 0,
        ecart: -8000,
        pourcentage_realise: 0,
      },
      {
        id: 'ligne-entretien',
        poste: 'Entretien courant',
        montant_prevu: 10000,
        montant_realise: 0,
        ecart: -10000,
        pourcentage_realise: 0,
      },
      {
        id: 'ligne-honoraires',
        poste: 'Honoraires syndic',
        montant_prevu: 7400,
        montant_realise: 0,
        ecart: -7400,
        pourcentage_realise: 0,
      },
      {
        id: 'ligne-divers',
        poste: 'Divers et imprévus',
        montant_prevu: 8100,
        montant_realise: 0,
        ecart: -8100,
        pourcentage_realise: 0,
      },
    ],
    statut: BudgetStatut.APPROUVE,
    date_vote: '2024-11-15',
    notes: 'Voté à la majorité article 24',
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
  // === BUDGET FONCTIONNEMENT 2024 (CLÔTURÉ) ===
  {
    id: BUDGET_IDS.FONCTIONNEMENT_2024,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    nom: 'Budget prévisionnel 2024',
    type: BudgetType.FONCTIONNEMENT,
    annee: 2024,
    exercice_debut: '2024-01-01',
    exercice_fin: '2024-12-31',
    montant_total: 85000,
    montant_consomme: 82450.30,
    montant_reste: 2549.70,
    lignes: [
      { id: 'ligne-2024-eau', poste: 'Eau', montant_prevu: 11500, montant_realise: 11234.50, ecart: -265.50, pourcentage_realise: 97.7 },
      { id: 'ligne-2024-elec', poste: 'Électricité', montant_prevu: 8200, montant_realise: 8762.30, ecart: 562.30, pourcentage_realise: 106.9 },
      { id: 'ligne-2024-assurance', poste: 'Assurance', montant_prevu: 18000, montant_realise: 18000, ecart: 0, pourcentage_realise: 100 },
      { id: 'ligne-2024-menage', poste: 'Ménage', montant_prevu: 14500, montant_realise: 14400, ecart: -100, pourcentage_realise: 99.3 },
      { id: 'ligne-2024-ascenseur', poste: 'Ascenseur', montant_prevu: 7560, montant_realise: 7560, ecart: 0, pourcentage_realise: 100 },
      { id: 'ligne-2024-entretien', poste: 'Entretien', montant_prevu: 10000, montant_realise: 8234.50, ecart: -1765.50, pourcentage_realise: 82.3 },
      { id: 'ligne-2024-honoraires', poste: 'Honoraires syndic', montant_prevu: 7400, montant_realise: 7400, ecart: 0, pourcentage_realise: 100 },
      { id: 'ligne-2024-divers', poste: 'Divers', montant_prevu: 7840, montant_realise: 6859, ecart: -981, pourcentage_realise: 87.5 },
    ],
    statut: BudgetStatut.CLOTURE,
    date_vote: '2023-11-20',
    created_at: '2023-11-20T00:00:00Z',
    updated_at: '2025-01-05T10:00:00Z',
  },
  // === BUDGET FONDS ALUR 2025 ===
  {
    id: BUDGET_IDS.ALUR_2025,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    resolution_ag_id: 'res_33333333-3333-4333-8333-333333333333',
    nom: 'Cotisation Fonds ALUR 2025',
    type: BudgetType.ALUR,
    annee: 2025,
    exercice_debut: '2025-01-01',
    exercice_fin: '2025-12-31',
    montant_total: 4375, // 5% du budget fonctionnement
    montant_consomme: 0,
    montant_reste: 4375,
    lignes: [
      {
        id: 'ligne-alur-cotisation',
        poste: 'Cotisation annuelle',
        montant_prevu: 4375,
        montant_realise: 0,
        ecart: -4375,
        pourcentage_realise: 0,
      },
    ],
    statut: BudgetStatut.APPROUVE,
    date_vote: '2024-11-15',
    notes: '5% du budget prévisionnel - Obligation légale ALUR',
    created_at: '2024-11-15T00:00:00Z',
    updated_at: '2025-01-19T10:00:00Z',
  },
];

// === BUDGETS TRAVAUX (structure spécifique) ===
export const BUDGETS_TRAVAUX_MOCK: BudgetTravaux[] = [
  {
    id: BUDGET_IDS.TRAVAUX_ISOLATION,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    resolution_ag_id: 'res_22222222-2222-4222-8222-222222222222',
    nom: 'Travaux Isolation Thermique',
    titre_travaux: 'Isolation Thermique',
    description_travaux: 'Isolation des combles et murs extérieurs',
    type: BudgetType.TRAVAUX,
    annee: 2024,
    exercice_debut: '2024-06-01',
    exercice_fin: '2025-06-01',
    montant_total: 28000,
    devis_associe: 27500,
    montant_consomme: 12000,
    montant_reste: 16000,
    lignes: [
      { id: 'ligne-trav-combles', poste: 'Isolation combles', montant_prevu: 8000, montant_realise: 7500, ecart: -500, pourcentage_realise: 93.8 },
      { id: 'ligne-trav-facade-n', poste: 'Isolation façade Nord', montant_prevu: 9000, montant_realise: 4500, ecart: -4500, pourcentage_realise: 50 },
      { id: 'ligne-trav-facade-s', poste: 'Isolation façade Sud', montant_prevu: 8000, montant_realise: 0, ecart: -8000, pourcentage_realise: 0 },
      { id: 'ligne-trav-echafaud', poste: 'Échafaudages', montant_prevu: 3000, montant_realise: 0, ecart: -3000, pourcentage_realise: 0 },
    ],
    statut: BudgetStatut.APPROUVE,
    date_vote: '2024-05-20',
    date_debut_travaux: '2024-06-15',
    date_fin_prevue: '2024-10-20',
    notes: 'Travaux en cours - 43% réalisé',
    created_at: '2024-05-20T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: BUDGET_IDS.TRAVAUX_ECLAIRAGE,
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    nom: 'Travaux Rénovation Éclairage LED',
    titre_travaux: 'Rénovation Éclairage',
    description_travaux: 'Remplacement des éclairages par LED',
    type: BudgetType.TRAVAUX,
    annee: 2025,
    exercice_debut: '2025-01-01',
    exercice_fin: '2025-12-31',
    montant_total: 5500,
    devis_associe: 5200,
    montant_consomme: 0,
    montant_reste: 5500,
    lignes: [
      { id: 'ligne-led-audit', poste: 'Audit éclairage', montant_prevu: 500, montant_realise: 0, ecart: -500, pourcentage_realise: 0 },
      { id: 'ligne-led-communs', poste: 'LED parties communes', montant_prevu: 3200, montant_realise: 0, ecart: -3200, pourcentage_realise: 0 },
      { id: 'ligne-led-parking', poste: 'LED parking', montant_prevu: 1800, montant_realise: 0, ecart: -1800, pourcentage_realise: 0 },
    ],
    statut: BudgetStatut.VOTE,
    date_vote: '2024-05-20',
    date_debut_travaux: '2025-01-15',
    date_fin_prevue: '2025-02-28',
    notes: 'Travaux à venir',
    created_at: '2024-05-20T00:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
];

// ============================================
// BUDGET T1 POUR KPI DASHBOARD
// ============================================

/**
 * Budget T1 2025 pour calcul KPI Dashboard
 * Budget consommé : 25% (1 309 € / 5 300 €)
 */
export const BUDGET_T1_2025 = {
  periode: 'T1 2025',
  montant_prevu: 5300,
  montant_consomme: 1309,
  pourcentage: 24.7, // ~25%
};

// ============================================
// STATISTIQUES
// ============================================

export const BUDGETS_STATS = {
  total: BUDGETS_MOCK.length + BUDGETS_TRAVAUX_MOCK.length,
  par_type: {
    fonctionnement: BUDGETS_MOCK.filter((b) => b.type === BudgetType.FONCTIONNEMENT).length,
    travaux: BUDGETS_TRAVAUX_MOCK.length,
    alur: BUDGETS_MOCK.filter((b) => b.type === BudgetType.ALUR).length,
  },
  par_statut: {
    approuve: [...BUDGETS_MOCK, ...BUDGETS_TRAVAUX_MOCK].filter((b) => b.statut === BudgetStatut.APPROUVE).length,
    vote: [...BUDGETS_MOCK, ...BUDGETS_TRAVAUX_MOCK].filter((b) => b.statut === BudgetStatut.VOTE).length,
    cloture: [...BUDGETS_MOCK, ...BUDGETS_TRAVAUX_MOCK].filter((b) => b.statut === BudgetStatut.CLOTURE).length,
  },
  montant_total_2025: BUDGETS_MOCK.filter((b) => b.annee === 2025).reduce((acc, b) => acc + b.montant_total, 0),
  montant_travaux_en_cours: BUDGETS_TRAVAUX_MOCK.filter((b) => b.statut === BudgetStatut.APPROUVE).reduce(
    (acc, b) => acc + b.montant_total,
    0
  ),
  // KPI Dashboard
  kpi_t1_2025: BUDGET_T1_2025,
};

// ============================================
// TABLE DE CORRESPONDANCE
// ============================================

export const BUDGETS_ID_MAP: Record<string, string> = {
  'budget-2025-fonct': BUDGET_IDS.FONCTIONNEMENT_2025,
  'budget-2024-fonct': BUDGET_IDS.FONCTIONNEMENT_2024,
  'BUDGET-FONCT-2024': BUDGET_IDS.FONCTIONNEMENT_2024,
  '1': BUDGET_IDS.TRAVAUX_ISOLATION,
  '2': BUDGET_IDS.TRAVAUX_ECLAIRAGE,
};

// ============================================
// HELPERS
// ============================================

export function getBudgetById(id: string): Budget | BudgetTravaux | undefined {
  return BUDGETS_MOCK.find((b) => b.id === id) || BUDGETS_TRAVAUX_MOCK.find((b) => b.id === id);
}

export function getBudgetsByAnnee(annee: number): Budget[] {
  return BUDGETS_MOCK.filter((b) => b.annee === annee);
}

export function getBudgetFonctionnementActuel(coproprieteId: string): Budget | undefined {
  const currentYear = new Date().getFullYear();
  return BUDGETS_MOCK.find(
    (b) =>
      b.copropriete_id === coproprieteId &&
      b.type === BudgetType.FONCTIONNEMENT &&
      b.annee === currentYear
  );
}

export function getBudgetsTravauxEnCours(coproprieteId: string): BudgetTravaux[] {
  return BUDGETS_TRAVAUX_MOCK.filter(
    (b) => b.copropriete_id === coproprieteId && b.statut === BudgetStatut.APPROUVE
  );
}

export function calculerPourcentageConsomme(budget: Budget): number {
  if (budget.montant_total === 0) return 0;
  return (budget.montant_consomme / budget.montant_total) * 100;
}

export function getTotalBudgetAnnuel(coproprieteId: string, annee: number): number {
  return BUDGETS_MOCK.filter((b) => b.copropriete_id === coproprieteId && b.annee === annee).reduce(
    (acc, b) => acc + b.montant_total,
    0
  );
}
