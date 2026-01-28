'use client';

/**
 * Hook for budget mutations (create, update, delete)
 * All mutations go through Supabase
 */

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as budgetApi from '@/lib/budget/api';
import { BudgetStatut, DepenseStatut } from '@/types/enums/statuts';

// ============================================================================
// Types
// ============================================================================

export interface UseBudgetMutationsOptions {
  /** Callback after successful mutation (typically to refresh data) */
  onSuccess?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface UseBudgetMutationsReturn {
  // State
  isSaving: boolean;
  error: string | null;

  // Budget mutations
  createBudget: (input: CreateBudgetParams) => Promise<string | null>;
  updateBudget: (budgetId: string, input: budgetApi.UpdateBudgetInput) => Promise<boolean>;
  updateBudgetStatus: (budgetId: string, status: BudgetStatut) => Promise<boolean>;
  deleteBudget: (budgetId: string) => Promise<boolean>;

  // Budget line mutations
  createLine: (input: CreateLineParams) => Promise<string | null>;
  updateLine: (lineId: string, input: budgetApi.UpdateBudgetLineInput) => Promise<boolean>;
  deleteLine: (lineId: string) => Promise<boolean>;

  // Expense mutations
  createExpense: (input: CreateExpenseParams) => Promise<string | null>;
  updateExpense: (expenseId: string, input: budgetApi.UpdateExpenseInput) => Promise<boolean>;
  submitExpenseForValidation: (expenseId: string) => Promise<boolean>;
  validateExpense: (expenseId: string) => Promise<boolean>;
  rejectExpense: (expenseId: string, comment: string) => Promise<boolean>;
  deleteExpense: (expenseId: string) => Promise<boolean>;
}

// Input types (simplified for consumers)
export interface CreateBudgetParams {
  period_id: string;
  budget_type: budgetApi.BudgetType;
  name: string;
  notes?: string;
}

export interface CreateLineParams {
  budget_id: string;
  account_id: string;
  repartition_key_id: string;
  label: string;
  code?: string;
  amount: number;
  sort_order?: number;
}

export interface CreateExpenseParams {
  budget_id: string;
  budget_line_id: string;
  label: string;
  amount: number;
  tx_date: string;
  fournisseur?: string;
  montant_ht?: number;
  taux_tva?: number;
  piece_jointe?: string;
}

// ============================================================================
// Hook
// ============================================================================

export function useBudgetMutations(
  options: UseBudgetMutationsOptions = {}
): UseBudgetMutationsReturn {
  const { currentCoproId } = useCopro();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Helper: wrap mutations with loading state and error handling
  // ============================================================================
  const withSaving = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T | null> => {
      if (!currentCoproId) {
        const err = 'Aucune copropriété sélectionnée';
        setError(err);
        options.onError?.(err);
        return null;
      }

      setIsSaving(true);
      setError(null);

      try {
        const result = await operation();
        options.onSuccess?.();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(message);
        options.onError?.(message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [currentCoproId, options]
  );

  // ============================================================================
  // Budget mutations
  // ============================================================================

  const createBudget = useCallback(
    async (input: CreateBudgetParams): Promise<string | null> => {
      return withSaving(() =>
        budgetApi.createBudget({
          copro_id: currentCoproId!,
          ...input,
        })
      );
    },
    [currentCoproId, withSaving]
  );

  const updateBudget = useCallback(
    async (budgetId: string, input: budgetApi.UpdateBudgetInput): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.updateBudget(budgetId, input));
      return result !== null;
    },
    [withSaving]
  );

  const updateBudgetStatus = useCallback(
    async (budgetId: string, status: BudgetStatut): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.updateBudgetStatus(budgetId, status));
      return result !== null;
    },
    [withSaving]
  );

  const deleteBudget = useCallback(
    async (budgetId: string): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.deleteBudget(budgetId));
      return result !== null;
    },
    [withSaving]
  );

  // ============================================================================
  // Budget line mutations
  // ============================================================================

  const createLine = useCallback(
    async (input: CreateLineParams): Promise<string | null> => {
      return withSaving(() =>
        budgetApi.createBudgetLine({
          copro_id: currentCoproId!,
          ...input,
        })
      );
    },
    [currentCoproId, withSaving]
  );

  const updateLine = useCallback(
    async (lineId: string, input: budgetApi.UpdateBudgetLineInput): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.updateBudgetLine(lineId, input));
      return result !== null;
    },
    [withSaving]
  );

  const deleteLine = useCallback(
    async (lineId: string): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.deleteBudgetLine(lineId));
      return result !== null;
    },
    [withSaving]
  );

  // ============================================================================
  // Expense mutations
  // ============================================================================

  const createExpense = useCallback(
    async (input: CreateExpenseParams): Promise<string | null> => {
      return withSaving(() =>
        budgetApi.createExpense({
          copro_id: currentCoproId!,
          ...input,
        })
      );
    },
    [currentCoproId, withSaving]
  );

  const updateExpense = useCallback(
    async (expenseId: string, input: budgetApi.UpdateExpenseInput): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.updateExpense(expenseId, input));
      return result !== null;
    },
    [withSaving]
  );

  const submitExpenseForValidation = useCallback(
    async (expenseId: string): Promise<boolean> => {
      const result = await withSaving(() =>
        budgetApi.updateExpenseStatus(expenseId, DepenseStatut.EN_ATTENTE_VALIDATION)
      );
      return result !== null;
    },
    [withSaving]
  );

  const validateExpense = useCallback(
    async (expenseId: string): Promise<boolean> => {
      const result = await withSaving(() =>
        budgetApi.updateExpenseStatus(expenseId, DepenseStatut.VALIDEE)
      );
      return result !== null;
    },
    [withSaving]
  );

  const rejectExpense = useCallback(
    async (expenseId: string, comment: string): Promise<boolean> => {
      const result = await withSaving(() =>
        budgetApi.updateExpenseStatus(expenseId, DepenseStatut.REJETEE, comment)
      );
      return result !== null;
    },
    [withSaving]
  );

  const deleteExpense = useCallback(
    async (expenseId: string): Promise<boolean> => {
      const result = await withSaving(() => budgetApi.deleteExpense(expenseId));
      return result !== null;
    },
    [withSaving]
  );

  return {
    isSaving,
    error,
    // Budget
    createBudget,
    updateBudget,
    updateBudgetStatus,
    deleteBudget,
    // Lines
    createLine,
    updateLine,
    deleteLine,
    // Expenses
    createExpense,
    updateExpense,
    submitExpenseForValidation,
    validateExpense,
    rejectExpense,
    deleteExpense,
  };
}
