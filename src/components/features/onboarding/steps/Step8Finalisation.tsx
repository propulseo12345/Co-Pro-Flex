'use client';

import { useState, useCallback } from 'react';
import { StepHeader } from '../shared/StepHeader';
import {
  auditOnboardingBooks,
  getValidatedBudgetCallProof,
  type OnboardingAuditIssue,
} from '@/lib/onboarding/api';
import { computeFinalizationDecision } from './finalisation-rules';
import styles from './Step8Finalisation.module.css';

interface Step8Props {
  coproId: string;
  onFinalized: () => void;
  onBack: () => void;
  /** Rouvre l'étape 7 (reprise) pour compléter le résidu 471/472. */
  onEditReprise: () => void;
}

function formatEur(n: number): string {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

export function Step8Finalisation({ coproId, onFinalized, onBack, onEditReprise }: Step8Props) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<OnboardingAuditIssue[] | null>(null);
  const [warningIssues, setWarningIssues] = useState<OnboardingAuditIssue[]>([]);
  const [waitingBalance, setWaitingBalance] = useState<number | null>(null);
  const [callBlocked, setCallBlocked] = useState(false);

  // Post-as-you-go : les appels (Step6) et la reprise (Step7) sont DÉJÀ en base.
  // Step8 ne re-poste RIEN : il LIT l'état réel (audit liste blanche + preuve positive
  // d'appel émis du Plan C). Le résidu 471/472 est séparé et NON bloquant.
  const handleFinalize = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setBlockingIssues(null);
    setCallBlocked(false);

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

    // Décision : liste blanche + preuve positive (un budget validé sans appel émis bloque).
    const decision = computeFinalizationDecision({
      cleanByWhitelist: audit.data!.clean,
      // Post-as-you-go : si un budget validé existe avec >= 1 appel, le plan est honoré.
      // On dérive l'intention "un échéancier était voulu" de l'existence du budget validé.
      plannedInstallments: proof.data!.hasValidatedBudget ? 1 : 0,
      hasValidatedBudget: proof.data!.hasValidatedBudget,
      issuedCallCount: proof.data!.issuedCallCount,
    });

    if (decision.reason === 'NO_ISSUED_CALL') setCallBlocked(true);

    // 471/472 ≠ 0 = avertissement, JAMAIS bloquant : on finalise si la décision le permet.
    if (decision.canFinalize) onFinalized();
  }, [coproId, onFinalized]);

  const hasResidual = waitingBalance !== null && Math.abs(waitingBalance) >= 0.01;

  return (
    <div className={styles.container}>
      <StepHeader
        title="Finalisation"
        description="On vérifie que le grand livre est cohérent. Une reprise incomplète (compte d'attente ≠ 0) n'empêche pas de terminer : vous pourrez la compléter depuis le tableau de bord."
      />

      {error && <div className={styles.errorMsg}>{error}</div>}

      {blockingIssues && blockingIssues.length > 0 && (
        <div className={styles.errorMsg}>
          <strong>{blockingIssues.length} écart(s) bloquant(s) — corrigez avant de terminer :</strong>
          <ul>
            {blockingIssues.map((i, idx) => (
              <li key={idx}>{i.issue_type} — {i.description}</li>
            ))}
          </ul>
        </div>
      )}

      {callBlocked && (
        <div className={styles.errorMsg}>
          Un budget a été validé mais aucun appel n&apos;a été émis. Revenez à l&apos;étape
          « AG &amp; Appels » pour émettre les appels avant de finaliser.
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

      {hasResidual && (
        <div className={styles.warningMsg}>
          Compte d&apos;attente (471/472) non soldé : {formatEur(waitingBalance!)}.
          Ce n&apos;est pas bloquant — vous pourrez compléter la reprise plus tard.
          <button className={styles.linkBtn} onClick={onEditReprise}>Compléter maintenant</button>
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack} disabled={isRunning}>Retour</button>
        <button className={styles.btnFinish} onClick={handleFinalize} disabled={isRunning}>
          {isRunning ? 'Vérification…' : 'Vérifier et terminer'}
        </button>
      </div>
    </div>
  );
}
