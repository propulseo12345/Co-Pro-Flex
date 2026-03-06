'use client';

import { useAnnexeSummary } from '@/hooks/modules/useAnnexeSummary';
import styles from './BudgetAnnexeStats.module.css';

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export function BudgetAnnexeStats() {
  const { kpis, isLoading, error } = useAnnexeSummary();

  if (isLoading || error || !kpis) return null;

  const ecart = kpis.budget_vote - kpis.budget_realise;

  return (
    <div className={styles.banner}>
      <div className={styles.stat}>
        <span className={styles.label}>Budget vote</span>
        <span className={styles.value}>{formatEuro(kpis.budget_vote)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Realise</span>
        <span className={styles.value}>{formatEuro(kpis.budget_realise)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Consommation</span>
        <span className={styles.value}>{kpis.budget_pct}%</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Ecart</span>
        <span className={`${styles.value} ${ecart >= 0 ? styles.positive : styles.negative}`}>
          {ecart >= 0 ? '+' : ''}{formatEuro(ecart)}
        </span>
      </div>
    </div>
  );
}
