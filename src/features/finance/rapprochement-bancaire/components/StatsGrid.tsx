'use client';

import { CheckCircle, AlertTriangle, DollarSign, ArrowLeftRight } from 'lucide-react';
import type { RapprochementStats } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface StatsGridProps {
  stats: RapprochementStats;
  soldeReleveFin: number;
}

export function StatsGrid({ stats, soldeReleveFin }: StatsGridProps) {
  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
          <CheckCircle size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Lignes rapprochées</span>
          <span className={styles.statValue} style={{ color: 'var(--success)' }}>
            {stats.rapprochees} / {stats.total}
          </span>
          <span className={styles.statPercent}>{stats.tauxRapprochement}%</span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
          <AlertTriangle size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Écarts à traiter</span>
          <span className={styles.statValue} style={{ color: 'var(--danger)' }}>
            {stats.ecarts}
          </span>
          <span className={styles.statDetail}>
            {stats.dansReleveUniquement} relevé | {stats.dansLogicielUniquement} logiciel
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
          <DollarSign size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Solde relevé fin de mois</span>
          <span className={styles.statValue}>
            {soldeReleveFin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>

      <div className={styles.statCard}>
        <div className={styles.statIcon} style={{
          background: Math.abs(stats.ecartSolde) < 0.01 ? 'var(--success-light)' : 'var(--danger-light)',
          color: Math.abs(stats.ecartSolde) < 0.01 ? 'var(--success)' : 'var(--danger)'
        }}>
          <ArrowLeftRight size={24} />
        </div>
        <div className={styles.statContent}>
          <span className={styles.statLabel}>Écart de solde</span>
          <span className={styles.statValue} style={{
            color: Math.abs(stats.ecartSolde) < 0.01 ? 'var(--success)' : 'var(--danger)'
          }}>
            {stats.ecartSolde.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
          <span className={styles.statDetail}>
            Théorique: {stats.soldeTheorique.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>
    </div>
  );
}
