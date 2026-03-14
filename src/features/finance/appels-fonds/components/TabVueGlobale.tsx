'use client';

import type { AppelStats, TravauxStats } from '../types';
import { formatEuros } from '../utils';
import { StatsGrid } from './StatsGrid';
import type { StatItem } from './StatsGrid';
import { ProgressBar } from './ProgressBar';
import { AlertBanner } from './AlertBanner';
import styles from '../styles/AppelsFondsPage.module.css';

interface TabVueGlobaleProps {
  globalStats: AppelStats;
  courantStats: AppelStats;
  travauxStats: TravauxStats;
  impayesCount: number;
  onViewImpayes?: () => void;
}

export function TabVueGlobale({
  globalStats,
  courantStats,
  travauxStats,
  impayesCount,
  onViewImpayes,
}: TabVueGlobaleProps) {
  const globalItems: StatItem[] = [
    {
      icon: '💰',
      iconColor: 'blue',
      label: 'Total appelé',
      value: formatEuros(globalStats.totalCalled),
    },
    {
      icon: '✓',
      iconColor: 'green',
      label: 'Encaissé',
      value: formatEuros(globalStats.totalPaid),
      valueColor: 'green',
    },
    {
      icon: '⏳',
      iconColor: 'red',
      label: 'Restant dû',
      value: formatEuros(globalStats.totalUnpaid),
      valueColor: 'red',
    },
    {
      icon: '📈',
      iconColor: 'amber',
      label: 'Recouvrement',
      value: `${globalStats.recoveryRate} %`,
    },
  ];

  return (
    <div>
      <StatsGrid items={globalItems} />

      <AlertBanner
        count={impayesCount}
        message="sur budget courant + travaux — Relance J+30 recommandée"
        actionLabel="Voir les impayés"
        onAction={onViewImpayes}
      />

      <div className={styles.sectionTitleRow}>
        <div className={`${styles.sectionIconSm} ${styles.sectionIconSmBlue}`}>
          📋
        </div>
        <div className={styles.sectionTitleText}>Budget courant</div>
        <div className={styles.sectionMeta}>
          {formatEuros(courantStats.totalCalled)} · {courantStats.recoveryRate} % encaissé
        </div>
      </div>
      <ProgressBar
        label="Recouvrement"
        value={`${formatEuros(courantStats.totalPaid)} / ${formatEuros(courantStats.totalCalled)}`}
        percentage={courantStats.recoveryRate}
        color="green"
      />

      <div className={styles.sectionTitleRowSpaced}>
        <div className={`${styles.sectionIconSm} ${styles.sectionIconSmPurple}`}>
          🔧
        </div>
        <div className={styles.sectionTitleText}>Travaux</div>
        <div className={styles.sectionMeta}>
          {formatEuros(travauxStats.totalCalled)} · {travauxStats.recoveryRate} % encaissé · {travauxStats.projectCount} chantier{travauxStats.projectCount > 1 ? 's' : ''}
        </div>
      </div>
      <ProgressBar
        label="Recouvrement"
        value={`${formatEuros(travauxStats.totalPaid)} / ${formatEuros(travauxStats.totalCalled)}`}
        percentage={travauxStats.recoveryRate}
        color="purple"
      />
    </div>
  );
}
