'use client';

/**
 * Finance-specific hooks built on useAsyncData
 * Ready to swap mock API for real API without changing hook signatures
 */

import { financeApi } from '@/shared/services/financeApi';
import type {
  MockCopropriete,
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
import type { ID } from '@/types/common';
import {
  useAsyncData,
  useAsyncList,
  useMutation,
  usePaginatedData,
  type UseAsyncDataOptions,
} from './useAsyncData';

// ============================================
// COPROPRIETE
// ============================================

export function useCopropriete(options?: UseAsyncDataOptions<MockCopropriete>) {
  return useAsyncData(() => financeApi.copropriete.get(), options);
}

export function useUpdateCopropriete() {
  return useMutation((updates: Partial<MockCopropriete>) =>
    financeApi.copropriete.update(updates)
  );
}

// ============================================
// COPROPRIETAIRES
// ============================================

export function useCoproprietaires(
  filter?: Partial<MockCoproprietaire>,
  options?: UseAsyncDataOptions<MockCoproprietaire[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.coproprietaires.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useCoproprietairesPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.coproprietaires.list(filters),
    options
  );
}

export function useCoproprietaire(id: ID | null, options?: UseAsyncDataOptions<MockCoproprietaire>) {
  return useAsyncData(
    () => (id ? financeApi.coproprietaires.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

export function useCreateCoproprietaire() {
  return useMutation((data: Omit<MockCoproprietaire, 'id'>) =>
    financeApi.coproprietaires.create(data)
  );
}

export function useUpdateCoproprietaire() {
  return useMutation(({ id, ...updates }: Partial<MockCoproprietaire> & { id: ID }) =>
    financeApi.coproprietaires.update(id, updates)
  );
}

export function useDeleteCoproprietaire() {
  return useMutation((id: ID) => financeApi.coproprietaires.delete(id));
}

// ============================================
// LOTS
// ============================================

export function useLots(
  filter?: Partial<MockLot>,
  options?: UseAsyncDataOptions<MockLot[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.lots.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useLotsByCoproprietaire(coproprietaireId: ID | null) {
  return useAsyncList(
    () =>
      coproprietaireId
        ? financeApi.lots.getByCoproprietaire(coproprietaireId)
        : Promise.resolve({ success: false, error: 'No ID', data: [] }),
    { deps: [coproprietaireId], immediate: !!coproprietaireId }
  );
}

export function useCreateLot() {
  return useMutation((data: Omit<MockLot, 'id'>) => financeApi.lots.create(data));
}

export function useUpdateLot() {
  return useMutation(({ id, ...updates }: Partial<MockLot> & { id: ID }) =>
    financeApi.lots.update(id, updates)
  );
}

export function useDeleteLot() {
  return useMutation((id: ID) => financeApi.lots.delete(id));
}

// ============================================
// EXERCICES
// ============================================

export function useExercices(options?: UseAsyncDataOptions<MockExercice[]>) {
  return useAsyncData(
    async () => {
      const result = await financeApi.exercices.list();
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    options
  );
}

export function useCurrentExercice(options?: UseAsyncDataOptions<MockExercice>) {
  return useAsyncData(() => financeApi.exercices.getCurrent(), options);
}

export function useExercice(id: ID | null, options?: UseAsyncDataOptions<MockExercice>) {
  return useAsyncData(
    () => (id ? financeApi.exercices.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

// ============================================
// BUDGETS
// ============================================

export function useBudgets(
  filter?: Partial<MockBudget>,
  options?: UseAsyncDataOptions<MockBudget[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.budgets.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useBudgetsByYear(annee: number, options?: UseAsyncDataOptions<MockBudget[]>) {
  return useAsyncList(() => financeApi.budgets.getByYear(annee), {
    ...options,
    deps: [annee, ...(options?.deps || [])],
  });
}

export function useBudget(id: ID | null, options?: UseAsyncDataOptions<MockBudget>) {
  return useAsyncData(
    () => (id ? financeApi.budgets.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

export function useCreateBudget() {
  return useMutation((data: Omit<MockBudget, 'id'>) => financeApi.budgets.create(data));
}

export function useUpdateBudget() {
  return useMutation(({ id, ...updates }: Partial<MockBudget> & { id: ID }) =>
    financeApi.budgets.update(id, updates)
  );
}

export function useDeleteBudget() {
  return useMutation((id: ID) => financeApi.budgets.delete(id));
}

// ============================================
// APPELS DE FONDS
// ============================================

export function useAppelsFonds(
  filter?: Partial<MockAppelFonds>,
  options?: UseAsyncDataOptions<MockAppelFonds[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.appelsFonds.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useAppelsFondsPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.appelsFonds.list(filters),
    options
  );
}

export function useAppelsFondsByBudget(budgetId: ID | null) {
  return useAsyncList(
    () =>
      budgetId
        ? financeApi.appelsFonds.getByBudget(budgetId)
        : Promise.resolve({ success: false, error: 'No ID', data: [] }),
    { deps: [budgetId], immediate: !!budgetId }
  );
}

export function useAppelsFondsByExercice(exerciceId: ID | null) {
  return useAsyncList(
    () =>
      exerciceId
        ? financeApi.appelsFonds.getByExercice(exerciceId)
        : Promise.resolve({ success: false, error: 'No ID', data: [] }),
    { deps: [exerciceId], immediate: !!exerciceId }
  );
}

export function useAppelFonds(id: ID | null, options?: UseAsyncDataOptions<MockAppelFonds>) {
  return useAsyncData(
    () => (id ? financeApi.appelsFonds.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

export function useCreateAppelFonds() {
  return useMutation((data: Omit<MockAppelFonds, 'id' | 'lignes'>) =>
    financeApi.appelsFonds.create(data)
  );
}

export function useUpdateAppelFonds() {
  return useMutation(({ id, ...updates }: Partial<MockAppelFonds> & { id: ID }) =>
    financeApi.appelsFonds.update(id, updates)
  );
}

// ============================================
// PAIEMENTS
// ============================================

export function usePaiements(
  filter?: Partial<MockPaiement>,
  options?: UseAsyncDataOptions<MockPaiement[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.paiements.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function usePaiementsPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.paiements.list(filters),
    options
  );
}

export function usePaiementsByCoproprietaire(coproprietaireId: ID | null) {
  return useAsyncList(
    () =>
      coproprietaireId
        ? financeApi.paiements.getByCoproprietaire(coproprietaireId)
        : Promise.resolve({ success: false, error: 'No ID', data: [] }),
    { deps: [coproprietaireId], immediate: !!coproprietaireId }
  );
}

export function usePaiementsByAppel(appelFondsId: ID | null) {
  return useAsyncList(
    () =>
      appelFondsId
        ? financeApi.paiements.getByAppel(appelFondsId)
        : Promise.resolve({ success: false, error: 'No ID', data: [] }),
    { deps: [appelFondsId], immediate: !!appelFondsId }
  );
}

export function useCreatePaiement() {
  return useMutation((data: Omit<MockPaiement, 'id'>) => financeApi.paiements.create(data));
}

export function useUpdatePaiement() {
  return useMutation(({ id, ...updates }: Partial<MockPaiement> & { id: ID }) =>
    financeApi.paiements.update(id, updates)
  );
}

export function useDeletePaiement() {
  return useMutation((id: ID) => financeApi.paiements.delete(id));
}

// ============================================
// FACTURES
// ============================================

export function useFactures(
  filter?: Partial<MockFacture>,
  options?: UseAsyncDataOptions<MockFacture[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.factures.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useFacturesPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.factures.list(filters),
    options
  );
}

export function useFacture(id: ID | null, options?: UseAsyncDataOptions<MockFacture>) {
  return useAsyncData(
    () => (id ? financeApi.factures.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

export function useFacturesByStatut(statut: MockFacture['statut']) {
  return useAsyncList(() => financeApi.factures.getByStatut(statut), {
    deps: [statut],
  });
}

export function useCreateFacture() {
  return useMutation((data: Omit<MockFacture, 'id'>) => financeApi.factures.create(data));
}

export function useUpdateFacture() {
  return useMutation(({ id, ...updates }: Partial<MockFacture> & { id: ID }) =>
    financeApi.factures.update(id, updates)
  );
}

export function useDeleteFacture() {
  return useMutation((id: ID) => financeApi.factures.delete(id));
}

// ============================================
// FOURNISSEURS
// ============================================

export function useFournisseurs(options?: UseAsyncDataOptions<MockFournisseur[]>) {
  return useAsyncData(
    async () => {
      const result = await financeApi.fournisseurs.list();
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    options
  );
}

export function useFournisseursPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.fournisseurs.list(filters),
    options
  );
}

export function useFournisseur(id: ID | null, options?: UseAsyncDataOptions<MockFournisseur>) {
  return useAsyncData(
    () => (id ? financeApi.fournisseurs.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

export function useCreateFournisseur() {
  return useMutation((data: Omit<MockFournisseur, 'id'>) =>
    financeApi.fournisseurs.create(data)
  );
}

export function useUpdateFournisseur() {
  return useMutation(({ id, ...updates }: Partial<MockFournisseur> & { id: ID }) =>
    financeApi.fournisseurs.update(id, updates)
  );
}

export function useDeleteFournisseur() {
  return useMutation((id: ID) => financeApi.fournisseurs.delete(id));
}

// ============================================
// MOUVEMENTS BANCAIRES
// ============================================

export function useMouvementsBancaires(
  filter?: Partial<MockMouvementBancaire>,
  options?: UseAsyncDataOptions<MockMouvementBancaire[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.mouvementsBancaires.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useMouvementsBancairesPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.mouvementsBancaires.list(filters),
    options
  );
}

export function useMouvementsARapprocher() {
  return useAsyncList(() => financeApi.mouvementsBancaires.getByStatut('A_RAPPROCHER'));
}

export function useCreateMouvementBancaire() {
  return useMutation((data: Omit<MockMouvementBancaire, 'id'>) =>
    financeApi.mouvementsBancaires.create(data)
  );
}

export function useRapprocherMouvement() {
  return useMutation(({ id, ecritureId }: { id: ID; ecritureId: ID }) =>
    financeApi.mouvementsBancaires.rapprocher(id, ecritureId)
  );
}

// ============================================
// ECRITURES COMPTABLES
// ============================================

export function useEcritures(
  filter?: Partial<MockEcritureComptable>,
  options?: UseAsyncDataOptions<MockEcritureComptable[]>
) {
  return useAsyncData(
    async () => {
      const result = await financeApi.ecritures.list({ filter });
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    { ...options, deps: [JSON.stringify(filter), ...(options?.deps || [])] }
  );
}

export function useEcrituresPaginated(options?: {
  initialPage?: number;
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortOrder?: 'asc' | 'desc';
}) {
  return usePaginatedData(
    (filters) => financeApi.ecritures.list(filters),
    options
  );
}

export function useEcrituresByExercice(exerciceId: ID | null) {
  return useAsyncList(
    () =>
      exerciceId
        ? financeApi.ecritures.getByExercice(exerciceId)
        : Promise.resolve({ success: false, error: 'No ID', data: [] }),
    { deps: [exerciceId], immediate: !!exerciceId }
  );
}

export function useEcrituresByJournal(journalCode: string) {
  return useAsyncList(() => financeApi.ecritures.getByJournal(journalCode), {
    deps: [journalCode],
  });
}

export function useEcrituresByCompte(compteNumero: string) {
  return useAsyncList(() => financeApi.ecritures.getByCompte(compteNumero), {
    deps: [compteNumero],
  });
}

export function useCreateEcriture() {
  return useMutation((data: Omit<MockEcritureComptable, 'id'>) =>
    financeApi.ecritures.create(data)
  );
}

// ============================================
// COMPTES COMPTABLES
// ============================================

export function useComptesComptables(options?: UseAsyncDataOptions<MockCompteComptable[]>) {
  return useAsyncData(
    async () => {
      const result = await financeApi.comptesComptables.list();
      return { success: result.success, data: result.data?.data, error: result.error };
    },
    options
  );
}

export function useCompteComptable(id: ID | null, options?: UseAsyncDataOptions<MockCompteComptable>) {
  return useAsyncData(
    () => (id ? financeApi.comptesComptables.getById(id) : Promise.resolve({ success: false, error: 'No ID' })),
    { ...options, deps: [id, ...(options?.deps || [])], immediate: !!id }
  );
}

export function useCompteComptableByNumero(numero: string, options?: UseAsyncDataOptions<MockCompteComptable>) {
  return useAsyncData(
    () => (numero ? financeApi.comptesComptables.getByNumero(numero) : Promise.resolve({ success: false, error: 'No numero' })),
    { ...options, deps: [numero, ...(options?.deps || [])], immediate: !!numero }
  );
}

// ============================================
// STATS
// ============================================

import type { FinanceStats } from '@/shared/services/financeApi';

export function useFinanceStats(options?: UseAsyncDataOptions<FinanceStats>) {
  return useAsyncData(() => financeApi.stats.getStats(), options);
}

// ============================================
// ADMIN
// ============================================

export function useResetFinanceData() {
  return useMutation(() => financeApi.admin.resetData());
}
