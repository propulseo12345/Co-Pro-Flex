'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ModeEcheancier } from '@/types';
import {
  genererResolutionBudget,
  validerBudgetPourResolution,
  BudgetData,
  ResolutionBudget,
} from '@/lib/utils/budget';
import { useCopro } from '@/providers/CoproContext';
import { useBudgetMutations } from '@/hooks/modules/useBudgetMutations';
import { getAccountingPeriod } from '@/lib/budget/api';

export interface CleRepartition {
  value: string;
  label: string;
}

export const CLES_REPARTITION: CleRepartition[] = [
  { value: 'CHARGES_GENERALES', label: 'Charges générales' },
  { value: 'ASCENSEUR', label: 'Ascenseur' },
  { value: 'CHAUFFAGE', label: 'Chauffage' },
  { value: 'EAU', label: 'Eau' },
  { value: 'ELECTRICITE', label: 'Électricité' },
  { value: 'TRAVAUX', label: 'Travaux' },
  { value: 'AUTRE', label: 'Autre' },
];

export type ValidationStep = 'config' | 'preview' | 'success';

export function useBudgetValidationPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [step, setStep] = useState<ValidationStep>('config');
  const [budget, setBudget] = useState<BudgetData>({
    id: '',
    annee: new Date().getFullYear() + 1,
    montantTotal: 0,
    dateDebut: '',
    dateFin: '',
  });
  const [modeEcheancier, setModeEcheancier] = useState<ModeEcheancier>('TRIMESTRIEL');
  const [cleRepartition, setCleRepartition] = useState('CHARGES_GENERALES');
  const [resolutionGeneree, setResolutionGeneree] = useState<ResolutionBudget | null>(null);
  const [createdBudgetId, setCreatedBudgetId] = useState<string | null>(null);

  // Supabase mutation hook
  const {
    createBudget,
    isSaving,
    error: mutationError,
  } = useBudgetMutations({
    onError: (err) => console.error('[BudgetValidation] Mutation error:', err),
  });

  const updateBudget = useCallback((updates: Partial<BudgetData>) => {
    setBudget((prev) => ({ ...prev, ...updates }));
  }, []);

  const handlePreview = useCallback(() => {
    const validation = validerBudgetPourResolution(budget);
    if (!validation.valide) {
      alert('Erreurs de validation :\n' + validation.erreurs.join('\n'));
      return;
    }

    const resolution = genererResolutionBudget(budget, modeEcheancier, cleRepartition);
    setResolutionGeneree(resolution);
    setStep('preview');
  }, [budget, modeEcheancier, cleRepartition]);

  const handleValider = useCallback(async () => {
    if (!resolutionGeneree || !currentCoproId) return;

    try {
      // 1. Get accounting period for the year
      const period = await getAccountingPeriod(currentCoproId, budget.annee);
      if (!period) {
        alert(
          `Aucun exercice comptable trouvé pour l'année ${budget.annee}. Veuillez d'abord créer un exercice.`
        );
        return;
      }

      // 2. Create budget in Supabase
      const budgetId = await createBudget({
        period_id: period.id,
        budget_type: 'current',
        name: `Budget prévisionnel ${budget.annee}`,
        notes: `Échéancier: ${modeEcheancier}, Clé: ${cleRepartition}`,
      });

      if (!budgetId) {
        alert('Erreur lors de la création du budget. Veuillez réessayer.');
        return;
      }

      setCreatedBudgetId(budgetId);
      setStep('success');
    } catch (err) {
      console.error('[BudgetValidation] Error:', err);
      alert('Une erreur est survenue lors de la validation du budget.');
    }
  }, [resolutionGeneree, currentCoproId, budget.annee, modeEcheancier, cleRepartition, createBudget]);

  const goBack = useCallback(() => {
    router.back();
  }, [router]);

  const goToBudgets = useCallback(() => {
    router.push('/finance/budgets');
  }, [router]);

  const goToNewAG = useCallback(() => {
    router.push('/ag/new');
  }, [router]);

  const goToConfig = useCallback(() => {
    setStep('config');
  }, []);

  const getCleRepartitionLabel = useCallback((value: string) => {
    return CLES_REPARTITION.find((c) => c.value === value)?.label || value;
  }, []);

  return {
    // State
    step,
    budget,
    modeEcheancier,
    cleRepartition,
    resolutionGeneree,
    createdBudgetId,
    currentCoproId,

    // Loading/Error
    isSaving,
    mutationError,

    // Data
    clesRepartition: CLES_REPARTITION,

    // Handlers
    updateBudget,
    setModeEcheancier,
    setCleRepartition,
    handlePreview,
    handleValider,
    goBack,
    goToBudgets,
    goToNewAG,
    goToConfig,

    // Helpers
    getCleRepartitionLabel,
  };
}
