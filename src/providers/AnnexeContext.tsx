'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { getActiveAccountingPeriod } from '@/lib/finance/accounting-period';
import type { AnnexeKpis } from '@/components/features/finance/Comptabilite/types';

interface AnnexeContextValue {
  kpis: AnnexeKpis | null;
  periodId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AnnexeContext = createContext<AnnexeContextValue | undefined>(undefined);

export function AnnexeProvider({ children }: { children: React.ReactNode }) {
  const { currentCoproId, isLoading: coproLoading } = useCopro();
  const [kpis, setKpis] = useState<AnnexeKpis | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const periodResult = await getActiveAccountingPeriod(currentCoproId);
      if (periodResult.error || !periodResult.data) {
        setError(periodResult.error || 'Aucune periode ouverte');
        setIsLoading(false);
        return;
      }

      setPeriodId(periodResult.data.id);

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase.rpc as any)(
        'fn_dashboard_kpis',
        { p_copro_id: currentCoproId, p_period_id: periodResult.data.id }
      );

      if (rpcError) {
        setError(rpcError.message);
      } else {
        setKpis(data as unknown as AnnexeKpis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    if (!coproLoading) refresh();
  }, [coproLoading, refresh]);

  return (
    <AnnexeContext.Provider value={{ kpis, periodId, isLoading, error, refresh }}>
      {children}
    </AnnexeContext.Provider>
  );
}

export function useAnnexeContext(): AnnexeContextValue {
  const ctx = useContext(AnnexeContext);
  if (!ctx) throw new Error('useAnnexeContext must be used within AnnexeProvider');
  return ctx;
}
