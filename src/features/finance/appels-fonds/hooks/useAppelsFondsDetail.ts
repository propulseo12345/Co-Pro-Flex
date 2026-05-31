'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCallLines, useRecordPayment } from '@/hooks/modules/useFinanceData';
import * as financeApi from '@/lib/finance/api';
import type { DetailStats } from '../types';
import type { CallLineDetailed } from '@/lib/finance/api';

/** Niveau de relance pour une ligne : 0 = aucune, 1/2/3 = phases envoyees */
export type ReminderLevel = 0 | 1 | 2 | 3;

export interface EnrichedCallLine extends CallLineDetailed {
  reminderLevel: ReminderLevel;
}

/** Ventilation par clé de répartition d'une ligne d'appel, pour un lot donné */
export interface CallKeyBreakdown {
  repartition_key_id: string | null;
  key_name: string;
  amount_due: number;
  amount_paid: number;
  lot_weight: number;
  key_total_weight: number;
}

/** Un lot = total agrégé toutes clés + détail par clé (modèle appel agrégé) */
export interface CallLotRow {
  lot_id: string;
  lot_ref: string;
  owner_name: string | null;
  lot_tantiemes: number;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: 'unpaid' | 'partial' | 'paid';
  reminderLevel: ReminderLevel;
  breakdown: CallKeyBreakdown[];
  /** Ligne synthétique (montants agrégés du lot) pour alimenter la relance */
  relanceLine: CallLineDetailed;
}

function useCallById(callId: string) {
  const [data, setData] = useState<financeApi.CallForFundsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    financeApi.getCallById(callId).then(result => {
      if (!cancelled && result.data) setData(result.data);
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [callId, reloadToken]);

  const refresh = useCallback(() => setReloadToken(t => t + 1), []);

  return { data, isLoading, refresh };
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
  const { data: call, isLoading: callLoading, refresh: refreshCall } = useCallById(callId);
  const { data: lines, isLoading: linesLoading, refresh: refreshLines } = useCallLines(callId);
  const { mutate: doRecordPayment, isLoading: paymentLoading } = useRecordPayment();

  const refresh = useCallback(async () => {
    refreshCall();
    await refreshLines();
  }, [refreshCall, refreshLines]);
  const { levelsByLot, isLoading: remindersLoading } = useReminderLevels(call?.copro_id);

  const stats: DetailStats = useMemo(() => {
    if (!lines) return { called: 0, paid: 0, remaining: 0, paidCount: 0, totalCount: 0 };
    const called = lines.reduce((s, l) => s + l.amount_due, 0);
    const paid = lines.reduce((s, l) => s + l.amount_paid, 0);
    // Une ligne par (lot × clé) : on compte les LOTS, pas les lignes.
    const lotIds = new Set(lines.map(l => l.lot_id));
    const lotsWithUnpaid = new Set(lines.filter(l => l.status !== 'paid').map(l => l.lot_id));
    return {
      called,
      paid,
      remaining: called - paid,
      paidCount: lotIds.size - lotsWithUnpaid.size,
      totalCount: lotIds.size,
    };
  }, [lines]);

  const enrichedLines: EnrichedCallLine[] = useMemo(() => {
    if (!lines) return [];
    const enriched = lines.map(line => ({
      ...line,
      reminderLevel: (line.status === 'paid' ? 0 : levelsByLot.get(line.lot_id) ?? 0) as ReminderLevel,
    }));
    // Tri : mise en demeure (3) en haut, puis 2, 1, 0, payés en bas
    return enriched.sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      return b.reminderLevel - a.reminderLevel;
    });
  }, [lines, levelsByLot]);

  // Regroupement par lot : 1 bloc par lot (total agrégé) + ventilation par clé
  const lots: CallLotRow[] = useMemo(() => {
    if (!lines) return [];
    const byLot = new Map<string, CallLineDetailed[]>();
    for (const l of lines) {
      const arr = byLot.get(l.lot_id) ?? [];
      arr.push(l);
      byLot.set(l.lot_id, arr);
    }

    const rows: CallLotRow[] = [];
    for (const [lotId, lotLines] of byLot) {
      const first = lotLines[0];
      const amount_due = lotLines.reduce((s, l) => s + l.amount_due, 0);
      const amount_paid = lotLines.reduce((s, l) => s + l.amount_paid, 0);
      const remaining = Math.round((amount_due - amount_paid) * 100) / 100;
      const status: 'unpaid' | 'partial' | 'paid' =
        remaining <= 0.005 ? 'paid' : amount_paid > 0 ? 'partial' : 'unpaid';
      const reminderLevel = (status === 'paid' ? 0 : levelsByLot.get(lotId) ?? 0) as ReminderLevel;

      const breakdown: CallKeyBreakdown[] = lotLines
        .map(l => ({
          repartition_key_id: l.repartition_key_id,
          key_name: l.repartition_key_name ?? 'Sans clé',
          amount_due: l.amount_due,
          amount_paid: l.amount_paid,
          lot_weight: l.lot_weight,
          key_total_weight: l.key_total_weight,
        }))
        .sort((a, b) => a.key_name.localeCompare(b.key_name));

      const relanceLine: CallLineDetailed = {
        ...first,
        amount_due,
        amount_paid,
        amount_remaining: remaining,
        status,
        // Ligne agrégée (toutes clés) : pas de clé unique représentative
        repartition_key_id: null,
        repartition_key_name: null,
      };

      rows.push({
        lot_id: lotId,
        lot_ref: first.lot_ref,
        owner_name: first.owner_name,
        lot_tantiemes: first.lot_tantiemes,
        amount_due,
        amount_paid,
        remaining,
        status,
        reminderLevel,
        breakdown,
        relanceLine,
      });
    }

    // Tri : mise en demeure en haut, payés en bas, puis par référence de lot
    return rows.sort((a, b) => {
      if (a.status === 'paid' && b.status !== 'paid') return 1;
      if (a.status !== 'paid' && b.status === 'paid') return -1;
      if (b.reminderLevel !== a.reminderLevel) return b.reminderLevel - a.reminderLevel;
      return a.lot_ref.localeCompare(b.lot_ref);
    });
  }, [lines, levelsByLot]);

  return {
    call,
    lines: enrichedLines,
    lots,
    stats,
    // Spinner plein écran au 1er chargement seulement : sur un refetch (après
    // paiement), on garde l'écran monté — sinon la modale est démontée et son
    // état "succès" ne s'affiche jamais.
    isLoading: (callLoading || linesLoading || remindersLoading) && !call,
    paymentLoading,
    recordPayment: doRecordPayment,
    refresh,
  };
}
