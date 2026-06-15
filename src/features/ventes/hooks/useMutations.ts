'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import {
  fetchMutations,
  createMutation,
  cancelMutation,
  generateEtatDate,
} from '../api/mutationsApi';
import type {
  MutationOverview,
  MutationsStats,
  MutationsFilters,
  MutationStatus,
  MutationType,
  CreateMutationInput,
  SnapshotType,
} from '../domain/types';

const DEFAULT_FILTERS: MutationsFilters = {
  search: '',
  status: 'ALL',
  mutation_type: 'ALL',
};

export function useMutations(initialFilters?: Partial<MutationsFilters>) {
  const { currentCoproId } = useCopro();

  const [mutations, setMutations] = useState<MutationOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MutationsFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Charger les mutations
  const loadMutations = useCallback(async () => {
    if (!currentCoproId) {
      setMutations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchMutations(currentCoproId);
      setMutations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  // Charger au montage et quand la copro change
  useEffect(() => {
    loadMutations();
  }, [loadMutations]);

  // Filtrer les mutations
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      // Filtre recherche
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          m.lot_ref.toLowerCase().includes(search) ||
          m.seller_name.toLowerCase().includes(search) ||
          m.buyer_name?.toLowerCase().includes(search) ||
          m.notary_name?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Filtre status
      if (filters.status !== 'ALL' && m.status !== filters.status) {
        return false;
      }

      // Filtre type
      if (filters.mutation_type !== 'ALL' && m.mutation_type !== filters.mutation_type) {
        return false;
      }

      return true;
    });
  }, [mutations, filters]);

  // Calculer les stats
  const stats = useMemo<MutationsStats>(() => {
    const draft = mutations.filter((m) => m.status === 'draft').length;
    const pre_etat_generated = mutations.filter((m) => m.status === 'pre_etat_generated').length;
    const etat_generated = mutations.filter((m) => m.status === 'etat_generated').length;
    const sent_to_notary = mutations.filter((m) => m.status === 'sent_to_notary').length;
    const signed = mutations.filter((m) => m.status === 'signed').length;
    const validated = mutations.filter((m) => m.status === 'validated').length;
    const cancelled = mutations.filter((m) => m.status === 'cancelled').length;

    // Documents manquants: mutations sans pré-état ou état final
    const documentsManquants = mutations.filter(
      (m) => m.status !== 'validated' && m.status !== 'cancelled' && (!m.has_pre_etat || !m.has_final_etat)
    ).length;

    return {
      total: mutations.length,
      draft,
      pre_etat_generated,
      etat_generated,
      sent_to_notary,
      signed,
      validated,
      cancelled,
      enCours: draft + pre_etat_generated + etat_generated + sent_to_notary + signed,
      documentsManquants,
    };
  }, [mutations]);

  // Actions
  const handleCreateMutation = useCallback(
    async (input: Omit<CreateMutationInput, 'copro_id'>) => {
      if (!currentCoproId) throw new Error('Aucune copropriété sélectionnée');

      const mutation = await createMutation({
        ...input,
        copro_id: currentCoproId,
      });

      await loadMutations();
      return mutation;
    },
    [currentCoproId, loadMutations]
  );

  const handleCancelMutation = useCallback(
    async (mutationId: string) => {
      await cancelMutation(mutationId);
      await loadMutations();
    },
    [loadMutations]
  );

  const handleGenerateEtatDate = useCallback(
    async (mutationId: string, snapshotType: SnapshotType) => {
      if (!currentCoproId) throw new Error('Aucune copropriété sélectionnée');

      const result = await generateEtatDate(currentCoproId, mutationId, snapshotType);

      if (result.success) {
        await loadMutations();
      }

      return result;
    },
    [currentCoproId, loadMutations]
  );

  // Setters filtres
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status: MutationStatus | 'ALL') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setTypeFilter = useCallback((mutation_type: MutationType | 'ALL') => {
    setFilters((prev) => ({ ...prev, mutation_type }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    // Data
    mutations,
    filteredMutations,
    isLoading,
    error,
    stats,

    // Filters
    filters,
    setSearch,
    setStatusFilter,
    setTypeFilter,
    resetFilters,

    // Actions
    createMutation: handleCreateMutation,
    cancelMutation: handleCancelMutation,
    generateEtatDate: handleGenerateEtatDate,
    refresh: loadMutations,
  };
}
