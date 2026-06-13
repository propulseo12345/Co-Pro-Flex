'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useContracts } from '@/hooks/modules/useContracts';
import { useToast } from '@/providers/ToastProvider';
import { ContratDetaille } from '@/types';
import { getJoursDepuisExpiration } from '@/components/features/maintenance/Contracts';
import {
  renouvelerContrat,
  resilierContrat
} from '@/lib/services/contracts.service';
import { useContracts as useContractsSupabase, useServiceOrders as useServiceOrdersSupabase } from '@/hooks/modules/useMaintenanceData';
import { createClient } from '@/lib/supabase/client';

export interface ContratExpireDecision {
  contrat: ContratDetaille;
  joursDepasses: number;
}

export interface PendingRenewal {
  nouvelleDateFin: string;
  dateEnvoi: string;
  emailEnvoye: boolean;
}

export function useContractsPage() {
  const router = useRouter();
  const contracts = useContracts();
  const { showToast } = useToast();
  const { updateContract, terminateContract } = useContractsSupabase({ autoFetch: false });
  const supabase = useMemo(() => createClient(), []);

  const [contratExpireDecision, setContratExpireDecision] = useState<ContratExpireDecision | null>(null);

  // Pending renewals — persistées en Supabase (contracts avec status = 'pending_renewal')
  // + fallback localStorage pour compatibilité offline
  const [pendingRenewals, setPendingRenewals] = useState<Record<string, PendingRenewal>>({});

  // Charger les pending renewals depuis Supabase au mount
  useEffect(() => {
    async function loadPendingRenewals() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('contracts')
          .select('id, end_date, updated_at')
          .eq('status', 'pending_renewal');
        if (data && data.length > 0) {
          const renewals: Record<string, PendingRenewal> = {};
          for (const c of data) {
            renewals[c.id] = {
              nouvelleDateFin: c.end_date || '',
              dateEnvoi: c.updated_at || '',
              emailEnvoye: true,
            };
          }
          setPendingRenewals(renewals);
          return;
        }
      } catch {
        // Fallback localStorage
      }
      // Fallback : lire depuis localStorage si Supabase échoue
      try {
        const stored = localStorage.getItem('coproflex_pending_renewals');
        if (stored) setPendingRenewals(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    loadPendingRenewals();
  }, [supabase]);

  const handleVoirDetails = useCallback((contrat: { id: string }) => {
    router.push(`/maintenance/contracts/${contrat.id}`);
  }, [router]);

  const handleOpenDecisionModal = useCallback((contrat: ContratDetaille) => {
    const joursDepasses = getJoursDepuisExpiration(contrat.dateFin);
    setContratExpireDecision({ contrat, joursDepasses });
  }, []);

  const handleRenouvelerContrat = useCallback(async (contrat: ContratDetaille, nouvelleDateFin: string) => {
    // Persister en Supabase avec status pending_renewal
    try {
      await updateContract(contrat.id, {
        status: 'to_renew',
        end_date: nouvelleDateFin,
      });
    } catch {
      // Fallback localStorage si Supabase échoue
      const fallback = JSON.parse(localStorage.getItem('coproflex_pending_renewals') || '{}');
      fallback[contrat.id] = { nouvelleDateFin, dateEnvoi: new Date().toISOString(), emailEnvoye: true };
      localStorage.setItem('coproflex_pending_renewals', JSON.stringify(fallback));
    }
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
  }, [showToast, updateContract]);

  const handleConfirmerRenouvellement = useCallback(async (contratId: string) => {
    const pending = pendingRenewals[contratId];
    if (!pending) return;

    // Supabase-first : activer le contrat avec nouvelle date
    try {
      await updateContract(contratId, {
        status: 'active',
        end_date: pending.nouvelleDateFin,
        start_date: new Date().toISOString().split('T')[0],
      });
    } catch (err) {
      console.error('[Supabase] Failed to confirm renewal:', err);
      // Fallback local
      renouvelerContrat(contratId, pending.nouvelleDateFin);
    }

    setPendingRenewals(prev => {
      const next = { ...prev };
      delete next[contratId];
      return next;
    });
    // Nettoyer le localStorage fallback
    try {
      const stored = JSON.parse(localStorage.getItem('coproflex_pending_renewals') || '{}');
      delete stored[contratId];
      localStorage.setItem('coproflex_pending_renewals', JSON.stringify(stored));
    } catch { /* ignore */ }

    showToast({
      type: 'success',
      message: `Renouvellement confirmé jusqu'au ${new Date(pending.nouvelleDateFin).toLocaleDateString('fr-FR')}`
    });
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

  const handleResilierContratExpire = useCallback(async (contrat: ContratDetaille, raison: string, archiver: boolean) => {
    // Supabase-first
    try {
      await terminateContract(contrat.id, raison);
    } catch (err) {
      console.error('[Supabase] Failed to terminate contract:', err);
      // Fallback local
      resilierContrat(contrat.id, raison, archiver);
    }

    showToast({
      type: 'success',
      message: `Contrat "${contrat.nom}" résilié${archiver ? ' et archivé' : ''}`
    });
    setContratExpireDecision(null);
  }, [showToast, terminateContract]);

  const handleResiliationConfirm = useCallback(() => {
    if (contracts.contratToResiliate) {
      contracts.setContratToResiliate(null);
    }
  }, [contracts]);

  const { createOrder } = useServiceOrdersSupabase({ autoFetch: false });

  const handleGenerateOrder = useCallback(async (osData: Record<string, unknown>) => {
    try {
      await createOrder({
        copro_id: '', // Rempli par le hook createOrder
        order_number: '', // Généré par le hook createOrder (RPC)
        tiers_id: (osData.fournisseurId as string) || '',
        title: (osData.titre as string) || 'Ordre de service',
        description: (osData.description as string) || null,
        order_type: osData.typeOrdre === 'CONTRACTUEL' ? 'contrat' : 'classique',
        origin: 'contrat',
        contract_id: (osData.contratId as string) || null,
        urgency: 'normal',
        estimated_amount: (osData.montantEstime as number) || null,
        is_art18_emergency: false,
      });
      showToast({
        type: 'success',
        message: `Ordre de service généré : ${(osData.titre as string) || 'Sans titre'}`
      });
    } catch (err) {
      // Fallback localStorage — l'OS n'est PAS en base : ne pas le présenter comme un succès.
      const existingOS = JSON.parse(localStorage.getItem('custom_ordres_service') || '[]');
      const newOS = { ...osData, id: `os-gen-${Date.now()}` };
      localStorage.setItem('custom_ordres_service', JSON.stringify([...existingOS, newOS]));
      showToast({
        type: 'error',
        message: `Échec de création en base (${err instanceof Error ? err.message : 'erreur inconnue'}) — copie sauvegardée localement`
      });
    }
  }, [createOrder, showToast]);

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
