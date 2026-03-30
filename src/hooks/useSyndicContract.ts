'use client';

import { useState, useEffect, useMemo } from 'react';
import { fetchSyndicContract, type SyndicContractData } from '@/lib/ag/api/syndic-contract.api';
import type { ContratSyndic } from '@/types';

interface UseSyndicContractReturn {
  contratSyndic: ContratSyndic | undefined;
  syndicInfo: {
    nom: string;
    adresse: string;
    telephone: string;
    email: string;
  };
  raw: SyndicContractData | null;
  isLoading: boolean;
}

/**
 * Hook pour charger le contrat syndic de la copropriété active.
 * Retourne les données sous 2 formats :
 * - `contratSyndic` : format legacy ContratSyndic (pour useGlobalVariables)
 * - `syndicInfo` : format simplifié (pour useResolutionVariables)
 */
export function useSyndicContract(coproId: string | null): UseSyndicContractReturn {
  const [data, setData] = useState<SyndicContractData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!coproId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchSyndicContract(coproId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        // Silently fail — syndic info is not critical
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [coproId]);

  const fullAddress = data
    ? [data.address, data.postalCode, data.city].filter(Boolean).join(' ')
    : '';

  const contratSyndic: ContratSyndic | undefined = data
    ? {
        id: data.id,
        nomSyndic: data.contactName || data.providerName,
        cabinetNom: data.providerName,
        numeroContrat: data.contractNumber || '',
        dateDebut: data.startDate,
        dateFin: data.endDate,
        montantAnnuel: data.annualAmount || 0,
        statut: data.status === 'active' ? 'ACTIF' as ContratSyndic['statut'] : 'A_RENOUVELER' as ContratSyndic['statut'],
        taciteReconduction: data.tacitRenewal,
        delaiResiliation: data.noticeMonths ? data.noticeMonths * 30 : undefined,
        telephone: data.phone || undefined,
        email: data.email || undefined,
        adresse: fullAddress || undefined,
      }
    : undefined;

  const syndicInfo = useMemo(() => ({
    nom: data?.providerName || '',
    adresse: fullAddress,
    telephone: data?.phone || '',
    email: data?.email || '',
  }), [data, fullAddress]);

  return { contratSyndic, syndicInfo, raw: data, isLoading };
}
