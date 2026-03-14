'use client';

import { useState, useEffect, useMemo } from 'react';
import { useCallLines, useRecordPayment } from '@/hooks/modules/useFinanceData';
import * as financeApi from '@/lib/finance/api';
import type { DetailStats } from '../types';
import type { CallLineDetailed } from '@/lib/finance/api';

/** Niveau de relance pour une ligne : 0 = aucune, 1/2/3 = phases envoyees */
export type ReminderLevel = 0 | 1 | 2 | 3;

export interface EnrichedCallLine extends CallLineDetailed {
  reminderLevel: ReminderLevel;
}

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

/** Charge les relances envoyees pour cette copro et calcule le niveau par lot */
function useReminderLevels(coproId: string | undefined) {
  const [levelsByLot, setLevelsByLot] = useState<Map<string, ReminderLevel>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!coproId) return;
    setIsLoading(true);
    financeApi.listPaymentReminders(coproId, { status: 'sent' }).then(result => {
      if (result.data) {
        const map = new Map<string, ReminderLevel>();
        for (const r of result.data) {
          const current = map.get(r.lot_id) ?? 0;
          // Compter le nombre de relances distinctes par lot
          const level = Math.min(current + 1, 3) as ReminderLevel;
          map.set(r.lot_id, level);
        }
        setLevelsByLot(map);
      }
      setIsLoading(false);
    });
  }, [coproId]);

  return { levelsByLot, isLoading };
}

export function useAppelsFondsDetail(callId: string) {
  const { data: call, isLoading: callLoading } = useCallById(callId);
  const { data: lines, isLoading: linesLoading } = useCallLines(callId);
  const { mutate: doRecordPayment, isLoading: paymentLoading } = useRecordPayment();
  const { levelsByLot, isLoading: remindersLoading } = useReminderLevels(call?.copro_id);

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

  const enrichedLines: EnrichedCallLine[] = useMemo(() => {
    if (!lines) return [];
    const enriched = lines.map(line => ({
      ...line,
      reminderLevel: (line.status === 'paid' ? 0 : levelsByLot.get(line.lot_id) ?? 0) as ReminderLevel,
    }));
    // Tri : mise en demeure (3) en haut, puis 2, 1, 0, payés en bas
    const statusOrder: Record<string, number> = { unpaid: 0, partial: 1, paid: 2 };
    return enriched.sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      return b.reminderLevel - a.reminderLevel;
    });
  }, [lines, levelsByLot]);

  return {
    call,
    lines: enrichedLines,
    stats,
    isLoading: callLoading || linesLoading || remindersLoading,
    paymentLoading,
    recordPayment: doRecordPayment,
  };
}
