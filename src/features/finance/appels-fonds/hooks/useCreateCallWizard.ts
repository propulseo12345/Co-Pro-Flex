'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useCreateCall } from '@/hooks/modules/useFinanceData';
import * as lotsApi from '@/lib/lots/api';
import type { RepartitionKeyWithTotals, RepartitionKeyLineDetailed } from '@/lib/lots/api';
import type { AccountingPeriod } from '@/lib/finance/api';

// ── Types ──

export type WizardStep = 1 | 2 | 3 | 4;
export type CallType = 'exceptional' | 'complement';
export type ScheduleMode = 'single' | 'multiple';
export type InstallmentCount = 2 | 3 | 4;

export interface Installment {
  dueDate: string;
  amount: number;
}

export interface WizardState {
  step: WizardStep;
  // Step 1
  callType: CallType | null;
  budgetId: string | null;
  label: string;
  description: string;
  // Step 2
  totalAmount: number;
  repartitionKeyId: string | null;
  // Step 3
  scheduleMode: ScheduleMode | null;
  singleDueDate: string;
  installmentCount: InstallmentCount;
  installments: Installment[];
}

export interface VentilationLine {
  lotId: string;
  lotRef: string;
  weight: number;
  sharePct: number;
  amountDue: number;
}

interface UseCreateCallWizardProps {
  selectedPeriod: AccountingPeriod | null;
  onSuccess: () => void;
  onClose: () => void;
}

// ── Helpers ──

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function defaultDueDate(): string {
  return addDays(todayISO(), 30);
}

function buildDefaultInstallments(count: InstallmentCount, total: number): Installment[] {
  const perInstallment = Math.floor((total * 100) / count) / 100;
  const result: Installment[] = [];
  let remaining = total;

  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const amount = isLast ? Math.round(remaining * 100) / 100 : perInstallment;
    result.push({
      dueDate: addDays(todayISO(), 30 * (i + 1)),
      amount,
    });
    remaining -= amount;
  }
  return result;
}

// ── Initial state ──

const INITIAL_STATE: WizardState = {
  step: 1,
  callType: null,
  budgetId: null,
  label: '',
  description: '',
  totalAmount: 0,
  repartitionKeyId: null,
  scheduleMode: null,
  singleDueDate: defaultDueDate(),
  installmentCount: 2,
  installments: buildDefaultInstallments(2, 0),
};

// ── Hook ──

export function useCreateCallWizard({ selectedPeriod, onSuccess, onClose }: UseCreateCallWizardProps) {
  const { currentCoproId } = useCopro();
  const { mutate: createCall } = useCreateCall();

  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── Repartition keys (loaded once) ──
  const [keys, setKeys] = useState<RepartitionKeyWithTotals[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);

  useEffect(() => {
    if (!currentCoproId) return;
    setKeysLoading(true);
    lotsApi.listRepartitionKeys(currentCoproId).then(result => {
      if (result.data) setKeys(result.data);
      setKeysLoading(false);
    });
  }, [currentCoproId]);

  // ── Key lines (loaded when key changes) ──
  const [keyLines, setKeyLines] = useState<RepartitionKeyLineDetailed[]>([]);
  const [keyLinesLoading, setKeyLinesLoading] = useState(false);

  useEffect(() => {
    if (!currentCoproId || !state.repartitionKeyId) {
      setKeyLines([]);
      return;
    }
    setKeyLinesLoading(true);
    lotsApi.listRepartitionKeyLines(currentCoproId, state.repartitionKeyId).then(result => {
      if (result.data) setKeyLines(result.data);
      setKeyLinesLoading(false);
    });
  }, [currentCoproId, state.repartitionKeyId]);

  // ── Selected key (key_id field, not id) ──
  const selectedKey = useMemo(
    () => keys.find(k => k.key_id === state.repartitionKeyId) ?? null,
    [keys, state.repartitionKeyId],
  );

  // ── Ventilation calculation ──
  const ventilation = useMemo((): VentilationLine[] => {
    if (!selectedKey || keyLines.length === 0 || state.totalAmount <= 0) return [];

    const totalWeight = keyLines.reduce((sum, l) => sum + l.weight, 0);
    if (totalWeight === 0) return [];

    const lines = keyLines.map(line => ({
      lotId: line.lot_id,
      lotRef: line.lot_ref,
      weight: line.weight,
      sharePct: line.share_pct,
      amountDue: Math.round((state.totalAmount * line.weight / totalWeight) * 100) / 100,
    }));

    // Adjust last lot for rounding delta
    const totalCalculated = lines.reduce((sum, l) => sum + l.amountDue, 0);
    const delta = Math.round((state.totalAmount - totalCalculated) * 100) / 100;
    if (lines.length > 0 && delta !== 0) {
      lines[lines.length - 1].amountDue += delta;
    }

    return lines;
  }, [selectedKey, keyLines, state.totalAmount]);

  // ── Key preview stats ──
  const keyPreview = useMemo(() => {
    if (!selectedKey || ventilation.length === 0) return null;
    const amounts = ventilation.map(v => v.amountDue);
    return {
      lotsCount: ventilation.length,
      totalWeight: selectedKey.total_weight,
      minAmount: Math.min(...amounts),
      maxAmount: Math.max(...amounts),
    };
  }, [selectedKey, ventilation]);

  // ── Step updaters ──

  const updateField = useCallback(<K extends keyof WizardState>(field: K, value: WizardState[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
  }, []);

  const setCallType = useCallback((type: CallType) => {
    setState(prev => ({
      ...prev,
      callType: type,
      budgetId: type === 'exceptional' ? null : prev.budgetId,
    }));
  }, []);

  const setInstallmentCount = useCallback((count: InstallmentCount) => {
    setState(prev => ({
      ...prev,
      installmentCount: count,
      installments: buildDefaultInstallments(count, prev.totalAmount),
    }));
  }, []);

  const updateInstallment = useCallback((index: number, field: keyof Installment, value: string | number) => {
    setState(prev => {
      const updated = [...prev.installments];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, installments: updated };
    });
  }, []);

  // ── Validation per step ──

  const isStep1Valid = useMemo(() => {
    if (!state.callType) return false;
    if (state.callType === 'complement' && !state.budgetId) return false;
    if (!state.label.trim()) return false;
    return true;
  }, [state.callType, state.budgetId, state.label]);

  const isStep2Valid = useMemo(() => {
    return state.totalAmount > 0 && state.repartitionKeyId !== null;
  }, [state.totalAmount, state.repartitionKeyId]);

  const isStep3Valid = useMemo(() => {
    if (!state.scheduleMode) return false;
    if (state.scheduleMode === 'single') {
      return !!state.singleDueDate;
    }
    const sum = state.installments.reduce((s, i) => s + i.amount, 0);
    const sumMatch = Math.abs(sum - state.totalAmount) <= 0.01;
    const allDates = state.installments.every(i => !!i.dueDate);
    const datesIncreasing = state.installments.every((inst, idx) =>
      idx === 0 || inst.dueDate > state.installments[idx - 1].dueDate
    );
    return sumMatch && allDates && datesIncreasing;
  }, [state.scheduleMode, state.singleDueDate, state.installments, state.totalAmount]);

  const canNext = useMemo(() => {
    switch (state.step) {
      case 1: return isStep1Valid;
      case 2: return isStep2Valid;
      case 3: return isStep3Valid;
      case 4: return true;
      default: return false;
    }
  }, [state.step, isStep1Valid, isStep2Valid, isStep3Valid]);

  // ── Navigation ──

  const goNext = useCallback(() => {
    if (state.step < 4 && canNext) {
      setState(prev => ({ ...prev, step: (prev.step + 1) as WizardStep }));
    }
  }, [state.step, canNext]);

  const goPrev = useCallback(() => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: (prev.step - 1) as WizardStep }));
    }
  }, [state.step]);

  // ── Recalc installments when totalAmount changes ──
  useEffect(() => {
    if (state.scheduleMode === 'multiple') {
      setState(prev => ({
        ...prev,
        installments: buildDefaultInstallments(prev.installmentCount, prev.totalAmount),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.totalAmount]);

  // ── Submission ──

  const submit = useCallback(async () => {
    if (!currentCoproId || !selectedPeriod || !state.repartitionKeyId) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const basePayload = {
      period_id: selectedPeriod.id,
      repartition_key_id: state.repartitionKeyId,
      issue_date: todayISO(),
      budget_id: state.budgetId ?? undefined,
      description: state.description || undefined,
    };

    try {
      if (state.scheduleMode === 'single') {
        const result = await createCall({
          ...basePayload,
          label: state.label,
          due_date: state.singleDueDate,
          total_amount: state.totalAmount,
        });
        if (result.error) throw new Error(result.error);
      } else {
        const total = state.installments.length;
        let created = 0;

        for (const [i, inst] of state.installments.entries()) {
          const result = await createCall({
            ...basePayload,
            label: `${state.label} — ${i + 1}/${total}`,
            due_date: inst.dueDate,
            total_amount: inst.amount,
          });
          if (result.error) {
            throw new Error(
              `Erreur sur l'appel ${i + 1}/${total}: ${result.error}. ${created}/${total} créés.`
            );
          }
          created++;
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSubmitting(false);
    }
  }, [currentCoproId, selectedPeriod, state, createCall, onSuccess, onClose]);

  // ── Has data (for close confirmation) ──
  const hasData = useMemo(() => {
    return !!(state.callType || state.label || state.totalAmount > 0);
  }, [state.callType, state.label, state.totalAmount]);

  return {
    state,
    keys,
    keysLoading,
    keyLines,
    keyLinesLoading,
    selectedKey,
    keyPreview,
    ventilation,
    updateField,
    setCallType,
    setInstallmentCount,
    updateInstallment,
    canNext,
    goNext,
    goPrev,
    submit,
    isSubmitting,
    submitError,
    hasData,
  };
}
