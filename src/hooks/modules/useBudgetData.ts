'use client';

/**
 * Hook for loading budget data from Supabase
 * Source of truth: Supabase only - no mock fallback
 */

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { getCurrentBusinessYear } from '@/lib/time/period';
import * as budgetApi from '@/lib/budget/api';

// ============================================================================
// Types
// ============================================================================

export interface UseBudgetDataOptions {
  /** Period year to filter budgets (defaults to current business year) */
  periodYear?: number;
  /** Optional budget ID for detail view */
  budgetId?: string;
  /** Budget type to filter */
  budgetType?: budgetApi.BudgetType;
}

export interface UseBudgetDataReturn {
  /** List of budgets (from v_budgets_overview) */
  budgets: budgetApi.BudgetOverview[];
  /** Budget lines for selected budget (from v_budget_lines_overview) */
  lines: budgetApi.BudgetLineOverview[];
  /** Expenses for selected budget (from v_budget_expenses_detail) */
  expenses: budgetApi.ExpenseDetail[];
  /** Currently selected budget (if budgetId provided) */
  currentBudget: budgetApi.BudgetOverview | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh all data */
  refresh: () => Promise<void>;
  /** Load lines for a specific budget */
  loadBudgetLines: (budgetId: string) => Promise<void>;
  /** Load expenses for a specific budget */
  loadBudgetExpenses: (budgetId: string) => Promise<void>;
  /** Get accounting period for a year */
  getAccountingPeriod: (year: number) => Promise<{ id: string; status: string } | null>;
}

// ============================================================================
// Hook
// ============================================================================

export function useBudgetData(options: UseBudgetDataOptions = {}): UseBudgetDataReturn {
  const { currentCoproId } = useCopro();
  const periodYear = options.periodYear ?? getCurrentBusinessYear();

  // State
  const [budgets, setBudgets] = useState<budgetApi.BudgetOverview[]>([]);
  const [lines, setLines] = useState<budgetApi.BudgetLineOverview[]>([]);
  const [expenses, setExpenses] = useState<budgetApi.ExpenseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Load budgets list
  // ============================================================================
  const loadBudgets = useCallback(async () => {
    if (!currentCoproId) {
      setBudgets([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // If a specific budgetId is provided, load it directly (regardless of year)
      if (options.budgetId) {
        const budget = await budgetApi.getBudget(currentCoproId, options.budgetId);
        if (budget) {
          setBudgets([budget]);
        } else {
          setBudgets([]);
        }
      } else {
        // Otherwise, load all budgets for the period
        let data = await budgetApi.listBudgets(currentCoproId, periodYear);

        // Filter by budget type if specified
        if (options.budgetType) {
          data = data.filter(b => b.budget_type === options.budgetType);
        }

        setBudgets(data);
      }
    } catch (err) {
      console.error('[useBudgetData] Error loading budgets:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des budgets');
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, periodYear, options.budgetType, options.budgetId]);

  // ============================================================================
  // Load budget lines
  // ============================================================================
  const loadBudgetLines = useCallback(async (budgetId: string) => {
    if (!currentCoproId) {
      setLines([]);
      return;
    }

    try {
      const data = await budgetApi.listBudgetLines(currentCoproId, budgetId);
      setLines(data);
    } catch (err) {
      console.error('[useBudgetData] Error loading lines:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des postes');
      setLines([]);
    }
  }, [currentCoproId]);

  // ============================================================================
  // Load budget expenses
  // ============================================================================
  const loadBudgetExpenses = useCallback(async (budgetId: string) => {
    if (!currentCoproId) {
      setExpenses([]);
      return;
    }

    try {
      const data = await budgetApi.listBudgetExpenses(currentCoproId, budgetId);
      setExpenses(data);
    } catch (err) {
      console.error('[useBudgetData] Error loading expenses:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des dépenses');
      setExpenses([]);
    }
  }, [currentCoproId]);

  // ============================================================================
  // Get accounting period
  // ============================================================================
  const getAccountingPeriod = useCallback(async (year: number) => {
    if (!currentCoproId) return null;

    try {
      return await budgetApi.getAccountingPeriod(currentCoproId, year);
    } catch (err) {
      console.error('[useBudgetData] Error getting period:', err);
      return null;
    }
  }, [currentCoproId]);

  // ============================================================================
  // Refresh all data
  // ============================================================================
  const refresh = useCallback(async () => {
    await loadBudgets();

    // If a specific budget is selected, also load its details
    if (options.budgetId) {
      await Promise.all([
        loadBudgetLines(options.budgetId),
        loadBudgetExpenses(options.budgetId),
      ]);
    }
  }, [loadBudgets, loadBudgetLines, loadBudgetExpenses, options.budgetId]);

  // ============================================================================
  // Auto-load on mount and when dependencies change
  // ============================================================================
  useEffect(() => {
    refresh();
  }, [refresh]);

  // ============================================================================
  // Current budget (derived from budgets list)
  // ============================================================================
  const currentBudget = options.budgetId
    ? budgets.find(b => b.id === options.budgetId) || null
    : null;

  return {
    budgets,
    lines,
    expenses,
    currentBudget,
    isLoading,
    error,
    refresh,
    loadBudgetLines,
    loadBudgetExpenses,
    getAccountingPeriod,
  };
}

// ============================================================================
// Helper hooks for specific budget types
// ============================================================================

/**
 * Hook for fonctionnement budget
 */
export function useBudgetFonctionnement(periodYear?: number) {
  return useBudgetData({ periodYear, budgetType: 'current' });
}

/**
 * Hook for travaux budgets
 */
export function useBudgetTravaux(periodYear?: number) {
  return useBudgetData({ periodYear, budgetType: 'works' });
}

/**
 * Hook for ALUR budget
 */
export function useBudgetALUR(periodYear?: number) {
  return useBudgetData({ periodYear, budgetType: 'alur' });
}
