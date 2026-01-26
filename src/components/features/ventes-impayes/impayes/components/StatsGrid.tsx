'use client';

import { AlertTriangle, Euro, FileText, Gavel } from 'lucide-react';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface StatsGridProps {
  activeCount: number;
  montantTotal: number;
  nbMiseEnDemeure: number;
  nbContentieux: number;
}

export function StatsGrid({ activeCount, montantTotal, nbMiseEnDemeure, nbContentieux }: StatsGridProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: '#fee2e2' }}>
          <AlertTriangle size={24} style={{ color: '#991b1b' }} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{activeCount}</h3>
          <p className={styles.statLabel}>Impayés actifs</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: '#fef3c7' }}>
          <Euro size={24} style={{ color: '#92400e' }} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{montantTotal.toLocaleString('fr-FR')} €</h3>
          <p className={styles.statLabel}>Montant total</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: '#fee2e2' }}>
          <FileText size={24} style={{ color: '#dc2626' }} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{nbMiseEnDemeure}</h3>
          <p className={styles.statLabel}>Mises en demeure</p>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: '#fce7f3' }}>
          <Gavel size={24} style={{ color: '#9d174d' }} aria-hidden="true" />
        </div>
        <div className={styles.statContent}>
          <h3 className={styles.statValue}>{nbContentieux}</h3>
          <p className={styles.statLabel}>En contentieux</p>
        </div>
      </div>
    </div>
  );
}
