'use client';

import { Users, TrendingDown, TrendingUp, Scale } from 'lucide-react';
import type { RelevesStats } from './types';
import styles from './releves-individuels.module.css';

interface RelevesStatsProps {
  stats: RelevesStats;
}

export function RelevesStats({ stats }: RelevesStatsProps) {
  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant);
  };

  return (
    <div className={styles.statsContainer}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Users size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.totalCoproprietaires}</span>
          <span className={styles.statLabel}>Copropriétaires</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIcon} ${styles.statIconDanger}`}>
          <TrendingDown size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={`${styles.statValue} ${styles.statDanger}`}>
            {stats.nombreDebiteurs}
          </span>
          <span className={styles.statLabel}>Débiteurs</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
          <TrendingUp size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={`${styles.statValue} ${styles.statSuccess}`}>
            {stats.nombreCrediteurs}
          </span>
          <span className={styles.statLabel}>Créditeurs</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={`${styles.statIcon} ${stats.totalSoldeGlobal >= 0 ? styles.statIconSuccess : styles.statIconDanger}`}>
          <Scale size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={`${styles.statValue} ${stats.totalSoldeGlobal >= 0 ? styles.statSuccess : styles.statDanger}`}>
            {formatMontant(stats.totalSoldeGlobal)}
          </span>
          <span className={styles.statLabel}>Solde global</span>
        </div>
      </div>
    </div>
  );
}
