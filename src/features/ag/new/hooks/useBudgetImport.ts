'use client';

/**
 * Hook pour importer les données budget depuis Supabase
 * Utilise la même source de données que /finance/budgets
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { listBudgets, listBudgetLines } from '@/lib/budget/api';
import type { BudgetPoste } from '../domain/types';
import type { BudgetOverview } from '@/lib/budget/api';

export type BudgetImportSource = 'current_priority' | 'all_budgets' | 'manual';

export interface BudgetImportOption {
  id: string;
  coproId: string;
  year: number;
  name: string;
  type: BudgetOverview['budget_type'];
  status: BudgetOverview['status'];
  totalPlanned: number;
}

export interface UseBudgetImportReturn {
  /** Charge les postes du budget pour une année */
  importBudget: (params: { exercice: number; source: BudgetImportSource; budgetId?: string | null }) => Promise<BudgetPoste[]>;
  /** Total du budget importé */
  budgetTotal: number | null;
  /** Année du budget chargé */
  budgetExercice: number | null;
  /** État de chargement */
  isLoading: boolean;
  /** Erreur éventuelle */
  error: string | null;
  /** Indique si un budget existe pour l'année demandée */
  budgetExists: boolean;
  /** Liste des exercices disponibles */
  availableYears: number[];
  /** Budgets disponibles (catalogue) */
  availableBudgets: BudgetImportOption[];
  /** Chargement du catalogue de budgets */
  isCatalogLoading: boolean;
}

/**
 * Hook pour importer les postes budget depuis Supabase
 * Utilise EXACTEMENT la même source que /finance/budgets
 */
export function useBudgetImport(): UseBudgetImportReturn {
  const { currentCoproId: contextCoproId } = useCopro();
  const currentCoproId = contextCoproId || '11111111-aaaa-bbbb-cccc-111111111111';
  const [isLoading, setIsLoading] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [budgetExercice, setBudgetExercice] = useState<number | null>(null);
  const [budgetExists, setBudgetExists] = useState(false);
  const [catalogBudgets, setCatalogBudgets] = useState<BudgetOverview[]>([]);

  const loadCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const budgets = await fetchBudgetsCatalog(currentCoproId);
      setCatalogBudgets(budgets);
    } catch (err) {
      console.error('[useBudgetImport] Error loading catalog:', err);
      setCatalogBudgets([]);
    } finally {
      setIsCatalogLoading(false);
    }
  }, [currentCoproId]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const availableBudgets = useMemo<BudgetImportOption[]>(
    () =>
      catalogBudgets.map((budget) => ({
        id: budget.id,
        coproId: budget.copro_id,
        year: budget.period_year,
        name: budget.name,
        type: budget.budget_type,
        status: budget.status,
        totalPlanned: Number(budget.total_planned) || 0,
      })),
    [catalogBudgets]
  );

  const availableYears = useMemo<number[]>(
    () => Array.from(new Set(availableBudgets.map((b) => b.year))).sort((a, b) => b - a),
    [availableBudgets]
  );

  const importBudget = useCallback(async ({ exercice, source, budgetId }: {
    exercice: number;
    source: BudgetImportSource;
    budgetId?: string | null;
  }): Promise<BudgetPoste[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const scopedBudgets = catalogBudgets.filter((b) => b.period_year === exercice);
      let selectedBudget = selectBudgetForSource(scopedBudgets, source, budgetId);

      if (!selectedBudget) {
        const fallbackBudgets = await fetchBudgetsByYear(exercice);
        selectedBudget = selectBudgetForSource(fallbackBudgets, source, budgetId);
      }

      if (!selectedBudget) {
        setError(`Aucun budget trouvé pour l'exercice ${exercice}. Créez d'abord un budget dans Finance > Budgets.`);
        setBudgetExists(false);
        setBudgetTotal(null);
        setBudgetExercice(exercice);
        return [];
      }

      // Charger les lignes du budget sélectionné
      const budgetLines = await listBudgetLines(selectedBudget.copro_id, selectedBudget.id);

      // Convertir les lignes en postes AG
      const postes: BudgetPoste[] = budgetLines.map((line, index) => ({
        id: `import-${line.id}-${Date.now()}-${index}`,
        poste: line.label || line.code || `Poste ${index + 1}`,
        montant: Number(line.planned_amount) || 0,
        accountId: line.account_id || undefined,
        repartitionKeyId: line.repartition_key_id || undefined,
      }));

      // Calculer le total (même méthode que /finance/budgets)
      const total = Number(selectedBudget.total_planned) || 0;

      setBudgetTotal(total);
      setBudgetExercice(exercice);
      setBudgetExists(true);

      return postes;
    } catch (err) {
      console.error('[useBudgetImport] Error:', err);
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'import du budget';
      setError(message);
      setBudgetExists(false);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [catalogBudgets]);

  return {
    importBudget,
    budgetTotal,
    budgetExercice,
    isLoading,
    error,
    budgetExists,
    availableYears,
    availableBudgets,
    isCatalogLoading,
  };
}

function selectBestBudgetForImport(budgets: BudgetOverview[]): BudgetOverview | null {
  if (budgets.length === 0) return null;

  // Priorité 1: budget de fonctionnement (cas nominal AG)
  const currentBudget = budgets.find((b) => b.budget_type === 'current');
  if (currentBudget) return currentBudget;

  // Priorité 2: budget validé avec le plus gros total
  const validatedBudgets = budgets.filter((b) => b.status === 'validated');
  if (validatedBudgets.length > 0) {
    return validatedBudgets.sort((a, b) => Number(b.total_planned) - Number(a.total_planned))[0] ?? null;
  }

  // Priorité 3: fallback sur le premier budget disponible de l'année
  return budgets[0] ?? null;
}

async function fetchBudgetsByYear(periodYear: number): Promise<BudgetOverview[]> {
  const { createClient } = await import('@/lib/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('v_budgets_overview')
    .select('*')
    .eq('period_year', periodYear)
    .order('budget_type', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BudgetOverview[];
}

async function fetchBudgetsCatalog(coproId: string): Promise<BudgetOverview[]> {
  const primary = await listBudgets(coproId);
  if (primary.length > 0) {
    return primary;
  }

  const { createClient } = await import('@/lib/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('v_budgets_overview')
    .select('*')
    .order('period_year', { ascending: false })
    .order('budget_type', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BudgetOverview[];
}

function selectBudgetForSource(
  budgets: BudgetOverview[],
  source: BudgetImportSource,
  budgetId?: string | null
): BudgetOverview | null {
  if (budgets.length === 0) return null;

  if (source === 'manual') {
    if (!budgetId) return null;
    return budgets.find((b) => b.id === budgetId) || null;
  }

  if (source === 'all_budgets') {
    const validatedBudgets = budgets.filter((b) => b.status === 'validated');
    if (validatedBudgets.length > 0) {
      return validatedBudgets.sort((a, b) => Number(b.total_planned) - Number(a.total_planned))[0] ?? null;
    }
    return budgets.sort((a, b) => Number(b.total_planned) - Number(a.total_planned))[0] ?? null;
  }

  return selectBestBudgetForImport(budgets);
}
