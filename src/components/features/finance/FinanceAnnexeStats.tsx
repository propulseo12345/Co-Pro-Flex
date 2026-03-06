'use client';

import { useAnnexeSummary } from '@/hooks/modules/useAnnexeSummary';
import styles from './FinanceAnnexeStats.module.css';

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

export function FinanceAnnexeStats() {
  const { kpis, isLoading, error } = useAnnexeSummary();

  if (isLoading || error || !kpis) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.stat}>
        <span className={styles.label}>Tresorerie</span>
        <span className={styles.value}>{formatEuro(kpis.tresorerie)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Creances</span>
        <span className={styles.value}>{formatEuro(kpis.total_impayes)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Provisions</span>
        <span className={styles.value}>{formatEuro(kpis.provisions_travaux)}</span>
      </div>
      <div className={styles.stat}>
        <span className={styles.label}>Dettes</span>
        <span className={styles.value}>{formatEuro(kpis.dettes)}</span>
      </div>
    </div>
  );
}
