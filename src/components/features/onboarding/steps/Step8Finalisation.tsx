'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import {
  postOnboardingCalls,
  postOnboardingOpeningBalances,
  auditOnboardingBooks,
  type OnboardingCallPlan,
  type SoldeOpeningEntry,
  type OnboardingAuditIssue,
} from '@/lib/onboarding/api';
import styles from './Step7RepriseSoldes.module.css';

interface Step8Props {
  coproId: string;
  periodId: string;
  budgetId: string | null;
  callPlan: OnboardingCallPlan | null;
  openingEntries: SoldeOpeningEntry[];
  onFinalized: () => void;
  onBack: () => void;
}

export function Step8Finalisation({ coproId, periodId, budgetId, callPlan, openingEntries, onFinalized, onBack }: Step8Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<OnboardingAuditIssue[] | null>(null);
  const [waitingBalance, setWaitingBalance] = useState<number | null>(null);

  const handleFinalize = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setIssues(null);

    // 1) Poster les appels (échéances restantes)
    if (callPlan && budgetId && callPlan.installments.length > 0) {
      const r = await postOnboardingCalls(coproId, periodId, budgetId, callPlan);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 2) Poster la reprise des soldes
    if (openingEntries.length > 0) {
      const r = await postOnboardingOpeningBalances(coproId, periodId, openingEntries);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 3) Auditer (audit=0 ET compte d'attente=0)
    const audit = await auditOnboardingBooks(coproId);
    setIsRunning(false);
    if (audit.error) { setError(audit.error.message); return; }

    setIssues(audit.data!.issues);
    setWaitingBalance(audit.data!.waitingBalance);

    if (audit.data!.clean) {
      onFinalized();
    }
  }, [coproId, periodId, budgetId, callPlan, openingEntries, onFinalized]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Finalisation"
        description="On enregistre les écritures comptables, puis on vérifie que le grand livre est cohérent avant de terminer."
      />

      {error && <div className={styles.errorMsg}>{error}</div>}

      {issues && issues.length > 0 && (
        <div className={styles.errorMsg}>
          <strong>{issues.length} écart(s) d&apos;intégrité — finalisation bloquée :</strong>
          <ul>
            {issues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}
      {waitingBalance !== null && Math.abs(waitingBalance) >= 0.01 && (
        <div className={styles.errorMsg}>
          Compte d&apos;attente (471/472) non soldé : {waitingBalance.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}.
          Complétez la reprise (banque, réserves) pour le ramener à 0.
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack} disabled={isRunning}>Retour</button>
        <button className={styles.btnFinish} onClick={handleFinalize} disabled={isRunning}>
          {isRunning ? 'Vérification...' : 'Enregistrer et vérifier'}
        </button>
      </div>
    </div>
  );
}
