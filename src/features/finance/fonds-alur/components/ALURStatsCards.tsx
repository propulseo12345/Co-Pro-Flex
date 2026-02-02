'use client';

import { PiggyBank, TrendingUp, Percent, ArrowRightLeft } from 'lucide-react';
import type { ALURFundSummary } from '@/hooks/modules/useALURData';
import styles from '@/app/(dashboard)/finance/fonds-alur/fonds-alur.module.css';

interface ALURStatsCardsProps {
  fundSummary: ALURFundSummary | null;
}

export function ALURStatsCards({ fundSummary }: ALURStatsCardsProps) {
  return (
    <div className={styles.statsContainer}>
      <div className={`${styles.statCard} ${styles.primary}`}>
        <div className={styles.statIcon}>
          <PiggyBank size={28} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Solde du fonds</span>
          <span className={styles.statValue}>
            {(fundSummary?.soldeActuel ?? 0).toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <TrendingUp size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Cotisation annuelle</span>
          <span className={styles.statValue}>
            {(fundSummary?.cotisationAnnuelle ?? 0).toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <Percent size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Part du budget</span>
          <span className={styles.statValue}>{fundSummary?.pourcentageBudget ?? 5}%</span>
          <span className={styles.statSubtext}>
            du budget de {(fundSummary?.budgetFonctionnement ?? 0).toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon}>
          <ArrowRightLeft size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Transferts</span>
          <span className={styles.statValue}>
            {(fundSummary?.totalTransferred ?? 0).toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
            })}
          </span>
          <span className={styles.statSubtext}>total transféré</span>
        </div>
      </div>
    </div>
  );
}
