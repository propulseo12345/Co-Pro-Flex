'use client';

import { useState, useCallback } from 'react';
import type { OnboardingStep } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';

const STEPS: OnboardingStep[] = [
  { id: 1, label: 'Copropriété' },
  { id: 2, label: 'Copropriétaires' },
  { id: 3, label: 'Lots & Clés' },
  { id: 4, label: 'Comptes bancaires' },
  { id: 5, label: 'Budget' },
  { id: 6, label: 'AG & Appels' },
  { id: 7, label: 'Reprise soldes' },
];

export interface OnboardingState {
  coproId: string | null;
  coproName: string | null;
}

export function useOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepReached, setMaxStepReached] = useState(1);
  const [state, setState] = useState<OnboardingState>({
    coproId: null,
    coproName: null,
  });

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= STEPS.length && step <= maxStepReached) {
      setCurrentStep(step);
    }
  }, [maxStepReached]);

  const completeStep = useCallback((step: number) => {
    const nextStep = step + 1;
    if (nextStep <= STEPS.length) {
      setCurrentStep(nextStep);
      setMaxStepReached(prev => Math.max(prev, nextStep));
    }
  }, []);

  const setCoproCreated = useCallback((coproId: string, coproName: string) => {
    setState(prev => ({ ...prev, coproId, coproName }));
  }, []);

  const isLastStep = currentStep === STEPS.length;
  const isFirstStep = currentStep === 1;

  return {
    steps: STEPS,
    currentStep,
    maxStepReached,
    state,
    goToStep,
    completeStep,
    setCoproCreated,
    isLastStep,
    isFirstStep,
  };
}
