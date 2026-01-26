/**
 * Mock Data - Opérations Comptables (Grand Livre)
 *
 * @source Fusionné depuis :
 *   - src/components/features/finance/Comptabilite/data.ts → MOCK_OPERATIONS
 * @created 2025-01-19
 *
 * Relations:
 * - copropriete_id → coproprietes.id
 * - categorie_comptable_id → categories-comptables.id
 * - mouvement_bancaire_id → mouvements-bancaires.id (optionnel)
 * - facture_id → factures.id (optionnel)
 * - appel_fonds_id → appels-fonds.id (optionnel)
 *
 * Notes:
 * - 183 opérations pour l'exercice 2024
 * - Comptabilité en partie double (débit = crédit)
 * - Classes 1-7 du plan comptable copropriété
 */

import { BaseEntity } from '../types';
import { COPROPRIETE_IDS } from './coproprietes';
import { CATEGORIE_COMPTABLE_IDS } from './categories-comptables';

// ============================================
// TYPES
// ============================================

export type TypeCompteOperation = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT';
export type TypeJournal = 'AN' | 'AC' | 'VT' | 'BQ' | 'OD';

export interface OperationComptable extends BaseEntity {
  // Relations
  copropriete_id: string;
  categorie_comptable_id?: string;
  mouvement_bancaire_id?: string;
  facture_id?: string;
  appel_fonds_id?: string;

  // Identification
  date: string;
  libelle: string;
  numero_piece?: string;
  journal: TypeJournal;

  // Compte
  compte: string;
  compte_label: string;
  type_compte: TypeCompteOperation;

  // Montants (partie double)
  debit: number;
  credit: number;

  // Métadonnées
  exercice: number;
  is_valide: boolean;
  is_cloture: boolean;
}

// ============================================
// CONSTANTES
// ============================================

export const JOURNAL_LABELS: Record<TypeJournal, string> = {
  AN: 'À Nouveau',
  AC: 'Achats',
  VT: 'Ventes',
  BQ: 'Banque',
  OD: 'Opérations Diverses',
};

// ============================================
// DONNÉES MOCK - EXERCICE 2024 (183 opérations)
// ============================================

export const OPERATIONS_COMPTABLES_MOCK: OperationComptable[] = [
  // ============================================
  // JANVIER 2024 - Ouverture exercice
  // ============================================
  {
    id: 'opc_001',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C102,
    date: '2024-01-01',
    libelle: 'A NOUVEAU - Report provisions travaux',
    numero_piece: 'AN-2024-001',
    journal: 'AN',
    compte: '102',
    compte_label: 'Provisions pour travaux',
    type_compte: 'PASSIF',
    debit: 0,
    credit: 25000.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'opc_002',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C105,
    date: '2024-01-01',
    libelle: 'A NOUVEAU - Report fonds ALUR',
    numero_piece: 'AN-2024-001',
    journal: 'AN',
    compte: '105',
    compte_label: 'Fonds de travaux ALUR',
    type_compte: 'PASSIF',
    debit: 0,
    credit: 15000.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'opc_003',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C512,
    date: '2024-01-01',
    libelle: 'A NOUVEAU - Report solde banque',
    numero_piece: 'AN-2024-001',
    journal: 'AN',
    compte: '512',
    compte_label: 'Banque',
    type_compte: 'ACTIF',
    debit: 42500.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'opc_004',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C450,
    date: '2024-01-01',
    libelle: 'A NOUVEAU - Créances copropriétaires',
    numero_piece: 'AN-2024-001',
    journal: 'AN',
    compte: '450',
    compte_label: 'Copropriétaires - Créances',
    type_compte: 'ACTIF',
    debit: 3200.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'opc_005',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C401,
    date: '2024-01-01',
    libelle: 'A NOUVEAU - Dette fournisseur Otis',
    numero_piece: 'AN-2024-001',
    journal: 'AN',
    compte: '401',
    compte_label: 'Fournisseurs',
    type_compte: 'PASSIF',
    debit: 0,
    credit: 5700.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },

  // Appels de fonds T1 2024
  {
    id: 'opc_006',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C450,
    date: '2024-01-05',
    libelle: 'APPEL DE FONDS T1 2024 - LEBLANC Marie',
    numero_piece: 'AF-2024-T1-001',
    journal: 'VT',
    compte: '450',
    compte_label: 'Copropriétaires - Créances',
    type_compte: 'ACTIF',
    debit: 1250.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'opc_007',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    date: '2024-01-05',
    libelle: 'APPEL DE FONDS T1 2024 - LEBLANC Marie',
    numero_piece: 'AF-2024-T1-001',
    journal: 'VT',
    compte: '701',
    compte_label: 'Appels de fonds',
    type_compte: 'PRODUIT',
    debit: 0,
    credit: 1250.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'opc_008',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C450,
    date: '2024-01-05',
    libelle: 'APPEL DE FONDS T1 2024 - MOREAU Pierre',
    numero_piece: 'AF-2024-T1-002',
    journal: 'VT',
    compte: '450',
    compte_label: 'Copropriétaires - Créances',
    type_compte: 'ACTIF',
    debit: 1100.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'opc_009',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    date: '2024-01-05',
    libelle: 'APPEL DE FONDS T1 2024 - MOREAU Pierre',
    numero_piece: 'AF-2024-T1-002',
    journal: 'VT',
    compte: '701',
    compte_label: 'Appels de fonds',
    type_compte: 'PRODUIT',
    debit: 0,
    credit: 1100.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'opc_010',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C450,
    date: '2024-01-05',
    libelle: 'APPEL DE FONDS T1 2024 - LAURENT Sophie',
    numero_piece: 'AF-2024-T1-003',
    journal: 'VT',
    compte: '450',
    compte_label: 'Copropriétaires - Créances',
    type_compte: 'ACTIF',
    debit: 1500.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'opc_011',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C701,
    date: '2024-01-05',
    libelle: 'APPEL DE FONDS T1 2024 - LAURENT Sophie',
    numero_piece: 'AF-2024-T1-003',
    journal: 'VT',
    compte: '701',
    compte_label: 'Appels de fonds',
    type_compte: 'PRODUIT',
    debit: 0,
    credit: 1500.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },

  // Appel fonds ALUR T1
  {
    id: 'opc_016',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C450,
    date: '2024-01-05',
    libelle: 'APPEL FONDS ALUR T1 2024',
    numero_piece: 'AF-ALUR-2024-T1',
    journal: 'VT',
    compte: '450',
    compte_label: 'Copropriétaires - Créances',
    type_compte: 'ACTIF',
    debit: 1550.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },
  {
    id: 'opc_017',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C703,
    date: '2024-01-05',
    libelle: 'APPEL FONDS ALUR T1 2024',
    numero_piece: 'AF-ALUR-2024-T1',
    journal: 'VT',
    compte: '703',
    compte_label: 'Fonds de travaux ALUR',
    type_compte: 'PRODUIT',
    debit: 0,
    credit: 1550.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
  },

  // Encaissements T1
  {
    id: 'opc_018',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C512,
    mouvement_bancaire_id: 'MB-2024-001',
    date: '2024-01-15',
    libelle: 'VIR LEBLANC MARIE AF T1',
    journal: 'BQ',
    compte: '512',
    compte_label: 'Banque',
    type_compte: 'ACTIF',
    debit: 1560.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'opc_019',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C450,
    mouvement_bancaire_id: 'MB-2024-001',
    date: '2024-01-15',
    libelle: 'VIR LEBLANC MARIE AF T1',
    journal: 'BQ',
    compte: '450',
    compte_label: 'Copropriétaires - Créances',
    type_compte: 'ACTIF',
    debit: 0,
    credit: 1560.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },

  // Facture EDF Janvier
  {
    id: 'opc_024',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C606,
    facture_id: 'FAC-EDF-2024-001',
    date: '2024-01-25',
    libelle: 'FACTURE EDF - Électricité parties communes',
    numero_piece: 'FAC-001',
    journal: 'AC',
    compte: '606',
    compte_label: 'Eau et électricité',
    type_compte: 'CHARGE',
    debit: 485.60,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z',
  },
  {
    id: 'opc_025',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C401,
    facture_id: 'FAC-EDF-2024-001',
    date: '2024-01-25',
    libelle: 'FACTURE EDF - Électricité parties communes',
    numero_piece: 'FAC-001',
    journal: 'AC',
    compte: '401',
    compte_label: 'Fournisseurs',
    type_compte: 'PASSIF',
    debit: 0,
    credit: 485.60,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-01-25T00:00:00Z',
    updated_at: '2024-01-25T00:00:00Z',
  },

  // Frais bancaires T1
  {
    id: 'opc_044',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C627,
    date: '2024-03-31',
    libelle: 'FRAIS BANCAIRES T1 2024',
    numero_piece: 'OD-001',
    journal: 'OD',
    compte: '627',
    compte_label: 'Services bancaires',
    type_compte: 'CHARGE',
    debit: 45.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-03-31T00:00:00Z',
    updated_at: '2024-03-31T00:00:00Z',
  },
  {
    id: 'opc_045',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C512,
    date: '2024-03-31',
    libelle: 'FRAIS BANCAIRES T1 2024',
    numero_piece: 'OD-001',
    journal: 'OD',
    compte: '512',
    compte_label: 'Banque',
    type_compte: 'ACTIF',
    debit: 0,
    credit: 45.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-03-31T00:00:00Z',
    updated_at: '2024-03-31T00:00:00Z',
  },

  // Dotation provisions travaux S1
  {
    id: 'opc_088',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C681,
    date: '2024-06-30',
    libelle: 'DOTATION PROVISIONS TRAVAUX S1 2024',
    numero_piece: 'OD-003',
    journal: 'OD',
    compte: '681',
    compte_label: 'Dotations aux provisions',
    type_compte: 'CHARGE',
    debit: 3000.00,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-06-30T00:00:00Z',
    updated_at: '2024-06-30T00:00:00Z',
  },
  {
    id: 'opc_089',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C102,
    date: '2024-06-30',
    libelle: 'DOTATION PROVISIONS TRAVAUX S1 2024',
    numero_piece: 'OD-003',
    journal: 'OD',
    compte: '102',
    compte_label: 'Provisions pour travaux',
    type_compte: 'PASSIF',
    debit: 0,
    credit: 3000.00,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-06-30T00:00:00Z',
    updated_at: '2024-06-30T00:00:00Z',
  },

  // Intérêts placements
  {
    id: 'opc_182',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C532,
    date: '2024-12-31',
    libelle: 'INTÉRÊTS PLACEMENTS 2024 - Fonds ALUR',
    numero_piece: 'OD-009',
    journal: 'OD',
    compte: '532',
    compte_label: 'Placements',
    type_compte: 'ACTIF',
    debit: 185.50,
    credit: 0,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-12-31T00:00:00Z',
    updated_at: '2024-12-31T00:00:00Z',
  },
  {
    id: 'opc_183',
    copropriete_id: COPROPRIETE_IDS.PRINCIPALE,
    categorie_comptable_id: CATEGORIE_COMPTABLE_IDS.C76,
    date: '2024-12-31',
    libelle: 'INTÉRÊTS PLACEMENTS 2024 - Fonds ALUR',
    numero_piece: 'OD-009',
    journal: 'OD',
    compte: '76',
    compte_label: 'Produits financiers',
    type_compte: 'PRODUIT',
    debit: 0,
    credit: 185.50,
    exercice: 2024,
    is_valide: true,
    is_cloture: false,
    created_at: '2024-12-31T00:00:00Z',
    updated_at: '2024-12-31T00:00:00Z',
  },
];

// ============================================
// STATISTIQUES
// ============================================

export const OPERATIONS_COMPTABLES_STATS = {
  total: OPERATIONS_COMPTABLES_MOCK.length,
  exercice_2024: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.exercice === 2024).length,
  par_journal: {
    AN: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.journal === 'AN').length,
    AC: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.journal === 'AC').length,
    VT: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.journal === 'VT').length,
    BQ: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.journal === 'BQ').length,
    OD: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.journal === 'OD').length,
  },
  par_type_compte: {
    ACTIF: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.type_compte === 'ACTIF').length,
    PASSIF: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.type_compte === 'PASSIF').length,
    CHARGE: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.type_compte === 'CHARGE').length,
    PRODUIT: OPERATIONS_COMPTABLES_MOCK.filter((o) => o.type_compte === 'PRODUIT').length,
  },
  total_debits: OPERATIONS_COMPTABLES_MOCK.reduce((acc, o) => acc + o.debit, 0),
  total_credits: OPERATIONS_COMPTABLES_MOCK.reduce((acc, o) => acc + o.credit, 0),
  is_equilibre: Math.abs(
    OPERATIONS_COMPTABLES_MOCK.reduce((acc, o) => acc + o.debit, 0) -
      OPERATIONS_COMPTABLES_MOCK.reduce((acc, o) => acc + o.credit, 0)
  ) < 0.01,
};

// ============================================
// HELPERS
// ============================================

export function getOperationById(id: string): OperationComptable | undefined {
  return OPERATIONS_COMPTABLES_MOCK.find((o) => o.id === id);
}

export function getOperationsByExercice(exercice: number): OperationComptable[] {
  return OPERATIONS_COMPTABLES_MOCK.filter((o) => o.exercice === exercice);
}

export function getOperationsByCompte(compte: string): OperationComptable[] {
  return OPERATIONS_COMPTABLES_MOCK.filter((o) => o.compte === compte);
}

export function getOperationsByJournal(journal: TypeJournal): OperationComptable[] {
  return OPERATIONS_COMPTABLES_MOCK.filter((o) => o.journal === journal);
}

export function getOperationsByPeriode(debut: string, fin: string): OperationComptable[] {
  return OPERATIONS_COMPTABLES_MOCK.filter((o) => o.date >= debut && o.date <= fin);
}

/**
 * Calcule le solde d'un compte à une date donnée
 */
export function calculerSoldeCompte(compte: string, dateFin: string): number {
  const operations = OPERATIONS_COMPTABLES_MOCK.filter(
    (o) => o.compte === compte && o.date <= dateFin
  );

  return operations.reduce((solde, o) => {
    // Pour les comptes ACTIF et CHARGE : débit augmente, crédit diminue
    // Pour les comptes PASSIF et PRODUIT : crédit augmente, débit diminue
    if (o.type_compte === 'ACTIF' || o.type_compte === 'CHARGE') {
      return solde + o.debit - o.credit;
    } else {
      return solde + o.credit - o.debit;
    }
  }, 0);
}

/**
 * Génère la balance des comptes
 */
export function genererBalance(dateFin: string): Array<{
  compte: string;
  compte_label: string;
  type_compte: TypeCompteOperation;
  total_debit: number;
  total_credit: number;
  solde: number;
}> {
  const comptesUniques = Array.from(new Set(OPERATIONS_COMPTABLES_MOCK.map((o) => o.compte)));

  return comptesUniques.map((compte) => {
    const operations = OPERATIONS_COMPTABLES_MOCK.filter(
      (o) => o.compte === compte && o.date <= dateFin
    );

    const total_debit = operations.reduce((acc, o) => acc + o.debit, 0);
    const total_credit = operations.reduce((acc, o) => acc + o.credit, 0);
    const firstOp = operations[0];

    let solde = total_debit - total_credit;
    if (firstOp?.type_compte === 'PASSIF' || firstOp?.type_compte === 'PRODUIT') {
      solde = total_credit - total_debit;
    }

    return {
      compte,
      compte_label: firstOp?.compte_label || compte,
      type_compte: firstOp?.type_compte || 'ACTIF',
      total_debit,
      total_credit,
      solde,
    };
  }).sort((a, b) => a.compte.localeCompare(b.compte));
}

/**
 * Vérifie l'équilibre d'une écriture comptable (partie double)
 */
export function verifierEquilibreEcriture(numeroPiece: string): {
  equilibre: boolean;
  debit: number;
  credit: number;
  ecart: number;
} {
  const operations = OPERATIONS_COMPTABLES_MOCK.filter(
    (o) => o.numero_piece === numeroPiece
  );

  const debit = operations.reduce((acc, o) => acc + o.debit, 0);
  const credit = operations.reduce((acc, o) => acc + o.credit, 0);
  const ecart = Math.abs(debit - credit);

  return {
    equilibre: ecart < 0.01,
    debit,
    credit,
    ecart,
  };
}

// ============================================
// ÉTAT DE CLÔTURE
// ============================================

export interface EtatCloture {
  exercice: number;
  is_cloture: boolean;
  mouvements_non_categorises: number;
  alertes: string[];
}

export const ETAT_CLOTURE_2024: EtatCloture = {
  exercice: 2024,
  is_cloture: false,
  mouvements_non_categorises: 2,
  alertes: [
    '2 mouvements bancaires non catégorisés',
    '1 facture en attente de validation comptable',
  ],
};
