'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  AnnexeData1,
  AnnexeData1DetailCopros,
  AnnexeData2,
  AnnexeData3,
  AnnexeData4,
  AnnexeData5,
} from '@/components/features/finance/Comptabilite/types';

interface UseAnnexeResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const FUNCTION_MAP = {
  1: 'fn_annexe_1',
  '1_detail': 'fn_annexe_1_detail_copros',
  2: 'fn_annexe_2',
  3: 'fn_annexe_3',
  4: 'fn_annexe_4',
  5: 'fn_annexe_5',
} as const;

type AnnexeType = keyof typeof FUNCTION_MAP;

type AnnexeDataMap = {
  1: AnnexeData1;
  '1_detail': AnnexeData1DetailCopros;
  2: AnnexeData2;
  3: AnnexeData3;
  4: AnnexeData4;
  5: AnnexeData5;
};

export function useAnnexeData<T extends AnnexeType>(
  coproId: string | null,
  periodId: string | null,
  annexeType: T,
  nextPeriodId?: string | null
): UseAnnexeResult<AnnexeDataMap[T]> {
  const [data, setData] = useState<AnnexeDataMap[T] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!coproId || !periodId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const fnName = FUNCTION_MAP[annexeType];

      const params: Record<string, string> = {
        p_copro_id: coproId,
        p_period_id: periodId,
      };

      // Annexes 2 and 3 need next_period_id
      if ((annexeType === 2 || annexeType === 3) && nextPeriodId) {
        params.p_next_period_id = nextPeriodId;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error: rpcError } = await (supabase.rpc as any)(fnName, params);

      if (rpcError) {
        setError(rpcError.message);
        setData(null);
      } else {
        setData(result as unknown as AnnexeDataMap[T]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setData(null);
    }

    setIsLoading(false);
  }, [coproId, periodId, annexeType, nextPeriodId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}
