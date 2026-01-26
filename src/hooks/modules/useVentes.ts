'use client';

import { useState, useMemo, useCallback } from 'react';
import { useVentesContext } from '@/providers/VentesProvider';
import type {
  Vente,
  VentesStats,
  VentesFilters,
  VenteStatut,
} from '@/types/models/vente';

const DEFAULT_FILTERS: VentesFilters = {
  search: '',
  statut: 'TOUS',
  lotType: 'TOUS',
};

export function useVentes(initialFilters?: Partial<VentesFilters>) {
  const context = useVentesContext();
  const [filters, setFilters] = useState<VentesFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Ventes filtrées
  const filteredVentes = useMemo(() => {
    return context.ventes.filter((vente) => {
      // Filtre par recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          vente.vendeur.toLowerCase().includes(searchLower) ||
          vente.acquereur?.toLowerCase().includes(searchLower) ||
          vente.notaire?.toLowerCase().includes(searchLower) ||
          vente.lotIds.some((lot) => lot.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Filtre par statut
      if (filters.statut !== 'TOUS' && vente.statut !== filters.statut) {
        return false;
      }

      // Filtre par type de lot
      if (filters.lotType !== 'TOUS' && !vente.lotTypes.includes(filters.lotType)) {
        return false;
      }

      return true;
    });
  }, [context.ventes, filters]);

  // Statistiques
  const stats = useMemo<VentesStats>(() => {
    const ventes = context.ventes;
    return {
      total: ventes.length,
      enCours: ventes.filter((v) => v.statut === 'EN_COURS').length,
      terminees: ventes.filter((v) => v.statut === 'TERMINEE').length,
      annulees: ventes.filter((v) => v.statut === 'ANNULEE').length,
    };
  }, [context.ventes]);

  // Types de lots uniques pour le filtre
  const lotTypes = useMemo(() => {
    const types = new Set<string>();
    context.ventes.forEach((vente) => {
      vente.lotTypes.forEach((type) => types.add(type));
    });
    return Array.from(types).sort();
  }, [context.ventes]);

  // Mettre à jour les filtres
  const updateFilters = useCallback((newFilters: Partial<VentesFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  // Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Recherche rapide
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  // Filtre statut
  const setStatutFilter = useCallback((statut: VenteStatut | 'TOUS') => {
    setFilters((prev) => ({ ...prev, statut }));
  }, []);

  // Filtre type de lot
  const setLotTypeFilter = useCallback((lotType: string) => {
    setFilters((prev) => ({ ...prev, lotType }));
  }, []);

  return {
    // Données du context
    ventes: context.ventes,
    filteredVentes,
    isLoading: context.isLoading,
    stats,
    lotTypes,

    // CRUD (passthrough du context)
    createVente: context.createVente,
    updateVente: context.updateVente,
    deleteVente: context.deleteVente,
    getVenteById: context.getVenteById,

    // Documents
    addDocument: context.addDocument,
    updateDocumentStatus: context.updateDocumentStatus,

    // Workflow
    advanceWorkflow: context.advanceWorkflow,
    updateStatut: context.updateStatut,

    // Historique
    addHistorique: context.addHistorique,

    // Filtres
    filters,
    updateFilters,
    resetFilters,
    setSearch,
    setStatutFilter,
    setLotTypeFilter,
  };
}

export type { Vente, VentesStats, VentesFilters };
