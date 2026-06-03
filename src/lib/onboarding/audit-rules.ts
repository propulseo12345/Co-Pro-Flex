import type { OnboardingAuditIssue } from '@/lib/onboarding/api';

/**
 * Liste blanche des vraies fautes comptables qui CASSENT les livres (spec §6).
 * Seules ces anomalies rendent l'onboarding non finalisable. Tout le reste
 * (LOT_GL_MISMATCH, CALL_VS_BUDGET_MISMATCH, solde 471/472 ≠ 0) = avertissement.
 */
export const BLOCKING_ISSUE_TYPES: ReadonlySet<string> = new Set([
  'TOTAL_MISMATCH',
  'OVER_ALLOCATED',
  'OVER_PAID',
  'SOURCE_ID_MISSING',
  'CHAPEAU_450_POSTED',
]);

/** true si au moins une anomalie de la liste blanche est présente. */
export function hasBlockingIssue(issues: readonly OnboardingAuditIssue[]): boolean {
  return issues.some((i) => BLOCKING_ISSUE_TYPES.has(i.issue_type));
}

/** Sépare les anomalies en bloquantes (liste blanche) et avertissements (le reste). */
export function splitAuditIssues(issues: readonly OnboardingAuditIssue[]): {
  blocking: OnboardingAuditIssue[];
  warnings: OnboardingAuditIssue[];
} {
  const blocking: OnboardingAuditIssue[] = [];
  const warnings: OnboardingAuditIssue[] = [];
  for (const i of issues) {
    if (BLOCKING_ISSUE_TYPES.has(i.issue_type)) blocking.push(i);
    else warnings.push(i);
  }
  return { blocking, warnings };
}
