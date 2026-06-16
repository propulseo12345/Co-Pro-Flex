'use client';

import { Check } from 'lucide-react';
import styles from './OnboardingStepper.module.css';

export interface OnboardingStep {
  id: number;
  label: string;
}

interface OnboardingStepperProps {
  steps: OnboardingStep[];
  currentStep: number;
  maxStepReached: number;
  onStepClick: (step: number) => void;
}

export function OnboardingStepper({
  steps,
  currentStep,
  maxStepReached,
  onStepClick,
}: OnboardingStepperProps) {
  return (
    <div className={styles.stepper}>
      {steps.map((step, index) => {
        const isCompleted = step.id < maxStepReached;
        const isActive = step.id === currentStep;
        // L'étape 1 (création de la copro) se fait hors wizard (/onboarding/create) : non
        // navigable ici. Les étapes 2→max déjà atteintes restent cliquables (retour arrière).
        const isClickable = step.id >= 2 && step.id <= maxStepReached;

        return (
          <div key={step.id} className={styles.stepWrapper}>
            {index > 0 && (
              <div className={`${styles.connector} ${isCompleted ? styles.completed : ''}`} />
            )}
            <div
              className={`${styles.step} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''} ${isClickable ? styles.clickable : ''}`}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              <div className={styles.stepNumber}>
                {isCompleted ? <Check size={14} /> : step.id}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
