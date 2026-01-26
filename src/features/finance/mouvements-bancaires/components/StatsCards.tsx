'use client';

import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import styles from '../../../../app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface StatsCardsProps {
  totalEntrees: number;
  totalSorties: number;
  soldeActuel: number;
  soldeInitial: number;
}

export function StatsCards({
  totalEntrees,
  totalSorties,
  soldeActuel,
  soldeInitial,
}: StatsCardsProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
          <TrendingUp size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Total entrées</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            +{totalEntrees.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
          <TrendingDown size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Total sorties</span>
          <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
            -{totalSorties.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <DollarSign size={24} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Solde actuel (calculé)</span>
          <span className={styles.statValue}>
            {soldeActuel.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className={styles.statDetail}>
            Initial: {soldeInitial.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>
    </div>
  );
}
