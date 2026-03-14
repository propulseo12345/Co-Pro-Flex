'use client';

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
      icon: '💰',
      iconColor: 'purple',
      label: 'Total voté',
      value: formatEuros(stats.totalCalled),
    },
    {
      icon: '✓',
      iconColor: 'green',
      label: 'Encaissé',
      value: formatEuros(stats.totalPaid),
      valueColor: 'green',
    },
    {
      icon: '⏳',
      iconColor: 'red',
      label: 'Restant dû',
      value: formatEuros(stats.totalUnpaid),
      valueColor: 'red',
    },
    {
      icon: '🔧',
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
