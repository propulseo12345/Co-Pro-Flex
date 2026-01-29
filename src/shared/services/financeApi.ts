/**
 * @deprecated DEPRECATED - Ce fichier ne doit plus être utilisé.
 *
 * Migration Supabase:
 * - Pour les lots: utiliser useLotsData de @/hooks/modules/useLotsData
 * - Pour les copropriétaires: utiliser useCoproData de @/hooks/modules/useCoproData
 * - Pour les budgets: utiliser useBudgetData de @/hooks/modules/useBudgetData
 * - Pour les appels de fonds: utiliser useFinanceData de @/hooks/modules/useFinanceData
 * - Pour la comptabilité: utiliser useFinanceData de @/hooks/modules/useFinanceData
 *
 * Ce fichier existe uniquement pour la compatibilité avec le code legacy.
 * Toutes les méthodes retournent des erreurs ou des données vides.
 *
 * TODO: Supprimer ce fichier une fois tous les imports migrés.
 */

import type { ID, PaginatedResponse } from '@/types/common';
import type {
  MockCleRepartition,
  MockCoproprietaire,
  MockLot,
  MockBudget,
  MockAppelFonds,
  MockPaiement,
  MockFacture,
  MockFournisseur,
  MockExercice,
  MockEcritureComptable,
  MockMouvementBancaire,
  MockCompteComptable,
} from '@/shared/mock/finance';

// ============================================
// API RESPONSE TYPES (kept for backward compat)
// ============================================

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// FINANCE STATS TYPE (kept for backward compat)
// Note: FinanceStats is now defined in hooks/useFinance.ts
// This is kept as a local type for backward compat but not exported
// to avoid collision with the hooks version
// ============================================

interface FinanceStatsLocal {
  soldeCompteBancaire: number;
  totalAppelsEmis: number;
  totalAppelesPaye: number;
  totalImpayes: number;
  nombreImpayes: number;
  tauxRecouvrement: number;
  facturesAPayer: number;
  nombreFacturesAPayer: number;
}

// ============================================
// DEPRECATED STUB IMPLEMENTATIONS
// ============================================

const DEPRECATED_ERROR = 'DEPRECATED: Utiliser les hooks Supabase (useLotsData, useCoproData, useBudgetData, useFinanceData)';

/** @deprecated */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deprecatedMethod = async <T>(..._args: any[]): Promise<ApiResult<T>> => {
  console.warn('[financeApi] ' + DEPRECATED_ERROR);
  return { success: false, error: DEPRECATED_ERROR };
};

/** @deprecated */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deprecatedListMethod = async <T>(..._args: any[]): Promise<ApiResult<PaginatedResponse<T>>> => {
  console.warn('[financeApi] ' + DEPRECATED_ERROR);
  return {
    success: true,
    data: { data: [] as T[], total: 0, page: 1, pageSize: 20, totalPages: 0 }
  };
};

// ============================================
// STUB APIs - All methods return empty/error
// ============================================

/** @deprecated - Utiliser useLotsData ou useCoproData */
export const coproprieteApi = {
  get: deprecatedMethod,
  update: deprecatedMethod,
};

/** @deprecated - Utiliser useCoproData.useCoproprietaires() */
export const coproprietairesApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated - Utiliser useLotsData.useLots() */
export const lotsApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByCoproprietaire: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

// Types pour clesRepartitionApi (compatibilité)
export interface RepartitionLigne {
  lotId: ID;
  lotNumero: string;
  lotType: string;
  coproprietaireId: ID;
  coproprietaireNom: string;
  tantiemes: number;
  pourcentage: number;
  montant: number;
}

export interface RepartitionResult {
  cleId: ID;
  cleNom: string;
  montantTotal: number;
  totalTantiemes: number;
  lignes: RepartitionLigne[];
}

/** @deprecated - Utiliser useLotsData.useRepartitionKeys() */
export const clesRepartitionApi = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: async (..._args: any[]): Promise<ApiResult<PaginatedResponse<MockCleRepartition>>> => {
    console.warn('[financeApi] ' + DEPRECATED_ERROR);
    return {
      success: true,
      data: { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }
    };
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getById: async (..._args: any[]): Promise<ApiResult<MockCleRepartition>> => {
    console.warn('[financeApi] ' + DEPRECATED_ERROR);
    return { success: false, error: DEPRECATED_ERROR };
  },
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculerRepartition: async (..._args: any[]): Promise<ApiResult<RepartitionResult>> => {
    console.warn('[financeApi] ' + DEPRECATED_ERROR);
    return { success: false, error: DEPRECATED_ERROR };
  },
  validerTantiemes: deprecatedMethod,
  getLotsAvecTantiemes: deprecatedMethod,
  updateTantiemesLot: deprecatedMethod,
  recalculerTotal: deprecatedMethod,
};

/** @deprecated - Utiliser useBudgetData.useAccountingPeriods() */
export const exercicesApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getCurrent: deprecatedMethod,
  create: deprecatedMethod,
  update: deprecatedMethod,
};

/** @deprecated - Utiliser useBudgetData.useBudgets() */
export const budgetsApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByExercice: async () => ({ success: true, data: [] }),
  getByYear: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated - Utiliser useFinanceData.useCalls() */
export const appelsFondsApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByBudget: async () => ({ success: true, data: [] }),
  getByExercice: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  updateLigne: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated - Utiliser useFinanceData.usePayments() */
export const paiementsApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByCoproprietaire: async () => ({ success: true, data: [] }),
  getByAppel: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated */
export const facturesApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByFournisseur: async () => ({ success: true, data: [] }),
  getByStatut: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated */
export const fournisseursApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated */
export const mouvementsBancairesApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByStatut: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  rapprocher: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated - Utiliser useFinanceData.useGeneralLedger() */
export const ecrituresApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByExercice: async () => ({ success: true, data: [] }),
  getByJournal: async () => ({ success: true, data: [] }),
  getByCompte: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated - Utiliser useFinanceData.useAccounts() */
export const comptesComptablesApi = {
  list: deprecatedListMethod,
  getById: deprecatedMethod,
  getByNumero: deprecatedMethod,
  getByType: async () => ({ success: true, data: [] }),
  create: deprecatedMethod,
  update: deprecatedMethod,
  delete: deprecatedMethod,
};

/** @deprecated - Utiliser les vues Supabase directement */
export const financeStatsApi = {
  getStats: async (): Promise<ApiResult<FinanceStatsLocal>> => {
    console.warn('[financeApi] ' + DEPRECATED_ERROR);
    return {
      success: true,
      data: {
        soldeCompteBancaire: 0,
        totalAppelsEmis: 0,
        totalAppelesPaye: 0,
        totalImpayes: 0,
        nombreImpayes: 0,
        tauxRecouvrement: 100,
        facturesAPayer: 0,
        nombreFacturesAPayer: 0,
      },
    };
  },
};

/** @deprecated */
export const financeAdminApi = {
  resetData: async () => ({ success: true }),
  exportData: deprecatedMethod,
  importData: async () => ({ success: true }),
};

// ============================================
// UNIFIED FINANCE API OBJECT
// ============================================

/**
 * @deprecated - Ne plus utiliser. Voir les hooks Supabase dans hooks/modules/
 */
export const financeApi = {
  copropriete: coproprieteApi,
  coproprietaires: coproprietairesApi,
  lots: lotsApi,
  clesRepartition: clesRepartitionApi,
  exercices: exercicesApi,
  budgets: budgetsApi,
  appelsFonds: appelsFondsApi,
  paiements: paiementsApi,
  factures: facturesApi,
  fournisseurs: fournisseursApi,
  mouvementsBancaires: mouvementsBancairesApi,
  ecritures: ecrituresApi,
  comptesComptables: comptesComptablesApi,
  stats: financeStatsApi,
  admin: financeAdminApi,
};

export default financeApi;
