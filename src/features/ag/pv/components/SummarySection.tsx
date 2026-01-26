'use client';

import type { PVStats } from '../domain/types';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface SummarySectionProps {
  stats: PVStats;
}

export function SummarySection({ stats }: SummarySectionProps) {
  return (
    <div className="card">
      <h2 className={styles.sectionTitle}>Résumé de l'assemblée</h2>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryValue}>{stats.totalCount}</div>
          <div className={styles.summaryLabel}>Résolutions votées</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardSuccess}`}>
          <div className={styles.summaryValue}>{stats.adoptedCount}</div>
          <div className={styles.summaryLabel}>Résolutions adoptées</div>
        </div>
        <div className={`${styles.summaryCard} ${styles.summaryCardDanger}`}>
          <div className={styles.summaryValue}>{stats.rejectedCount}</div>
          <div className={styles.summaryLabel}>Résolutions rejetées</div>
        </div>
      </div>
    </div>
  );
}
