'use client';

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as scheduleApi from '@/lib/budget/payment-schedules.api';
import type { PaymentScheduleRow } from '@/lib/budget/payment-schedules.api';
import type { PaymentPhase } from '@/components/features/finance/Budget/types';

function mapRowToPhase(row: PaymentScheduleRow): PaymentPhase {
  return {
    id: row.id,
    budgetId: row.budget_id,
    phaseNumber: row.phase_number,
    label: row.label,
    percentage: row.percentage,
    amount: row.amount,
    dueDate: row.due_date || undefined,
    status: row.status,
    paidDate: row.paid_date || undefined,
    invoiceRef: row.invoice_ref || undefined,
    documentId: row.document_id || undefined,
    serviceOrderId: row.service_order_id || undefined,
    isRetention: row.is_retention,
    retentionReleaseDate: row.retention_release_date || undefined,
    notes: row.notes || undefined,
  };
}

export function usePaymentSchedule(budgetId: string | null) {
  const { currentCoproId } = useCopro();
  const [phases, setPhases] = useState<PaymentPhase[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadPhases = useCallback(async () => {
    if (!budgetId) return;
    setIsLoading(true);
    try {
      const rows = await scheduleApi.listPaymentSchedules(budgetId);
      setPhases(rows.map(mapRowToPhase));
    } catch (err) {
      // Erreur chargement échéancier
    } finally {
      setIsLoading(false);
    }
  }, [budgetId]);

  const createSchedule = useCallback(async (
    targetBudgetId: string,
    config: { label: string; percentage: number; amount: number; dueDate?: string; isRetention?: boolean; retentionReleaseDate?: string }[]
  ): Promise<boolean> => {
    if (!currentCoproId) return false;
    try {
      const inputs = config.map((phase, i) => ({
        copro_id: currentCoproId,
        budget_id: targetBudgetId,
        phase_number: i + 1,
        label: phase.label,
        percentage: phase.percentage,
        amount: phase.amount,
        due_date: phase.dueDate,
        is_retention: phase.isRetention || false,
        retention_release_date: phase.retentionReleaseDate,
      }));
      await scheduleApi.createPaymentPhases(inputs);
      await loadPhases();
      return true;
    } catch (err) {
      // Erreur création échéancier
      return false;
    }
  }, [currentCoproId, loadPhases]);

  const markPaid = useCallback(async (
    phaseId: string,
    paidDate: string,
    invoiceRef?: string,
    documentId?: string
  ): Promise<boolean> => {
    try {
      await scheduleApi.markPhasePaid(phaseId, paidDate, invoiceRef, documentId);
      await loadPhases();
      return true;
    } catch (err) {
      // Erreur marquage payé
      return false;
    }
  }, [loadPhases]);

  const updatePhase = useCallback(async (
    phaseId: string,
    updates: Parameters<typeof scheduleApi.updatePaymentPhase>[1]
  ): Promise<boolean> => {
    try {
      await scheduleApi.updatePaymentPhase(phaseId, updates);
      await loadPhases();
      return true;
    } catch (err) {
      // Erreur mise à jour phase
      return false;
    }
  }, [loadPhases]);

  const totalPaid = phases
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalAmount = phases.reduce((sum, p) => sum + p.amount, 0);

  return {
    phases,
    isLoading,
    totalPaid,
    totalAmount,
    remaining: totalAmount - totalPaid,
    loadPhases,
    createSchedule,
    markPaid,
    updatePhase,
  };
}
