'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import { Step1Copropriete } from '@/components/features/onboarding/steps/Step1Copropriete';
import { Step2Coproprietaires } from '@/components/features/onboarding/steps/Step2Coproprietaires';
import { Step3LotsKeys } from '@/components/features/onboarding/steps/Step3LotsKeys';
import { Step4Comptes } from '@/components/features/onboarding/steps/Step4Comptes';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const router = useRouter();
  const {
    steps,
    currentStep,
    maxStepReached,
    state,
    goToStep,
    completeStep,
    setCoproCreated,
  } = useOnboarding();

  const handleStep1Complete = useCallback((coproId: string, coproName: string) => {
    setCoproCreated(coproId, coproName);
    completeStep(1);
  }, [setCoproCreated, completeStep]);

  const handleStep2Complete = useCallback(() => {
    completeStep(2);
  }, [completeStep]);

  const handleStep3Complete = useCallback(() => {
    completeStep(3);
  }, [completeStep]);

  const handleStep4Complete = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Nouvelle copropriété</h1>
        <p className={styles.subtitle}>
          {state.coproName
            ? `Configuration de « ${state.coproName} »`
            : 'Configurez votre copropriété étape par étape'}
        </p>
      </div>

      <OnboardingStepper
        steps={steps}
        currentStep={currentStep}
        maxStepReached={maxStepReached}
        onStepClick={goToStep}
      />

      <div className={styles.stepContent}>
        {currentStep === 1 && (
          <Step1Copropriete
            onComplete={handleStep1Complete}
            existingCoproId={state.coproId}
          />
        )}
        {currentStep === 2 && state.coproId && (
          <Step2Coproprietaires
            coproId={state.coproId}
            onComplete={handleStep2Complete}
            onBack={() => goToStep(1)}
          />
        )}
        {currentStep === 3 && state.coproId && (
          <Step3LotsKeys
            coproId={state.coproId}
            onComplete={handleStep3Complete}
            onBack={() => goToStep(2)}
          />
        )}
        {currentStep === 4 && state.coproId && (
          <Step4Comptes
            coproId={state.coproId}
            onComplete={handleStep4Complete}
            onBack={() => goToStep(3)}
          />
        )}
      </div>
    </div>
  );
}
