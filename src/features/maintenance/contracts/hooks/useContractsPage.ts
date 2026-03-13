'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useContracts } from '@/hooks/modules/useContracts';
import { useToast } from '@/providers/ToastProvider';
import { ContratDetaille } from '@/types';
import { getJoursDepuisExpiration } from '@/components/features/maintenance/Contracts';
import {
  renouvelerContrat,
  resilierContrat
} from '@/lib/services/contracts.service';

export interface ContratExpireDecision {
  contrat: ContratDetaille;
  joursDepasses: number;
}

export function useContractsPage() {
  const router = useRouter();
  const contracts = useContracts();
  const { showToast } = useToast();

  const [contratExpireDecision, setContratExpireDecision] = useState<ContratExpireDecision | null>(null);

  const handleVoirDetails = useCallback((contrat: { id: string }) => {
    router.push(`/maintenance/contracts/${contrat.id}`);
  }, [router]);

  const handleOpenDecisionModal = useCallback((contrat: ContratDetaille) => {
    const joursDepasses = getJoursDepuisExpiration(contrat.dateFin);
    if (joursDepasses > 0) {
      setContratExpireDecision({ contrat, joursDepasses });
    }
  }, []);

  const handleRenouvelerContrat = useCallback((contrat: ContratDetaille, nouvelleDateFin: string) => {
    const result = renouvelerContrat(contrat.id, nouvelleDateFin);
    if (result) {
      showToast({
        type: 'success',
        message: `Contrat "${contrat.nom}" renouvele jusqu'au ${new Date(nouvelleDateFin).toLocaleDateString('fr-FR')}`
      });
    }
    setContratExpireDecision(null);
  }, [contracts]);

  const handleResilierContratExpire = useCallback((contrat: ContratDetaille, raison: string, archiver: boolean) => {
    const result = resilierContrat(contrat.id, raison, archiver);
    if (result) {
      showToast({
        type: 'success',
        message: `Contrat "${contrat.nom}" resilie${archiver ? ' et archive' : ''}`
      });
    }
    setContratExpireDecision(null);
  }, [contracts]);

  const handleResiliationConfirm = useCallback(() => {
    if (contracts.contratToResiliate) {
      contracts.setContratToResiliate(null);
    }
  }, [contracts]);

  const handleGenerateOrder = useCallback((osData: Record<string, unknown>) => {
    const existingOS = JSON.parse(localStorage.getItem('custom_ordres_service') || '[]');
    const newOS = {
      ...osData,
      id: `os-gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    localStorage.setItem('custom_ordres_service', JSON.stringify([...existingOS, newOS]));
    showToast({
      type: 'success',
      message: `Ordre de service genere : ${(newOS as { titre?: string }).titre || 'Sans titre'}`
    });
  }, [contracts]);

  return {
    ...contracts,
    contratExpireDecision,
    setContratExpireDecision,
    handleVoirDetails,
    handleOpenDecisionModal,
    handleRenouvelerContrat,
    handleResilierContratExpire,
    handleResiliationConfirm,
    handleGenerateOrder,
  };
}
