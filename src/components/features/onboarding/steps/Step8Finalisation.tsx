'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import {
  postOnboardingCalls,
  postOnboardingOpeningBalances,
  auditOnboardingBooks,
  getValidatedBudgetCallProof,
  type OnboardingCallPlan,
  type SoldeOpeningEntry,
  type OnboardingAuditIssue,
} from '@/lib/onboarding/api';
import { computeFinalizationDecision } from './finalisation-rules';
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

function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function Step8Finalisation({
  coproId, periodId, budgetId, callPlan, openingEntries, onFinalized, onBack,
}: Step8Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<OnboardingAuditIssue[] | null>(null);
  const [warningIssues, setWarningIssues] = useState<OnboardingAuditIssue[]>([]);
  const [waitingBalance, setWaitingBalance] = useState<number | null>(null);
  const [callBlocked, setCallBlocked] = useState(false);

  const handleFinalize = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setBlockingIssues(null);
    setCallBlocked(false);

    // 1) Poster les appels (échéances restantes voulues)
    if (callPlan && budgetId && callPlan.installments.length > 0) {
      const r = await postOnboardingCalls(coproId, periodId, budgetId, callPlan);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 2) Poster la reprise des soldes (NB: remplacé par set_opening_balance au Plan B)
    if (openingEntries.length > 0) {
      const r = await postOnboardingOpeningBalances(coproId, periodId, openingEntries);
      if (r.error) { setError(r.error.message); setIsRunning(false); return; }
    }

    // 3) Auditer EN BASE (liste blanche) + preuve positive (appels émis), en parallèle
    const [audit, proof] = await Promise.all([
      auditOnboardingBooks(coproId),
      getValidatedBudgetCallProof(coproId),
    ]);
    setIsRunning(false);

    if (audit.error) { setError(audit.error.message); return; }
    if (proof.error) { setError(proof.error.message); return; }

    setBlockingIssues(audit.data!.blockingIssues);
    setWarningIssues(audit.data!.warningIssues);
    setWaitingBalance(audit.data!.waitingBalance);

    // 4) Décision : liste blanche + preuve positive (plan vide jamais bloqué)
    const decision = computeFinalizationDecision({
      cleanByWhitelist: audit.data!.clean,
      plannedInstallments: callPlan?.installments.length ?? 0,
      hasValidatedBudget: proof.data!.hasValidatedBudget,
      issuedCallCount: proof.data!.issuedCallCount,
    });

    if (decision.reason === 'NO_ISSUED_CALL') setCallBlocked(true);

    // 471/472 ≠ 0 = avertissement, JAMAIS bloquant : on finalise quand même si la décision le permet.
    if (decision.canFinalize) onFinalized();
  }, [coproId, periodId, budgetId, callPlan, openingEntries, onFinalized]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Finalisation"
        description="On enregistre les écritures comptables, puis on vérifie que le grand livre est cohérent avant de terminer."
      />

      {error && <div className={styles.errorMsg}>{error}</div>}

      {blockingIssues && blockingIssues.length > 0 && (
        <div className={styles.errorMsg}>
          <strong>{blockingIssues.length} faute(s) comptable(s) — finalisation bloquée :</strong>
          <ul>
            {blockingIssues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}

      {callBlocked && (
        <div className={styles.errorMsg}>
          Un échéancier d&apos;appels a été préparé mais aucun appel n&apos;a été émis pour le budget validé.
          Revenez à l&apos;étape « AG &amp; Appels » pour émettre les appels avant de finaliser.
        </div>
      )}

      {warningIssues.length > 0 && (
        <div className={styles.warningMsg}>
          <strong>{warningIssues.length} point(s) d&apos;attention (non bloquant) :</strong>
          <ul>
            {warningIssues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}

      {waitingBalance !== null && Math.abs(waitingBalance) >= 0.01 && (
        <div className={styles.warningMsg}>
          Reprise à terminer : {formatEur(waitingBalance)} restent à imputer (compte d&apos;attente 471/472).
          Vous pouvez finaliser maintenant ; une alerte vous rappellera de compléter la reprise plus tard.
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
