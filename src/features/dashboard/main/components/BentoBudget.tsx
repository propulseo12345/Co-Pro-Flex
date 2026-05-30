'use client';

import Link from 'next/link';
import { formatCurrency } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface BentoBudgetProps {
  budgetPct?: number;
  budgetVote?: number;
  budgetRealise?: number;
}

export function BentoBudget({ budgetPct, budgetVote, budgetRealise }: BentoBudgetProps) {
  const hasBudget = budgetPct !== undefined && budgetVote !== undefined;

  return (
    <div className={styles.card}>
      <div className={styles.label}>Budget {new Date().getFullYear()}</div>
      {hasBudget ? (
        <>
          <div className={styles.budgetPct} style={{ color: '#3b82f6' }}>{budgetPct} %</div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(budgetPct ?? 0, 100)}%`, background: '#3b82f6' }}
            />
          </div>
          <div className={styles.budgetDetail} style={{ color: '#6B7A8D' }}>
            <span className={styles.mono}>{formatCurrency(budgetRealise ?? 0)}</span>
            {' consommés sur '}
            <span className={styles.mono}>{formatCurrency(budgetVote)}</span>
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/finance/budgets" className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}>
            Voir le budget
          </Link>
        </>
      ) : (
        <>
          <div className={styles.budgetPct} style={{ color: 'var(--text-secondary)' }}>—</div>
          <div className={styles.budgetDetail}>Aucun budget voté</div>
          <div style={{ flex: 1 }} />
          <Link href="/finance/budgets" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Créer un budget
          </Link>
        </>
      )}
    </div>
  );
}
