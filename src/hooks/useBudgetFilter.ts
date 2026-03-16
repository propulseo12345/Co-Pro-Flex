'use client';

import { useState, useCallback, useMemo } from 'react';
import { PosteBudget, POSTE_COLORS, DepenseBudget, DonneesRepartition } from '@/components/features/finance/Budget/types';
import { getPosteLabel, getPosteColor } from '@/lib/constants/budget-postes';

interface UseBudgetFilterOptions {
  depenses: DepenseBudget[];
}

interface UseBudgetFilterReturn {
  // État
  posteActif: PosteBudget | null;
  posteLabel: string | null;
  posteCouleur: string | null;
  isFiltered: boolean;

  // Données filtrées
  depensesFiltrees: DepenseBudget[];
  totalFiltre: number;
  nombreDepensesFiltrees: number;

  // Actions
  filtrerParPoste: (posteId: PosteBudget) => void;
  togglePoste: (posteId: PosteBudget) => void;
  resetFiltre: () => void;

  // Stats pour le graphique
  donneesRepartition: DonneesRepartition[];
}

/**
 * Hook pour filtrer les dépenses par poste budgétaire
 * Utilisé par le graphique de répartition interactif
 */
export function useBudgetFilter({
  depenses,
}: UseBudgetFilterOptions): UseBudgetFilterReturn {
  const [posteActif, setPosteActif] = useState<PosteBudget | null>(null);

  // Label et couleur du poste actif
  const posteLabel = useMemo(() => {
    return posteActif ? getPosteLabel(posteActif) : null;
  }, [posteActif]);

  const posteCouleur = useMemo(() => {
    return posteActif ? getPosteColor(posteActif) : null;
  }, [posteActif]);

  // Dépenses filtrées
  const depensesFiltrees = useMemo(() => {
    if (!posteActif) return depenses;
    return depenses.filter((d) => d.poste === posteActif);
  }, [depenses, posteActif]);

  // Total filtré
  const totalFiltre = useMemo(() => {
    return depensesFiltrees.reduce((sum, d) => sum + d.montant, 0);
  }, [depensesFiltrees]);

  // Nombre de dépenses filtrées
  const nombreDepensesFiltrees = depensesFiltrees.length;

  // Données de répartition pour le graphique
  const donneesRepartition = useMemo(() => {
    const statsParPoste = new Map<PosteBudget, { montant: number; count: number }>();

    // Calculer les stats par poste
    depenses.forEach((d) => {
      if (!d.poste) return;
      const current = statsParPoste.get(d.poste) || { montant: 0, count: 0 };
      statsParPoste.set(d.poste, {
        montant: current.montant + d.montant,
        count: current.count + 1,
      });
    });

    // Calculer le total
    const total = depenses.reduce((sum, d) => sum + d.montant, 0);

    // Construire les données de répartition
    const result: DonneesRepartition[] = [];

    statsParPoste.forEach((stats, posteId) => {
      result.push({
        posteId,
        poste: getPosteLabel(posteId),
        montant: stats.montant,
        pourcentage: total > 0 ? (stats.montant / total) * 100 : 0,
        couleur: POSTE_COLORS[posteId] || getPosteColor(posteId),
        nombreDepenses: stats.count,
      });
    });

    // Trier par montant décroissant
    return result.sort((a, b) => b.montant - a.montant);
  }, [depenses]);

  // Actions
  const filtrerParPoste = useCallback((posteId: PosteBudget) => {
    setPosteActif(posteId);
  }, []);

  const togglePoste = useCallback((posteId: PosteBudget) => {
    setPosteActif((prev) => (prev === posteId ? null : posteId));
  }, []);

  const resetFiltre = useCallback(() => {
    setPosteActif(null);
  }, []);

  return {
    posteActif,
    posteLabel,
    posteCouleur,
    isFiltered: posteActif !== null,
    depensesFiltrees,
    totalFiltre,
    nombreDepensesFiltrees,
    filtrerParPoste,
    togglePoste,
    resetFiltre,
    donneesRepartition,
  };
}
