'use client';

import { Wallet, Check, Clock, Wrench } from 'lucide-react';
import type { TravauxStats, TravauxProject } from '../types';
import { formatEuros } from '../utils';
import { StatsGrid } from './StatsGrid';
import type { StatItem } from './StatsGrid';
import { ProgressBar } from './ProgressBar';
import { TravauxCard } from './TravauxCard';
import cardStyles from '../styles/Cards.module.css';

interface TabTravauxProps {
  stats: TravauxStats;
  projects: TravauxProject[];
  onEmit?: (callId: string) => void;
}

export function TabTravaux({ stats, projects, onEmit }: TabTravauxProps) {
  const statItems: StatItem[] = [
    {
      icon: <Wallet size={18} />,
      iconColor: 'purple',
      label: 'Total voté',
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
      icon: <Wrench size={18} />,
      iconColor: 'amber',
      label: 'Chantiers',
      value: String(stats.projectCount),
    },
  ];

  return (
    <div>
      <StatsGrid items={statItems} />

      <ProgressBar
        label="Recouvrement travaux"
        value={`${formatEuros(stats.totalPaid)} / ${formatEuros(stats.totalCalled)}`}
        percentage={stats.recoveryRate}
        color="purple"
      />

      <div className={cardStyles.travauxGrid}>
        {projects.map((project) => (
          <TravauxCard key={project.budgetId} project={project} onEmit={onEmit} />
        ))}
      </div>
    </div>
  );
}
