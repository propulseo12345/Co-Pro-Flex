'use client';

import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import styles from './onboarding.module.css';

export default function OnboardingPage() {
  const {
    steps,
    currentStep,
    maxStepReached,
    state,
    goToStep,
    completeStep,
    setCoproCreated,
  } = useOnboarding();

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
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 1 — Création de la copropriété (à implémenter)
          </p>
        )}
        {currentStep === 2 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 2 — Copropriétaires (à implémenter)
          </p>
        )}
        {currentStep === 3 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 3 — Lots & Clés de répartition (à implémenter)
          </p>
        )}
        {currentStep === 4 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Étape 4 — Comptes bancaires (à implémenter)
          </p>
        )}
      </div>
    </div>
  );
}
