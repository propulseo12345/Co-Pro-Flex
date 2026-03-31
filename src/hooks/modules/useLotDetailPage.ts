'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLot } from '@/hooks/modules/useLotsData';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';

export interface LotRepartitionEntry {
  key_id: string;
  key_name: string;
  weight: number;
  total_weight: number;
  share_pct: number;
}

export interface LotLoanShare {
  loan_id: string;
  label: string;
  lender: string | null;
  share_amount: number;
  remaining_amount: number;
  loan_status: string;
}

export interface LotAdvance {
  id: string;
  advance_type: string;
  label: string;
  amount_due: number;
  amount_paid: number;
}

export interface UseLotDetailPageReturn {
  lot: ReturnType<typeof useLot>['lot'];
  isLoading: boolean;
  error: string | null;
  repartition: LotRepartitionEntry[];
  loanShares: LotLoanShare[];
  advances: LotAdvance[];
  isLoadingExtra: boolean;
  refresh: () => Promise<void>;
}

export function useLotDetailPage(lotId: string): UseLotDetailPageReturn {
  const { currentCoproId } = useCopro();
  const { lot, isLoading, error, refresh } = useLot(lotId);
  const [repartition, setRepartition] = useState<LotRepartitionEntry[]>([]);
  const [loanShares, setLoanShares] = useState<LotLoanShare[]>([]);
  const [advances, setAdvances] = useState<LotAdvance[]>([]);
  const [isLoadingExtra, setIsLoadingExtra] = useState(true);

  const fetchExtraData = useCallback(async () => {
    if (!currentCoproId || !lotId) {
      setIsLoadingExtra(false);
      return;
    }

    setIsLoadingExtra(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;

    try {
      const { data: repData } = await supabase
        .from('v_repartition_key_lines_detailed')
        .select('key_id, key_name, weight, share_pct')
        .eq('copro_id', currentCoproId)
        .eq('lot_id', lotId);

      if (repData) {
        const { data: keysData } = await supabase
          .from('v_repartition_key_totals')
          .select('key_id, total_weight')
          .eq('copro_id', currentCoproId);

        const totalMap = new Map<string, number>();
        (keysData || []).forEach((k: { key_id: string; total_weight: number }) => {
          totalMap.set(k.key_id, k.total_weight);
        });

        setRepartition(repData.map((r: { key_id: string; key_name: string; weight: number; share_pct: number }) => ({
          ...r,
          total_weight: totalMap.get(r.key_id) || 0,
        })));
      }

      const { data: loansData } = await supabase
        .from('collective_loan_shares')
        .select(`
          loan_id,
          share_amount,
          remaining_amount,
          collective_loans!inner(label, lender, status)
        `)
        .eq('lot_id', lotId);

      if (loansData) {
        setLoanShares(loansData.map((ls: {
          loan_id: string;
          share_amount: number;
          remaining_amount: number;
          collective_loans: { label: string; lender: string | null; status: string };
        }) => ({
          loan_id: ls.loan_id,
          label: ls.collective_loans.label,
          lender: ls.collective_loans.lender,
          share_amount: ls.share_amount,
          remaining_amount: ls.remaining_amount,
          loan_status: ls.collective_loans.status,
        })));
      }

      const { data: advData } = await supabase
        .from('treasury_advances')
        .select('id, advance_type, label, amount_due, amount_paid')
        .eq('lot_id', lotId);

      if (advData) {
        setAdvances(advData);
      }
    } catch {
      // Silently handle — lot data is still available
    }

    setIsLoadingExtra(false);
  }, [currentCoproId, lotId]);

  useEffect(() => {
    fetchExtraData();
  }, [fetchExtraData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), fetchExtraData()]);
  }, [refresh, fetchExtraData]);

  return {
    lot, isLoading, error,
    repartition, loanShares, advances,
    isLoadingExtra, refresh: refreshAll,
  };
}
