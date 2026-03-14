'use client';

import { Wallet, Check, Clock, TrendingUp } from 'lucide-react';
import type { AppelStats, TrimesterCard as TrimesterCardType } from '../types';
import { formatEuros } from '../utils';
import { StatsGrid } from './StatsGrid';
import type { StatItem } from './StatsGrid';
import { ProgressBar } from './ProgressBar';
import { AlertBanner } from './AlertBanner';
import { TrimesterCard } from './TrimesterCard';
import cardStyles from '../styles/Cards.module.css';

interface TabBudgetCourantProps {
  stats: AppelStats;
  trimesterCards: TrimesterCardType[];
  impayesCount: number;
  onViewImpayes?: () => void;
  onEmit?: (callId: string) => void;
}

export function TabBudgetCourant({
  stats,
  trimesterCards,
  impayesCount,
  onViewImpayes,
  onEmit,
}: TabBudgetCourantProps) {
  const statItems: StatItem[] = [
    {
      icon: <Wallet size={18} />,
      iconColor: 'blue',
      label: 'Total appelé',
      value: formatEuros(stats.totalCalled),
    },
    {
      icon: <Check size={18} />,
      iconColor: 'green',
      label: 'Encaissé',
      value: formatEuros(stats.totalPaid),
      valueColor: 'green',
    },
    {
      icon: <Clock size={18} />,
      iconColor: 'red',
      label: 'Restant dû',
      value: formatEuros(stats.totalUnpaid),
      valueColor: 'red',
    },
    {
      icon: <TrendingUp size={18} />,
      iconColor: 'amber',
      label: 'Recouvrement',
      value: `${stats.recoveryRate} %`,
    },
  ];

  return (
    <div>
      <StatsGrid items={statItems} />

      <ProgressBar
        label="Progression exercice"
        value={`${formatEuros(stats.totalPaid)} / ${formatEuros(stats.totalCalled)}`}
        percentage={stats.recoveryRate}
        color="green"
      />

      <AlertBanner
        count={impayesCount}
        message="sur T1 + T2 — Relance J+30 recommandée"
        actionLabel="Voir les impayés"
        onAction={onViewImpayes}
      />

      <div className={cardStyles.trimesterGrid}>
        {trimesterCards.map((card) => (
          <TrimesterCard key={card.trimester} card={card} onEmit={onEmit} />
        ))}
      </div>
    </div>
  );
}
