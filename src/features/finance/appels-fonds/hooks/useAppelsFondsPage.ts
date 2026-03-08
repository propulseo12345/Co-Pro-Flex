'use client';

import { useState, useCallback } from 'react';
import { useAppelsFonds } from '@/hooks/modules/useAppelsFonds';
import * as financeApi from '@/lib/finance/api';
import type { AppelFonds } from '@/components/features/finance/AppelsFonds/types';
import type { AppelFondsEmission, LigneAppelEmission } from '@/lib/services/emission-appel.service';
import { AppelFondsStatut } from '@/types/enums/statuts';

export function useAppelsFondsPage() {
  const [showEmissionModal, setShowEmissionModal] = useState(false);
  const [appelAEmettre, setAppelAEmettre] = useState<AppelFonds | null>(null);
  const [appelEmissionConverted, setAppelEmissionConverted] = useState<AppelFondsEmission | null>(null);

  const appelsFonds = useAppelsFonds();

  // Handler to open emission modal — loads lines from Supabase first
  const handleEmettreAppel = useCallback(async (appel: AppelFonds) => {
    setAppelAEmettre(appel);

    // Load call lines from Supabase
    const result = await financeApi.getCallLines(appel.id);
    const lines = result.data || [];

    const lignes: LigneAppelEmission[] = lines.map(line => ({
      id: line.id,
      coproprietaireId: line.lot_id,
      coproprietaireNom: line.owner_name || 'Propriétaire inconnu',
      lots: [line.lot_ref],
      quotePart: 0, // Not available in view
      montantAppele: Number(line.amount_due),
      montantPaye: Number(line.amount_paid),
    }));

    setAppelEmissionConverted({
      id: appel.id,
      numero: parseInt(appel.id, 10) || 1,
      montant: appel.montantTotal,
      montantEncaisse: appel.montantEncaisse || 0,
      date: appel.dateEmission || new Date().toISOString().split('T')[0],
      dateEcheance: appel.dateExigibilite,
      description: appel.description,
      statut: appel.statut === 'A_GENERER' ? AppelFondsStatut.EN_ATTENTE : appel.statut,
      budgetId: appel.budgetTravauxId,
      lignes,
    });

    setShowEmissionModal(true);
  }, []);

  const handleEmissionSuccess = useCallback(async (_result: { nouveauStatut: string }) => {
    await appelsFonds.refreshCalls();
    setShowEmissionModal(false);
    setAppelAEmettre(null);
    setAppelEmissionConverted(null);
  }, [appelsFonds]);

  const handleCloseEmissionModal = useCallback(() => {
    setShowEmissionModal(false);
    setAppelAEmettre(null);
    setAppelEmissionConverted(null);
  }, []);

  return {
    ...appelsFonds,

    showEmissionModal,
    appelAEmettre,
    appelEmissionConverted,

    handleEmettreAppel,
    handleEmissionSuccess,
    handleCloseEmissionModal,
  };
}

export type UseAppelsFondsPageReturn = ReturnType<typeof useAppelsFondsPage>;
