'use client';

import { useState, useMemo, useCallback } from 'react';
import type { IDPE, ClasseDPE, IDPEHistorique } from '@/types';
import { MOCK_DPE_LIST } from '@/components/features/conformite/dpe/mock-data';

interface UseDPEOptions {
  coproprieteId?: string;
}

function computeStatut(dateExpiration: string): IDPE['statut'] {
  const exp = new Date(dateExpiration);
  const now = new Date();
  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  if (exp < now) return 'EXPIRE';
  if (exp < sixMonths) return 'EXPIRE_BIENTOT';
  return 'VALIDE';
}

export type DPEEditData = {
  classeEnergie: ClasseDPE;
  classeGES: ClasseDPE;
  dateDiagnostic: string;
  dateExpiration: string;
  diagnostiqueur: string;
  numeroADEME: string;
  consoEnergie: number;
  emissionsGES: number;
};

export type DPERenewData = {
  datePrevue: string;
  diagnostiqueur: string;
  notes: string;
};

export function useDPE({ coproprieteId }: UseDPEOptions = {}) {
  const [dpeData, setDpeData] = useState<IDPE[]>(MOCK_DPE_LIST);

  const coproprietes = dpeData;

  const selectedDPE = useMemo(() => {
    if (!coproprieteId) return null;
    return dpeData.find(d => d.coproprieteId === coproprieteId)
      ?? dpeData[0];
  }, [coproprieteId, dpeData]);

  const updateDPE = useCallback((dpeId: string, data: DPEEditData) => {
    setDpeData(prev =>
      prev.map(d =>
        d.id === dpeId
          ? { ...d, ...data, statut: computeStatut(data.dateExpiration) }
          : d
      )
    );
  }, []);

  const planifierRenouvellement = useCallback((dpeId: string, data: DPERenewData) => {
    setDpeData(prev =>
      prev.map(d => {
        if (d.id !== dpeId) return d;
        const newEntry: IDPEHistorique = {
          id: `h-${Date.now()}`,
          dateDiagnostic: data.datePrevue,
          classeEnergie: d.classeEnergie,
          diagnostiqueur: data.diagnostiqueur || d.diagnostiqueur,
        };
        return { ...d, historique: [...d.historique, newEntry] };
      })
    );
  }, []);

  return {
    coproprietes,
    selectedDPE,
    isLoading: false,
    updateDPE,
    planifierRenouvellement,
  };
}
