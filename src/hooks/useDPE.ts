'use client';

import { useMemo } from 'react';
import type { IDPE } from '@/types';
import { MOCK_DPE_LIST } from '@/components/features/conformite/dpe/mock-data';

interface UseDPEOptions {
  coproprieteId?: string;
}

export function useDPE({ coproprieteId }: UseDPEOptions = {}) {
  const coproprietes = useMemo(() => MOCK_DPE_LIST, []);

  // Fallback au premier mock si l'ID ne correspond pas (mode dev sans Supabase)
  const selectedDPE = useMemo(() => {
    if (!coproprieteId) return null;
    return MOCK_DPE_LIST.find(d => d.coproprieteId === coproprieteId)
      ?? MOCK_DPE_LIST[0];
  }, [coproprieteId]);

  return {
    coproprietes,
    selectedDPE,
    isLoading: false,
  };
}
