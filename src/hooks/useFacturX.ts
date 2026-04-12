'use client';

import { useState, useCallback, useMemo } from 'react';
import type { IFactureFacturX, StatutFacturX } from '@/types';
import { MOCK_FACTURES_FACTURX } from '@/components/features/conformite/facturx/mock-data';
import { useToast } from '@/providers/ToastProvider';

export type FacturXFilter = 'TOUS' | StatutFacturX;

interface UseFacturXOptions {
  coproNom?: string;
}

export function useFacturX({ coproNom }: UseFacturXOptions = {}) {
  const { showToast } = useToast();
  const [factures, setFactures] = useState<IFactureFacturX[]>(MOCK_FACTURES_FACTURX);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FacturXFilter>('TOUS');

  const filteredFactures = useMemo(() => {
    let result = factures;
    if (coproNom) {
      result = result.filter(f =>
        f.copropriete.toLowerCase().includes(coproNom.toLowerCase())
      );
    }
    if (filter !== 'TOUS') {
      result = result.filter(f => f.statutFacturX === filter);
    }
    return result;
  }, [factures, filter, coproNom]);

  const genererFacturX = useCallback(async (factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    setLoadingId(factureId);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setFactures(prev =>
        prev.map(f =>
          f.id === factureId
            ? { ...f, statutFacturX: 'GENERE', dateGeneration: new Date().toISOString().slice(0, 10) }
            : f,
        ),
      );
      if (facture) {
        showToast({ type: 'success', message: `Factur-X généré pour la facture ${facture.numero}` });
      }
    } finally {
      setLoadingId(null);
    }
  }, [factures, showToast]);

  const telecharger = useCallback((factureId: string) => {
    const facture = factures.find(f => f.id === factureId);
    showToast({
      type: 'info',
      message: `Téléchargement simulé — ${facture?.numero ?? factureId} (PDF/A-3 disponible après intégration backend)`,
    });
  }, [factures, showToast]);

  return {
    factures: filteredFactures,
    genererFacturX,
    telecharger,
    isLoading: loadingId,
    filter,
    setFilter,
  };
}
