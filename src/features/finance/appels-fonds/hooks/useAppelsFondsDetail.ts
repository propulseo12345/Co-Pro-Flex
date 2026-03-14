'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCallLines, useRecordPayment } from '@/hooks/modules/useFinanceData';
import * as financeApi from '@/lib/finance/api';
import type { DetailStats } from '../types';

function useCallById(callId: string) {
  const [data, setData] = useState<financeApi.CallForFundsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    financeApi.getCallById(callId).then(result => {
      if (!cancelled && result.data) setData(result.data);
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [callId]);

  return { data, isLoading };
}

export function useAppelsFondsDetail(callId: string) {
  const { data: call, isLoading: callLoading } = useCallById(callId);
  const { data: lines, isLoading: linesLoading } = useCallLines(callId);
  const { mutate: doRecordPayment, isLoading: paymentLoading } = useRecordPayment();

  const stats: DetailStats = useMemo(() => {
    if (!lines) return { called: 0, paid: 0, remaining: 0, paidCount: 0, totalCount: 0 };
    const called = lines.reduce((s, l) => s + l.amount_due, 0);
    const paid = lines.reduce((s, l) => s + l.amount_paid, 0);
    return {
      called,
      paid,
      remaining: called - paid,
      paidCount: lines.filter(l => l.status === 'paid').length,
      totalCount: lines.length,
    };
  }, [lines]);

  const sortedLines = useMemo(() => {
    if (!lines) return [];
    const statusOrder: Record<string, number> = { unpaid: 0, partial: 1, paid: 2 };
    return [...lines].sort(
      (a, b) => (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0)
    );
  }, [lines]);

  return {
    call,
    lines: sortedLines,
    stats,
    isLoading: callLoading || linesLoading,
    paymentLoading,
    recordPayment: doRecordPayment,
  };
}
