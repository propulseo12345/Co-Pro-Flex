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
          <div className={styles.budgetPct}>{budgetPct} %</div>
          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className={styles.budgetDetail}>
            <span className={styles.mono}>{formatCurrency(budgetRealise ?? 0)}</span>
            {' consommés sur '}
            <span className={styles.mono}>{formatCurrency(budgetVote)}</span>
          </div>
          <div style={{ flex: 1 }} />
          <Link href="/finance/budget-current" className={`${styles.btn} ${styles.btnGhost} ${styles.btnFull}`}>
            Voir le budget
          </Link>
        </>
      ) : (
        <>
          <div className={styles.budgetPct} style={{ color: '#94a3b8' }}>—</div>
          <div className={styles.budgetDetail}>Aucun budget voté</div>
          <div style={{ flex: 1 }} />
          <Link href="/finance/budget" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnFull}`}>
            Créer un budget
          </Link>
        </>
      )}
    </div>
  );
}
