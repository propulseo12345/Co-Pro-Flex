'use client';

import { Wallet, Check, Clock, TrendingUp, FileText, Wrench } from 'lucide-react';
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
      icon: <Wallet size={18} />,
      iconColor: 'blue',
      label: 'Total appelé',
      value: formatEuros(globalStats.totalCalled),
    },
    {
      icon: <Check size={18} />,
      iconColor: 'green',
      label: 'Encaissé',
      value: formatEuros(globalStats.totalPaid),
      valueColor: 'green',
    },
    {
      icon: <Clock size={18} />,
      iconColor: 'red',
      label: 'Restant dû',
      value: formatEuros(globalStats.totalUnpaid),
      valueColor: 'red',
    },
    {
      icon: <TrendingUp size={18} />,
      iconColor: 'amber',
      label: 'Encaissement',
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
          <FileText size={16} />
        </div>
        <div className={styles.sectionTitleText}>Budget courant</div>
        <div className={styles.sectionMeta}>
          {formatEuros(courantStats.totalCalled)} · {courantStats.recoveryRate} % encaissé
        </div>
      </div>
      <ProgressBar
        label="Encaissement"
        value={`${formatEuros(courantStats.totalPaid)} / ${formatEuros(courantStats.totalCalled)}`}
        percentage={courantStats.recoveryRate}
        color="green"
      />

      <div className={styles.sectionTitleRowSpaced}>
        <div className={`${styles.sectionIconSm} ${styles.sectionIconSmPurple}`}>
          <Wrench size={16} />
        </div>
        <div className={styles.sectionTitleText}>Travaux</div>
        <div className={styles.sectionMeta}>
          {formatEuros(travauxStats.totalCalled)} · {travauxStats.recoveryRate} % encaissé · {travauxStats.projectCount} chantier{travauxStats.projectCount > 1 ? 's' : ''}
        </div>
      </div>
      <ProgressBar
        label="Encaissement"
        value={`${formatEuros(travauxStats.totalPaid)} / ${formatEuros(travauxStats.totalCalled)}`}
        percentage={travauxStats.recoveryRate}
        color="purple"
      />
    </div>
  );
}
