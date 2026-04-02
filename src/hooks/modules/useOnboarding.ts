'use client';

import { useState, useCallback, useEffect } from 'react';
import { getOnboardingState, updateOnboardingStep, completeOnboarding } from '@/lib/onboarding/api';
import type { OnboardingStep } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { id: 1, label: 'Copropriété' },
  { id: 2, label: 'Copropriétaires' },
  { id: 3, label: 'Lots & Clés' },
  { id: 4, label: 'Comptes bancaires' },
  { id: 5, label: 'Budget' },
  { id: 6, label: 'AG & Appels' },
  { id: 7, label: 'Reprise soldes' },
];

export function useOnboarding(coproId: string) {
  const [currentStep, setCurrentStep] = useState(2);
  const [maxStepReached, setMaxStepReached] = useState(2);
  const [coproName, setCoproName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger l'état depuis Supabase au mount
  useEffect(() => {
    async function load() {
      const { data } = await getOnboardingState(coproId);
      if (data) {
        setCoproName(data.name);
        const step = data.onboarding_step || 2;
        const maxStep = data.onboarding_max_step || step;
        setCurrentStep(step);
        setMaxStepReached(maxStep);
      }
      setIsLoading(false);
    }
    load();
  }, [coproId]);

  const goToStep = useCallback((step: number) => {
    if (step >= 2 && step <= ONBOARDING_STEPS.length && step <= maxStepReached) {
      setCurrentStep(step);
      updateOnboardingStep(coproId, step, maxStepReached);
    }
  }, [coproId, maxStepReached]);

  const completeStep = useCallback((step: number) => {
    const nextStep = step + 1;
    if (nextStep <= ONBOARDING_STEPS.length) {
      setCurrentStep(nextStep);
      const newMax = Math.max(maxStepReached, nextStep);
      setMaxStepReached(newMax);
      updateOnboardingStep(coproId, nextStep, newMax);
    }
  }, [coproId, maxStepReached]);

  const finishOnboarding = useCallback(async () => {
    await completeOnboarding(coproId);
  }, [coproId]);

  return {
    steps: ONBOARDING_STEPS,
    currentStep,
    maxStepReached,
    coproId,
    coproName,
    isLoading,
    goToStep,
    completeStep,
    finishOnboarding,
    isLastStep: currentStep === ONBOARDING_STEPS.length,
  };
}
