'use client';

import { FileText, Euro, CheckCircle, Percent } from 'lucide-react';
import type { AppelsFondsStats as StatsType } from './types';
import styles from './appels-fonds.module.css';

interface AppelsFondsStatsProps {
  stats: StatsType;
}

export function AppelsFondsStats({ stats }: AppelsFondsStatsProps) {
  return (
    <div className={styles.statsContainer}>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <FileText size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.totalAppels}</span>
          <span className={styles.statLabel}>Appels de fonds</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Euro size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.montantTotal.toLocaleString('fr-FR')} €</span>
          <span className={styles.statLabel}>Montant total appelé</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <CheckCircle size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statValue}>{stats.montantEncaisse.toLocaleString('fr-FR')} €</span>
          <span className={styles.statLabel}>Montant encaissé</span>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Percent size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={`${styles.statValue} ${stats.tauxRecouvrement >= 80 ? styles.statSuccess : stats.tauxRecouvrement >= 50 ? styles.statWarning : styles.statDanger}`}>
            {stats.tauxRecouvrement.toFixed(1)}%
          </span>
          <span className={styles.statLabel}>Taux de recouvrement</span>
        </div>
      </div>
    </div>
  );
}
