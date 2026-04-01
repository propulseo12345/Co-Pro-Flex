'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import { Step1Copropriete } from '@/components/features/onboarding/steps/Step1Copropriete';
import { Step2Coproprietaires } from '@/components/features/onboarding/steps/Step2Coproprietaires';
import { Step3LotsKeys } from '@/components/features/onboarding/steps/Step3LotsKeys';
import { Step4Comptes } from '@/components/features/onboarding/steps/Step4Comptes';
import { Step5Budget } from '@/components/features/onboarding/steps/Step5Budget';
import { Step6AgAppels } from '@/components/features/onboarding/steps/Step6AgAppels';
import { Step7RepriseSoldes } from '@/components/features/onboarding/steps/Step7RepriseSoldes';
import { StepContracts } from '@/components/features/onboarding/steps/StepContracts';
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

  // State shared between steps 5-7
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);

  // Parallel step: contracts (optional, available from step 4+)
  const [showContractsStep, setShowContractsStep] = useState(false);

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
    completeStep(4);
  }, [completeStep]);

  const handleStep5Complete = useCallback((newBudgetId: string | null, newPeriodId: string) => {
    setBudgetId(newBudgetId);
    setPeriodId(newPeriodId);
    completeStep(5);
  }, [completeStep]);

  const handleStep6Complete = useCallback(() => {
    completeStep(6);
  }, [completeStep]);

  const handleStep7Complete = useCallback(() => {
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

      {/* Parallel step: contracts — available from step 4+ */}
      {state.coproId && currentStep >= 4 && !showContractsStep && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <button
            onClick={() => setShowContractsStep(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid rgba(148, 163, 184, 0.08)',
              background: 'rgba(148, 163, 184, 0.04)',
              color: '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            + Ajouter des contrats de maintenance (optionnel)
          </button>
        </div>
      )}

      {showContractsStep && state.coproId && (
        <StepContracts
          coproId={state.coproId}
          onClose={() => setShowContractsStep(false)}
        />
      )}

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
        {currentStep === 5 && state.coproId && (
          <Step5Budget
            coproId={state.coproId}
            onComplete={handleStep5Complete}
            onBack={() => goToStep(4)}
          />
        )}
        {currentStep === 6 && state.coproId && periodId && (
          <Step6AgAppels
            coproId={state.coproId}
            budgetId={budgetId}
            periodId={periodId}
            onComplete={handleStep6Complete}
            onBack={() => goToStep(5)}
          />
        )}
        {currentStep === 7 && state.coproId && periodId && (
          <Step7RepriseSoldes
            coproId={state.coproId}
            periodId={periodId}
            onComplete={handleStep7Complete}
            onBack={() => goToStep(6)}
          />
        )}
      </div>
    </div>
  );
}
