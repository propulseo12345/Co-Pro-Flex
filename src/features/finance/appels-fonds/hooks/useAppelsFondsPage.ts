'use client';

import { useState, useCallback } from 'react';
import { useAppelsFonds } from '@/hooks/modules/useAppelsFonds';
import type { AppelFonds } from '@/components/features/finance/AppelsFonds/types';
import type { AppelFondsEmission } from '@/lib/services/emission-appel.service';
import { AppelFondsStatut } from '@/types/enums/statuts';

/**
 * Convertit un AppelFonds du module vers AppelFondsEmission pour le service
 */
function convertToEmissionAppel(appel: AppelFonds): AppelFondsEmission {
  return {
    id: appel.id,
    numero: parseInt(appel.id, 10) || 1,
    montant: appel.montantTotal,
    montantEncaisse: appel.montantEncaisse || 0,
    date: appel.dateEmission || new Date().toISOString().split('T')[0],
    dateEcheance: appel.dateExigibilite,
    description: appel.description,
    statut: appel.statut === 'A_GENERER' ? AppelFondsStatut.EN_ATTENTE : appel.statut,
    budgetId: appel.budgetTravauxId,
    lignes: [],
  };
}

export function useAppelsFondsPage() {
  // Local state for emission modal
  const [showEmissionModal, setShowEmissionModal] = useState(false);
  const [appelAEmettre, setAppelAEmettre] = useState<AppelFonds | null>(null);

  const appelsFonds = useAppelsFonds();

  // Handler to open emission modal
  const handleEmettreAppel = useCallback((appel: AppelFonds) => {
    setAppelAEmettre(appel);
    setShowEmissionModal(true);
  }, []);

  // Handler for emission success
  const handleEmissionSuccess = useCallback(async (_result: { nouveauStatut: string }) => {
    await appelsFonds.refreshCalls();
    setShowEmissionModal(false);
    setAppelAEmettre(null);
  }, [appelsFonds]);

  // Handler to close emission modal
  const handleCloseEmissionModal = useCallback(() => {
    setShowEmissionModal(false);
    setAppelAEmettre(null);
  }, []);

  // Convert appel for emission modal
  const appelEmissionConverted = appelAEmettre ? convertToEmissionAppel(appelAEmettre) : null;

  return {
    // From useAppelsFonds
    ...appelsFonds,

    // Emission modal state
    showEmissionModal,
    appelAEmettre,
    appelEmissionConverted,

    // Emission handlers
    handleEmettreAppel,
    handleEmissionSuccess,
    handleCloseEmissionModal,
  };
}

export type UseAppelsFondsPageReturn = ReturnType<typeof useAppelsFondsPage>;
