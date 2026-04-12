'use client';

import { useMemo } from 'react';
import type { IDPE } from '@/types';
import { MOCK_DPE_LIST } from '@/components/features/conformite/dpe/mock-data';

interface UseDPEOptions {
  coproprieteId?: string;
}

export function useDPE({ coproprieteId }: UseDPEOptions = {}) {
  const coproprietes = useMemo(() => MOCK_DPE_LIST, []);

  const selectedDPE = useMemo(
    () => coproprieteId ? MOCK_DPE_LIST.find(d => d.coproprieteId === coproprieteId) ?? null : null,
    [coproprieteId]
  );

  return {
    coproprietes,
    selectedDPE,
    isLoading: false,
  };
}
