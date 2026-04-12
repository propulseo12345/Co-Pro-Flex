'use client';

import { useState, useCallback, useMemo } from 'react';
import type { IFactureFacturX, StatutFacturX } from '@/types';
import { MOCK_FACTURES_FACTURX } from '@/components/features/conformite/facturx/mock-data';

export type FacturXFilter = 'TOUS' | StatutFacturX;

export function useFacturX() {
  const [factures, setFactures] = useState<IFactureFacturX[]>(MOCK_FACTURES_FACTURX);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FacturXFilter>('TOUS');

  const filteredFactures = useMemo(() => {
    if (filter === 'TOUS') return factures;
    return factures.filter(f => f.statutFacturX === filter);
  }, [factures, filter]);

  const genererFacturX = useCallback(async (factureId: string) => {
    setLoadingId(factureId);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setFactures(prev =>
      prev.map(f =>
        f.id === factureId
          ? { ...f, statutFacturX: 'GENERE', dateGeneration: new Date().toISOString().slice(0, 10) }
          : f,
      ),
    );
    setLoadingId(null);
  }, []);

  const telecharger = useCallback((_factureId: string) => {
    // Phase 1 — mock : téléchargement simulé
    const link = document.createElement('a');
    link.href = '#';
    link.download = `facturx-${_factureId}.pdf`;
    link.click();
  }, []);

  return {
    factures: filteredFactures,
    genererFacturX,
    telecharger,
    isLoading: loadingId,
    filter,
    setFilter,
  };
}
