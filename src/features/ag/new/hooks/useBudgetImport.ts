'use client';

/**
 * Hook pour importer les données budget depuis Supabase
 * Utilise la même source de données que /finance/budgets
 */

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useBudgetData } from '@/hooks/modules/useBudgetData';
import type { BudgetPoste } from '../domain/types';

export interface UseBudgetImportReturn {
  /** Charge les postes du budget pour une année */
  importBudget: (exercice: number) => Promise<BudgetPoste[]>;
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
}

/**
 * Hook pour importer les postes budget depuis Supabase
 * Utilise EXACTEMENT la même source que /finance/budgets
 */
export function useBudgetImport(): UseBudgetImportReturn {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [budgetExercice, setBudgetExercice] = useState<number | null>(null);
  const [budgetExists, setBudgetExists] = useState(false);

  // Utiliser le hook budget data pour accéder aux mêmes données que /finance/budgets
  const { budgets, lines, loadBudgetLines, isLoading: isDataLoading } = useBudgetData({});

  const importBudget = useCallback(async (exercice: number): Promise<BudgetPoste[]> => {
    if (!currentCoproId) {
      setError('Copropriété non sélectionnée');
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      // Chercher le budget de fonctionnement pour l'année demandée
      // On utilise les mêmes données que la page /finance/budgets
      const budgetFonctionnement = budgets.find(
        b => b.period_year === exercice && b.budget_type === 'current'
      );

      if (!budgetFonctionnement) {
        setError(`Aucun budget trouvé pour l'exercice ${exercice}. Créez d'abord un budget dans Finance > Budgets.`);
        setBudgetExists(false);
        setBudgetTotal(null);
        setBudgetExercice(exercice);
        return [];
      }

      // Charger les lignes du budget
      await loadBudgetLines(budgetFonctionnement.id);

      // Attendre que les lignes soient chargées (le hook les met dans `lines`)
      // On doit refetch les lignes ici car loadBudgetLines est async
      const budgetLines = await fetchBudgetLines(currentCoproId, budgetFonctionnement.id);

      // Convertir les lignes en postes AG
      const postes: BudgetPoste[] = budgetLines.map((line, index) => ({
        id: `import-${line.id}-${Date.now()}-${index}`,
        poste: line.label || line.code || `Poste ${index + 1}`,
        montant: Number(line.planned_amount) || 0,
      }));

      // Calculer le total (même méthode que /finance/budgets)
      const total = Number(budgetFonctionnement.total_planned) || 0;

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
  }, [currentCoproId, budgets, loadBudgetLines]);

  return {
    importBudget,
    budgetTotal,
    budgetExercice,
    isLoading: isLoading || isDataLoading,
    error,
    budgetExists,
  };
}

/**
 * Fonction helper pour fetch les lignes budget directement
 * (car le hook met à jour de manière async)
 */
async function fetchBudgetLines(
  coproId: string,
  budgetId: string
): Promise<Array<{ id: string; label: string; code: string | null; planned_amount: number }>> {
  const { createClient } = await import('@/lib/supabase/client');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from('v_budget_lines_overview')
    .select('id, label, code, planned_amount')
    .eq('copro_id', coproId)
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}
