'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { ensureAccountingPeriod } from '@/lib/onboarding/api';
import { createClient } from '@/lib/supabase/client';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import { Step2Coproprietaires } from '@/components/features/onboarding/steps/Step2Coproprietaires';
import { Step3LotsKeys } from '@/components/features/onboarding/steps/Step3LotsKeys';
import { Step4Comptes } from '@/components/features/onboarding/steps/Step4Comptes';
import { Step5Budget } from '@/components/features/onboarding/steps/Step5Budget';
import { Step6AgAppels } from '@/components/features/onboarding/steps/Step6AgAppels';
import { Step7RepriseSoldes } from '@/components/features/onboarding/steps/Step7RepriseSoldes';
import styles from '../onboarding.module.css';

export default function OnboardingWizardPage() {
  const router = useRouter();
  const params = useParams();
  const coproId = params.id as string;
  const {
    steps,
    currentStep,
    maxStepReached,
    coproName,
    isLoading,
    goToStep,
    completeStep,
    finishOnboarding,
  } = useOnboarding(coproId);

  // State partagé entre steps 5-7
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);

  // Mémoriser la copro active pour les steps qui en ont besoin
  useEffect(() => {
    if (coproId) {
      setActiveCopro(coproId, coproName || '');
    }
  }, [coproId, coproName]);

  // Récupérer budgetId + periodId depuis la DB si on reprend à step 5+
  useEffect(() => {
    if (currentStep >= 5 && coproId && !isLoading) {
      const year = new Date().getFullYear();

      // Period
      if (!periodId) {
        ensureAccountingPeriod(coproId, year).then(res => {
          if (res.data) setPeriodId(res.data.id);
        });
      }

      // Budget — chercher le dernier budget créé pour cette copro
      if (!budgetId) {
        const supabase = createClient() as ReturnType<typeof createClient>;
        (supabase as any)
          .from('budgets')
          .select('id')
          .eq('copro_id', coproId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }: { data: { id: string } | null }) => {
            if (data) setBudgetId(data.id);
          });
      }
    }
  }, [currentStep, periodId, budgetId, coproId, isLoading]);

  const handleStep5Complete = useCallback((newBudgetId: string | null, newPeriodId: string) => {
    setBudgetId(newBudgetId);
    setPeriodId(newPeriodId);
    completeStep(5);
  }, [completeStep]);

  const handleStep7Complete = useCallback(async () => {
    await finishOnboarding();
    router.push('/portefeuille');
  }, [finishOnboarding, router]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Chargement...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {coproName ? `Configuration de « ${coproName} »` : 'Configuration'}
        </h1>
        <p className={styles.subtitle}>
          Étape {currentStep} / {steps.length}
        </p>
      </div>

      <OnboardingStepper
        steps={steps}
        currentStep={currentStep}
        maxStepReached={maxStepReached}
        onStepClick={goToStep}
      />

      <div className={styles.stepContent}>
        {/* Step 1 est fait dans /onboarding/create — on commence à step 2 */}

        {maxStepReached >= 2 && (
          <div style={{ display: currentStep === 2 ? undefined : 'none' }}>
            <Step2Coproprietaires
              coproId={coproId}
              onComplete={() => completeStep(2)}
              onBack={() => router.push('/onboarding')}
            />
          </div>
        )}
        {maxStepReached >= 3 && (
          <div style={{ display: currentStep === 3 ? undefined : 'none' }}>
            <Step3LotsKeys
              coproId={coproId}
              onComplete={() => completeStep(3)}
              onBack={() => goToStep(2)}
            />
          </div>
        )}
        {maxStepReached >= 4 && (
          <div style={{ display: currentStep === 4 ? undefined : 'none' }}>
            <Step4Comptes
              coproId={coproId}
              onComplete={() => completeStep(4)}
              onBack={() => goToStep(3)}
            />
          </div>
        )}
        {maxStepReached >= 5 && (
          <div style={{ display: currentStep === 5 ? undefined : 'none' }}>
            <Step5Budget
              coproId={coproId}
              onComplete={handleStep5Complete}
              onBack={() => goToStep(4)}
            />
          </div>
        )}
        {periodId && maxStepReached >= 6 && (
          <div style={{ display: currentStep === 6 ? undefined : 'none' }}>
            <Step6AgAppels
              coproId={coproId}
              budgetId={budgetId}
              periodId={periodId}
              onComplete={() => completeStep(6)}
              onBack={() => goToStep(5)}
            />
            {/* NOTE: capture du plan (Step8 finalisation) câblée au lot suivant — l'argument est ignoré ici. */}
          </div>
        )}
        {periodId && maxStepReached >= 7 && (
          <div style={{ display: currentStep === 7 ? undefined : 'none' }}>
            <Step7RepriseSoldes
              coproId={coproId}
              periodId={periodId}
              onComplete={handleStep7Complete}
              onBack={() => goToStep(6)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
