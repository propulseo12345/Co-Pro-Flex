'use client';

import clsx from 'clsx';
import { ShieldCheck } from 'lucide-react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState';
import { formatCurrency } from '@/components/features/finance/Comptabilite/utils';
import { useFinanceDiagnostic } from '@/features/finance/diagnostic/useFinanceDiagnostic';
import {
  countByIssueType,
  entityTypeLabel,
  issueTypeLabel,
} from '@/features/finance/diagnostic/helpers';
import styles from './diagnostic.module.css';

function formatAmount(value: number | null): string {
  if (value === null) return '—';
  return formatCurrency(value);
}

function diffClass(value: number | null): string {
  if (value === null || Math.abs(value) < 0.01) return styles.diffNeutral;
  return value < 0 ? styles.diffNegative : styles.diffPositive;
}

export default function FinanceDiagnosticPage() {
  const { issues, isLoading, error, refresh } = useFinanceDiagnostic();

  const topBar = (
    <FinanceTopBar
      title="Diagnostic — Cohérence financière"
      subtitle="Anomalies détectées par les filets de contrôle (lecture seule)"
    />
  );

  if (isLoading) {
    return (
      <div className={styles.page}>
        {topBar}
        <div className={styles.content}>
          <LoadingState message="Analyse de la cohérence financière..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        {topBar}
        <div className={styles.content}>
          <ErrorState message={error} onRetry={refresh} />
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className={styles.page}>
        {topBar}
        <div className={styles.content}>
          <EmptyState
            title="Aucune incohérence détectée"
            message="Tous les contrôles de cohérence financière sont au vert."
            icon={<ShieldCheck size={48} />}
          />
        </div>
      </div>
    );
  }

  const counts = countByIssueType(issues);

  return (
    <div className={styles.page}>
      {topBar}
      <div className={styles.content}>
        <div className={styles.counters}>
          <div className={styles.counterCard}>
            <span className={styles.counterLabel}>Total anomalies</span>
            <span className={styles.counterValue}>{issues.length}</span>
          </div>
          {counts.map((c) => (
            <div key={c.issueType} className={styles.counterCard}>
              <span className={styles.counterLabel}>{c.label}</span>
              <span className={styles.counterValue}>{c.count}</span>
            </div>
          ))}
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Type d&apos;anomalie</th>
                <th>Entité / description</th>
                <th className={styles.amountCol}>Attendu</th>
                <th className={styles.amountCol}>Constaté</th>
                <th className={styles.amountCol}>Écart</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr key={`${issue.entity_type}-${issue.entity_id}-${issue.issue_type}`}>
                  <td>
                    <span className={styles.issueBadge}>
                      {issueTypeLabel(issue.issue_type)}
                    </span>
                  </td>
                  <td>
                    <span className={styles.entityType}>
                      {entityTypeLabel(issue.entity_type)}
                    </span>
                    {issue.description && (
                      <span className={styles.description}>{issue.description}</span>
                    )}
                  </td>
                  <td className={clsx(styles.amountCol, styles.amount)}>
                    {formatAmount(issue.expected_amount)}
                  </td>
                  <td className={clsx(styles.amountCol, styles.amount)}>
                    {formatAmount(issue.actual_amount)}
                  </td>
                  <td className={clsx(styles.amountCol, styles.amount, diffClass(issue.difference))}>
                    {formatAmount(issue.difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
