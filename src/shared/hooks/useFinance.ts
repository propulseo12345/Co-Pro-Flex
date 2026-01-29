/**
 * @deprecated DEPRECATED - Ces hooks ne doivent plus être utilisés directement.
 *
 * Migration vers Supabase:
 * - useCoproprietaires() → @/hooks/modules/useCoproData
 * - useLots() → @/hooks/modules/useLotsData
 * - useBudgets() → @/hooks/modules/useBudgetData
 * - useAppelsFonds() → @/hooks/modules/useFinanceData (useCalls)
 * - usePaiements() → @/hooks/modules/useFinanceData (usePayments)
 * - useEcritures() → @/hooks/modules/useFinanceData (useGeneralLedger)
 *
 * Ce fichier existe uniquement pour la compatibilité avec le code legacy.
 * Tous les hooks retournent des données vides et émettent un warning.
 *
 * TODO: Supprimer ce fichier une fois tous les imports migrés.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================
// TYPES
// ============================================

export interface FinanceStats {
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
// DEPRECATED WARNING HELPER
// ============================================

const DEPRECATED_MSG = (hookName: string, replacement: string) =>
  `[${hookName}] DEPRECATED - Utiliser ${replacement} à la place`;

function useDeprecatedHook<T>(
  hookName: string,
  replacement: string,
  defaultData: T
): {
  data: T;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [hasWarned, setHasWarned] = useState(false);

  useEffect(() => {
    if (!hasWarned) {
      console.warn(DEPRECATED_MSG(hookName, replacement));
      setHasWarned(true);
    }
  }, [hasWarned, hookName, replacement]);

  return {
    data: defaultData,
    isLoading: false,
    error: null,
    refetch: async () => {
      console.warn(DEPRECATED_MSG(hookName, replacement));
    },
  };
}

// ============================================
// DEPRECATED HOOKS - COPROPRIETAIRES
// ============================================

/** @deprecated - Utiliser useCoproData.useCoproprietaires() */
export function useCopropriete() {
  return useDeprecatedHook('useCopropriete', '@/hooks/modules/useCoproData', null);
}

/** @deprecated - Utiliser useCoproData.useCoproprietaires() */
export function useCoproprietaires() {
  return useDeprecatedHook('useCoproprietaires', '@/hooks/modules/useCoproData', []);
}

/** @deprecated - Utiliser useCoproData.useCoproprietaire() */
export function useCoproprietaire(id: string | null) {
  return useDeprecatedHook('useCoproprietaire', '@/hooks/modules/useCoproData', null);
}

/** @deprecated */
export function useCoproprietairesPaginated() {
  return useDeprecatedHook('useCoproprietairesPaginated', '@/hooks/modules/useCoproData', []);
}

// ============================================
// DEPRECATED HOOKS - LOTS
// ============================================

/** @deprecated - Utiliser useLotsData.useLots() */
export function useLots() {
  return useDeprecatedHook('useLots', '@/hooks/modules/useLotsData', []);
}

/** @deprecated */
export function useLotsByCoproprietaire(coproprietaireId: string | null) {
  return useDeprecatedHook('useLotsByCoproprietaire', '@/hooks/modules/useLotsData', []);
}

// ============================================
// DEPRECATED HOOKS - EXERCICES
// ============================================

/** @deprecated - Utiliser useBudgetData.useAccountingPeriods() */
export function useExercices() {
  return useDeprecatedHook('useExercices', '@/hooks/modules/useBudgetData', []);
}

/** @deprecated */
export function useCurrentExercice() {
  return useDeprecatedHook('useCurrentExercice', '@/hooks/modules/useBudgetData', null);
}

/** @deprecated */
export function useExercice(id: string | null) {
  return useDeprecatedHook('useExercice', '@/hooks/modules/useBudgetData', null);
}

// ============================================
// DEPRECATED HOOKS - BUDGETS
// ============================================

/** @deprecated - Utiliser useBudgetData.useBudgets() */
export function useBudgets() {
  return useDeprecatedHook('useBudgets', '@/hooks/modules/useBudgetData', []);
}

/** @deprecated */
export function useBudgetsByYear(annee: number) {
  return useDeprecatedHook('useBudgetsByYear', '@/hooks/modules/useBudgetData', []);
}

/** @deprecated */
export function useBudget(id: string | null) {
  return useDeprecatedHook('useBudget', '@/hooks/modules/useBudgetData', null);
}

// ============================================
// DEPRECATED HOOKS - APPELS DE FONDS
// ============================================

/** @deprecated - Utiliser useFinanceData.useCalls() */
export function useAppelsFonds() {
  return useDeprecatedHook('useAppelsFonds', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useAppelsFondsPaginated() {
  return useDeprecatedHook('useAppelsFondsPaginated', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useAppelsFondsByBudget(budgetId: string | null) {
  return useDeprecatedHook('useAppelsFondsByBudget', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useAppelsFondsByExercice(exerciceId: string | null) {
  return useDeprecatedHook('useAppelsFondsByExercice', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useAppelFonds(id: string | null) {
  return useDeprecatedHook('useAppelFonds', '@/hooks/modules/useFinanceData', null);
}

// ============================================
// DEPRECATED HOOKS - PAIEMENTS
// ============================================

/** @deprecated - Utiliser useFinanceData.usePayments() */
export function usePaiements() {
  return useDeprecatedHook('usePaiements', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function usePaiementsPaginated() {
  return useDeprecatedHook('usePaiementsPaginated', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function usePaiementsByCoproprietaire(coproprietaireId: string | null) {
  return useDeprecatedHook('usePaiementsByCoproprietaire', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function usePaiementsByAppel(appelFondsId: string | null) {
  return useDeprecatedHook('usePaiementsByAppel', '@/hooks/modules/useFinanceData', []);
}

// ============================================
// DEPRECATED HOOKS - FACTURES
// ============================================

/** @deprecated */
export function useFactures() {
  return useDeprecatedHook('useFactures', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useFacturesPaginated() {
  return useDeprecatedHook('useFacturesPaginated', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useFacture(id: string | null) {
  return useDeprecatedHook('useFacture', '@/hooks/modules/useFinanceData', null);
}

/** @deprecated */
export function useFacturesByStatut(statut: string) {
  return useDeprecatedHook('useFacturesByStatut', '@/hooks/modules/useFinanceData', []);
}

// ============================================
// DEPRECATED HOOKS - FOURNISSEURS
// ============================================

/** @deprecated */
export function useFournisseurs() {
  return useDeprecatedHook('useFournisseurs', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useFournisseursPaginated() {
  return useDeprecatedHook('useFournisseursPaginated', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useFournisseur(id: string | null) {
  return useDeprecatedHook('useFournisseur', '@/hooks/modules/useFinanceData', null);
}

// ============================================
// DEPRECATED HOOKS - MOUVEMENTS BANCAIRES
// ============================================

/** @deprecated */
export function useMouvementsBancaires() {
  return useDeprecatedHook('useMouvementsBancaires', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useMouvementsBancairesPaginated() {
  return useDeprecatedHook('useMouvementsBancairesPaginated', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useMouvementsARapprocher() {
  return useDeprecatedHook('useMouvementsARapprocher', '@/hooks/modules/useFinanceData', []);
}

// ============================================
// DEPRECATED HOOKS - ECRITURES
// ============================================

/** @deprecated - Utiliser useFinanceData.useGeneralLedger() */
export function useEcritures() {
  return useDeprecatedHook('useEcritures', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useEcrituresPaginated() {
  return useDeprecatedHook('useEcrituresPaginated', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useEcrituresByExercice(exerciceId: string | null) {
  return useDeprecatedHook('useEcrituresByExercice', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useEcrituresByJournal(journalCode: string) {
  return useDeprecatedHook('useEcrituresByJournal', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useEcrituresByCompte(compteNumero: string) {
  return useDeprecatedHook('useEcrituresByCompte', '@/hooks/modules/useFinanceData', []);
}

// ============================================
// DEPRECATED HOOKS - COMPTES
// ============================================

/** @deprecated - Utiliser useFinanceData.useAccounts() */
export function useComptesComptables() {
  return useDeprecatedHook('useComptesComptables', '@/hooks/modules/useFinanceData', []);
}

/** @deprecated */
export function useCompteComptable(id: string | null) {
  return useDeprecatedHook('useCompteComptable', '@/hooks/modules/useFinanceData', null);
}

/** @deprecated */
export function useCompteComptableByNumero(numero: string) {
  return useDeprecatedHook('useCompteComptableByNumero', '@/hooks/modules/useFinanceData', null);
}

// ============================================
// DEPRECATED HOOKS - STATS
// ============================================

/** @deprecated - Utiliser les vues Supabase directement */
export function useFinanceStats() {
  const emptyStats: FinanceStats = {
    soldeCompteBancaire: 0,
    totalAppelsEmis: 0,
    totalAppelesPaye: 0,
    totalImpayes: 0,
    nombreImpayes: 0,
    tauxRecouvrement: 100,
    facturesAPayer: 0,
    nombreFacturesAPayer: 0,
  };
  return useDeprecatedHook('useFinanceStats', 'vues Supabase (v_*)', emptyStats);
}

// ============================================
// DEPRECATED HOOKS - MUTATIONS (stubs)
// ============================================

const deprecatedMutation = (name: string) => ({
  mutate: async () => {
    console.warn(`[${name}] DEPRECATED - Utiliser les hooks Supabase`);
    return null;
  },
  mutateAsync: async () => {
    console.warn(`[${name}] DEPRECATED - Utiliser les hooks Supabase`);
    throw new Error('DEPRECATED');
  },
  isLoading: false,
  error: null,
});

/** @deprecated */
export function useUpdateCopropriete() { return deprecatedMutation('useUpdateCopropriete'); }
/** @deprecated */
export function useCreateCoproprietaire() { return deprecatedMutation('useCreateCoproprietaire'); }
/** @deprecated */
export function useUpdateCoproprietaire() { return deprecatedMutation('useUpdateCoproprietaire'); }
/** @deprecated */
export function useDeleteCoproprietaire() { return deprecatedMutation('useDeleteCoproprietaire'); }
/** @deprecated */
export function useCreateLot() { return deprecatedMutation('useCreateLot'); }
/** @deprecated */
export function useUpdateLot() { return deprecatedMutation('useUpdateLot'); }
/** @deprecated */
export function useDeleteLot() { return deprecatedMutation('useDeleteLot'); }
/** @deprecated */
export function useCreateBudget() { return deprecatedMutation('useCreateBudget'); }
/** @deprecated */
export function useUpdateBudget() { return deprecatedMutation('useUpdateBudget'); }
/** @deprecated */
export function useDeleteBudget() { return deprecatedMutation('useDeleteBudget'); }
/** @deprecated */
export function useCreateAppelFonds() { return deprecatedMutation('useCreateAppelFonds'); }
/** @deprecated */
export function useUpdateAppelFonds() { return deprecatedMutation('useUpdateAppelFonds'); }
/** @deprecated */
export function useCreatePaiement() { return deprecatedMutation('useCreatePaiement'); }
/** @deprecated */
export function useUpdatePaiement() { return deprecatedMutation('useUpdatePaiement'); }
/** @deprecated */
export function useDeletePaiement() { return deprecatedMutation('useDeletePaiement'); }
/** @deprecated */
export function useCreateFacture() { return deprecatedMutation('useCreateFacture'); }
/** @deprecated */
export function useUpdateFacture() { return deprecatedMutation('useUpdateFacture'); }
/** @deprecated */
export function useDeleteFacture() { return deprecatedMutation('useDeleteFacture'); }
/** @deprecated */
export function useCreateFournisseur() { return deprecatedMutation('useCreateFournisseur'); }
/** @deprecated */
export function useUpdateFournisseur() { return deprecatedMutation('useUpdateFournisseur'); }
/** @deprecated */
export function useDeleteFournisseur() { return deprecatedMutation('useDeleteFournisseur'); }
/** @deprecated */
export function useCreateMouvementBancaire() { return deprecatedMutation('useCreateMouvementBancaire'); }
/** @deprecated */
export function useRapprocherMouvement() { return deprecatedMutation('useRapprocherMouvement'); }
/** @deprecated */
export function useCreateEcriture() { return deprecatedMutation('useCreateEcriture'); }
/** @deprecated */
export function useResetFinanceData() { return deprecatedMutation('useResetFinanceData'); }
