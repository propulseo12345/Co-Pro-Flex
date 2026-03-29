'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useContracts } from '@/hooks/modules/useContracts';
import { useToast } from '@/providers/ToastProvider';
import { ContratDetaille } from '@/types';
import { getJoursDepuisExpiration } from '@/components/features/maintenance/Contracts';
import {
  renouvelerContrat,
  resilierContrat
} from '@/lib/services/contracts.service';
import { useContracts as useContractsSupabase } from '@/hooks/modules/useMaintenanceData';

export interface ContratExpireDecision {
  contrat: ContratDetaille;
  joursDepasses: number;
}

export interface PendingRenewal {
  nouvelleDateFin: string;
  dateEnvoi: string;
  emailEnvoye: boolean;
}

const PENDING_RENEWALS_KEY = 'coproflex_pending_renewals';

export function useContractsPage() {
  const router = useRouter();
  const contracts = useContracts();
  const { showToast } = useToast();
  const { updateContract, terminateContract } = useContractsSupabase({ autoFetch: false });

  const [contratExpireDecision, setContratExpireDecision] = useState<ContratExpireDecision | null>(null);

  // Pending renewals — persistées en localStorage
  const [pendingRenewals, setPendingRenewals] = useState<Record<string, PendingRenewal>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(PENDING_RENEWALS_KEY) || '{}');
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(PENDING_RENEWALS_KEY, JSON.stringify(pendingRenewals));
  }, [pendingRenewals]);

  const handleVoirDetails = useCallback((contrat: { id: string }) => {
    router.push(`/maintenance/contracts/${contrat.id}`);
  }, [router]);

  const handleOpenDecisionModal = useCallback((contrat: ContratDetaille) => {
    const joursDepasses = getJoursDepuisExpiration(contrat.dateFin);
    setContratExpireDecision({ contrat, joursDepasses });
  }, []);

  const handleRenouvelerContrat = useCallback((contrat: ContratDetaille, nouvelleDateFin: string) => {
    // Ne pas activer le contrat — stocker en attente de confirmation prestataire
    setPendingRenewals(prev => ({
      ...prev,
      [contrat.id]: {
        nouvelleDateFin,
        dateEnvoi: new Date().toISOString(),
        emailEnvoye: true,
      }
    }));
    showToast({
      type: 'info',
      message: `Demande de renouvellement envoyée pour "${contrat.nom}" — en attente de confirmation du prestataire`
    });
    setContratExpireDecision(null);
  }, [showToast]);

  const handleConfirmerRenouvellement = useCallback((contratId: string) => {
    const pending = pendingRenewals[contratId];
    if (!pending) return;
    const result = renouvelerContrat(contratId, pending.nouvelleDateFin);
    if (result) {
      setPendingRenewals(prev => {
        const next = { ...prev };
        delete next[contratId];
        return next;
      });
      showToast({
        type: 'success',
        message: `Renouvellement confirmé jusqu'au ${new Date(pending.nouvelleDateFin).toLocaleDateString('fr-FR')}`
      });

      // Sync renewal to Supabase
      try {
        updateContract(contratId, { status: 'active', end_date: pending.nouvelleDateFin });
      } catch (err) {
        console.error('[Supabase] Failed to sync contract renewal:', err);
      }
    }
  }, [pendingRenewals, showToast, updateContract]);

  const handleAnnulerRenouvellement = useCallback((contratId: string) => {
    setPendingRenewals(prev => {
      const next = { ...prev };
      delete next[contratId];
      return next;
    });
    showToast({
      type: 'info',
      message: 'Demande de renouvellement annulée'
    });
  }, [showToast]);

  const handleResilierContratExpire = useCallback((contrat: ContratDetaille, raison: string, archiver: boolean) => {
    const result = resilierContrat(contrat.id, raison, archiver);
    if (result) {
      showToast({
        type: 'success',
        message: `Contrat "${contrat.nom}" resilie${archiver ? ' et archive' : ''}`
      });

      // Sync termination to Supabase
      try {
        terminateContract(contrat.id, raison);
      } catch (err) {
        console.error('[Supabase] Failed to sync contract termination:', err);
      }
    }
    setContratExpireDecision(null);
  }, [contracts, showToast, terminateContract]);

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
    pendingRenewals,
    handleVoirDetails,
    handleOpenDecisionModal,
    handleRenouvelerContrat,
    handleConfirmerRenouvellement,
    handleAnnulerRenouvellement,
    handleResilierContratExpire,
    handleResiliationConfirm,
    handleGenerateOrder,
  };
}
