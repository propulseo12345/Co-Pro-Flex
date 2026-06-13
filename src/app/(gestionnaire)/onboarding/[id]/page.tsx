'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { setActiveCopro } from '@/lib/copro/activeCopro';
import { useOnboarding } from '@/hooks/modules/useOnboarding';
import { getOrCreateOnboardingPeriod } from '@/lib/onboarding/api';
import type { OnboardingCallPlan } from '@/lib/onboarding/api';
import { createClient } from '@/lib/supabase/client';
import { OnboardingStepper } from '@/components/features/onboarding/OnboardingStepper/OnboardingStepper';
import { Step2Coproprietaires } from '@/components/features/onboarding/steps/Step2Coproprietaires';
import { Step3LotsKeys } from '@/components/features/onboarding/steps/Step3LotsKeys';
import { Step4Comptes } from '@/components/features/onboarding/steps/Step4Comptes';
import { Step5Budget } from '@/components/features/onboarding/steps/Step5Budget';
import { Step6AgAppels } from '@/components/features/onboarding/steps/Step6AgAppels';
import { RepriseSoldes } from '@/components/features/onboarding/reprise/RepriseSoldes';
import { Step8Finalisation } from '@/components/features/onboarding/steps/Step8Finalisation';
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

  // State partagé entre steps 5-8
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState<string | null>(null);
  // Bornes de la période de reprise (clamp de la date de reprise, step 7). [P1]
  const [periodStart, setPeriodStart] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [_callPlan, setCallPlan] = useState<OnboardingCallPlan | null>(null);

  // Mémoriser la copro active pour les steps qui en ont besoin
  useEffect(() => {
    if (coproId) {
      setActiveCopro(coproId, coproName || '');
    }
  }, [coproId, coproName]);

  // Récupérer budgetId + periodId depuis la DB si on reprend à step 5+
  useEffect(() => {
    if (currentStep >= 5 && coproId && !isLoading) {
      // Period : on cible la période portant DÉJÀ la reprise (sinon l'ouverte, sinon on la
      // crée via l'exercice contenant aujourd'hui). On est DANS le wizard -> création autorisée
      // (helper canonique partagé avec Step5Budget : une seule période d'onboarding cohérente).
      if (!periodId) {
        getOrCreateOnboardingPeriod(coproId).then(res => {
          if (res.data) {
            setPeriodId(res.data.id);
            setPeriodStart(res.data.start);
            setPeriodEnd(res.data.end);
          }
        });
      }

      // Budget — chercher le dernier budget créé pour cette copro
      if (!budgetId) {
        const supabase = createClient();
        supabase
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

  const handleFinalize = useCallback(async () => {
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
              onComplete={(plan) => { setCallPlan(plan); completeStep(6); }}
              onBack={() => goToStep(5)}
            />
          </div>
        )}
        {periodId && maxStepReached >= 7 && (
          <div style={{ display: currentStep === 7 ? undefined : 'none' }}>
            <RepriseSoldes
              coproId={coproId}
              periodId={periodId}
              periodStart={periodStart ?? undefined}
              periodEnd={periodEnd ?? undefined}
              onSaved={() => completeStep(7)}
              onSkip={() => completeStep(7)}
              onBack={() => goToStep(6)}
              saveLabel="Enregistrer et continuer"
            />
          </div>
        )}
        {periodId && maxStepReached >= 8 && (
          <div style={{ display: currentStep === 8 ? undefined : 'none' }}>
            <Step8Finalisation
              coproId={coproId}
              onFinalized={handleFinalize}
              onBack={() => goToStep(7)}
              onEditReprise={() => goToStep(7)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
