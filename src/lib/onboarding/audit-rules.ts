import type { OnboardingAuditIssue } from '@/lib/onboarding/api';

/**
 * Liste blanche des fautes STRUCTURELLES qui cassent les livres et bloquent la finalisation.
 *
 * Décision 2026-06-08 : on PRÉVIENT sur tout, on ne BLOQUE que sur les 2 fautes que la base
 * elle-même empêche déjà d'écrire (triggers trg_check_transaction_balance / trg_enforce_lot_id_on_45x)
 * → dernier rempart anti-corruption, jamais atteint par un usage normal. Les écarts de
 * réconciliation (LOT_GL_MISMATCH, CALL_TOTAL_MISMATCH) et le solde 471/472 = avertissements :
 * un syndic reprenant un mandat avec des chiffres imparfaits doit pouvoir finaliser.
 *
 * Noms alignés sur les issue_type réellement émis par audit_finance_integrity (migration 0028).
 * (Les anciens noms TOTAL_MISMATCH / OVER_* / SOURCE_ID_MISSING / CHAPEAU_450_POSTED n'existent
 * plus → l'ancienne liste ne matchait rien et ne bloquait jamais.)
 */
export const BLOCKING_ISSUE_TYPES: ReadonlySet<string> = new Set([
  'LEDGER_UNBALANCED',   // écriture postée déséquilibrée (Σ débit ≠ Σ crédit)
  'LOT_ID_MISSING_45X',  // créance/dette 45x sans lot (viole la règle lot-centric)
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
