'use client';

import styles from '@/app/(dashboard)/finance/tantiemes/tantiemes.module.css';

interface TantiemesStatsSectionProps {
  totalTantiemes: number;
  totalLots: number;
  ownersCount: number;
}

export function TantiemesStatsSection({ totalTantiemes, totalLots, ownersCount }: TantiemesStatsSectionProps) {
  return (
    <div className={styles.statsSection}>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Total tantièmes</span>
        <span className={styles.statValue}>{totalTantiemes.toLocaleString('fr-FR')}</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Nombre de lots</span>
        <span className={styles.statValue}>{totalLots}</span>
      </div>
      <div className={styles.statCard}>
        <span className={styles.statLabel}>Copropriétaires</span>
        <span className={styles.statValue}>{ownersCount}</span>
      </div>
    </div>
  );
}
