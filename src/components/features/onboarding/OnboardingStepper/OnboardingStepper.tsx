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
        const isCompleted = step.id < currentStep;
        const isActive = step.id === currentStep;
        const isClickable = step.id <= maxStepReached;

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
