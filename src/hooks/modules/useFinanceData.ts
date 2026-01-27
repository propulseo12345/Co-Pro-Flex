'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as financeApi from '@/lib/finance/api';

// ============================================================================
// GENERIC HOOK FOR DATA FETCHING
// ============================================================================

interface UseDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useFinanceQuery<T>(
  queryFn: (coproId: string) => Promise<financeApi.ApiResult<T>>,
  enabled: boolean = true
): UseDataResult<T> {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId || !enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await queryFn(currentCoproId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, queryFn, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

// ============================================================================
// CALLS FOR FUNDS
// ============================================================================

export function useCalls() {
  return useFinanceQuery(financeApi.listCalls);
}

export function useCallLines(callId: string | null) {
  const [data, setData] = useState<financeApi.CallLineDetailed[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!callId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await financeApi.getCallLines(callId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [callId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

// ============================================================================
// UNPAID
// ============================================================================

export function useUnpaid() {
  return useFinanceQuery(financeApi.listUnpaid);
}

// ============================================================================
// PAYMENTS
// ============================================================================

export function usePayments() {
  return useFinanceQuery(financeApi.listPayments);
}

// ============================================================================
// SUPPLIER INVOICES
// ============================================================================

export function useSupplierInvoices() {
  return useFinanceQuery(financeApi.listSupplierInvoices);
}

export function useSuppliers() {
  return useFinanceQuery(financeApi.listSuppliers);
}

// ============================================================================
// BANK MOVEMENTS
// ============================================================================

export function useBankMovements(status?: 'unmatched' | 'matched' | 'ignored') {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.BankMovementOverview[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await financeApi.listBankMovements(currentCoproId, status);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

// ============================================================================
// GENERAL LEDGER (GRAND LIVRE)
// ============================================================================

export function useGeneralLedger(options?: { periodId?: string; status?: string }) {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.GeneralLedgerEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await financeApi.getGeneralLedger(currentCoproId, options);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, options?.periodId, options?.status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

// ============================================================================
// TRIAL BALANCE (BALANCE COMPTABLE)
// ============================================================================

export function useTrialBalance(periodId: string | null) {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.TrialBalanceEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId || !periodId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await financeApi.getTrialBalance(currentCoproId, periodId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, periodId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

// ============================================================================
// REFERENCE DATA
// ============================================================================

export function useRepartitionKeys() {
  return useFinanceQuery(financeApi.listRepartitionKeys);
}

export function useAccountingPeriods() {
  return useFinanceQuery(financeApi.listAccountingPeriods);
}

export function useOpenPeriod() {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.AccountingPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await financeApi.getOpenPeriod(currentCoproId);

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

export function useAccounts(accountType?: string) {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<Array<{ id: string; code: string; name: string; account_type: string }> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await financeApi.listAccounts(currentCoproId, accountType);

    if (result.error) {
      setError(result.error);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, accountType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

export function useLots() {
  return useFinanceQuery(financeApi.listLots);
}

// ============================================================================
// MUTATIONS
// ============================================================================

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

export function useCreateCall() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.CreateCallPayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.createCall({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function useRecordPayment() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.RecordPaymentPayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.recordPayment({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function useCreateSupplierInvoice() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.CreateSupplierInvoicePayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.createSupplierInvoice({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function usePaySupplierInvoice() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.PaySupplierInvoicePayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.paySupplierInvoice({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function useImportBankMovement() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.ImportBankMovementPayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.importBankMovement({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function useReconcileBankMovement() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.ReconcileBankMovementPayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.reconcileBankMovement({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

// ============================================================================
// PAYMENT REMINDERS (RELANCES IMPAYÉS)
// ============================================================================

// Re-export types for convenience
export type { UnpaidWithReminder, PaymentReminder, PaymentReminderRule } from '@/lib/finance/api';

export function useUnpaidWithReminders() {
  return useFinanceQuery(financeApi.listUnpaidWithReminders);
}

export function usePaymentReminders(options?: { lot_id?: string; status?: string }) {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.PaymentReminder[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await financeApi.listPaymentReminders(currentCoproId, options);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, options?.lot_id, options?.status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

export function usePaymentReminderRules() {
  return useFinanceQuery(financeApi.listPaymentReminderRules);
}

export function useSendManualReminder() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.SendManualReminderPayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.sendManualReminder({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function useRunPaymentReminders() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (options?: { dry_run?: boolean }) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.runPaymentReminders({
      copro_id: currentCoproId,
      dry_run: options?.dry_run,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

export function useCreatePaymentReminderRule() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (payload: Omit<financeApi.CreateReminderRulePayload, 'copro_id'>) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.createPaymentReminderRule({
      ...payload,
      copro_id: currentCoproId,
    });

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

// ============================================================================
// REMINDER SETTINGS (PAUSE)
// ============================================================================

export type { ReminderSettings, EmailTemplate } from '@/lib/finance/api';

export function useReminderSettings() {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.ReminderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await financeApi.getReminderSettings(currentCoproId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

export function useUpdateReminderSettings() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (updates: financeApi.UpdateReminderSettingsPayload) => {
    if (!currentCoproId) {
      return { data: null, error: 'Aucune copropriété sélectionnée' };
    }

    setState({ isLoading: true, error: null });

    const result = await financeApi.updateReminderSettings(currentCoproId, updates);

    setState({ isLoading: false, error: result.error });

    return result;
  }, [currentCoproId]);

  return { ...state, mutate };
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export function useEmailTemplates() {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<financeApi.EmailTemplate[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await financeApi.listEmailTemplates(currentCoproId || undefined);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

export function useUpdateEmailTemplate() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (templateId: string, updates: financeApi.UpdateEmailTemplatePayload) => {
    setState({ isLoading: true, error: null });

    const result = await financeApi.updateEmailTemplate(templateId, updates);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, mutate };
}

export function useUpdateReminderRule() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const mutate = useCallback(async (
    ruleId: string,
    updates: Partial<Omit<financeApi.PaymentReminderRule, 'id' | 'copro_id' | 'created_at' | 'updated_at'>>
  ) => {
    setState({ isLoading: true, error: null });

    const result = await financeApi.updatePaymentReminderRule(ruleId, updates);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, mutate };
}
