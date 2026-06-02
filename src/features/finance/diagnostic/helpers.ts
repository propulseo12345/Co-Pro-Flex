import type { IntegrityIssue } from './useFinanceDiagnostic';

/**
 * Libellés FR des types d'anomalie remontés par v_finance_integrity_issues.
 * Cf. migrations V0 (filets de détection).
 */
const ISSUE_TYPE_LABELS: Record<string, string> = {
  TOTAL_MISMATCH: 'Total ≠ lignes',
  OVER_ALLOCATED: 'Sur-affecté',
  UNDER_ALLOCATED: 'Sous-affecté',
  OVER_PAID: 'Trop payé',
  CALL_VS_BUDGET_MISMATCH: 'Appels ≠ budget',
  LOT_GL_MISMATCH: 'Relevé ≠ Grand Livre',
};

/** Libellé lisible d'un issue_type (fallback : la valeur brute). */
export function issueTypeLabel(issueType: string | null): string {
  if (!issueType) return 'Inconnu';
  return ISSUE_TYPE_LABELS[issueType] ?? issueType;
}

/** Libellé FR du type d'entité concernée. */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  call_for_funds: 'Appel de fonds',
  supplier_invoice: 'Facture fournisseur',
  payment: 'Paiement',
  budget: 'Budget',
  lot: 'Lot',
};

export function entityTypeLabel(entityType: string | null): string {
  if (!entityType) return '—';
  return ENTITY_TYPE_LABELS[entityType] ?? entityType;
}

export interface IssueCount {
  issueType: string;
  label: string;
  count: number;
}

/** Compte les anomalies par issue_type, trié par occurrence décroissante. */
export function countByIssueType(issues: IntegrityIssue[]): IssueCount[] {
  const counts = new Map<string, number>();

  for (const issue of issues) {
    const key = issue.issue_type ?? 'UNKNOWN';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([issueType, count]) => ({
      issueType,
      label: issueTypeLabel(issueType),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
