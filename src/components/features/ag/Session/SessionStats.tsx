'use client';

import { CheckCircle, XCircle, MinusCircle, Users } from 'lucide-react';
import { VoteStats } from './types';
import statsStyles from './styles/stats.module.css';

interface SessionStatsProps {
  stats: VoteStats;
}

export function SessionStats({ stats }: SessionStatsProps) {
  return (
    <div className={statsStyles.liveStats}>
      <h3>Résultats en temps réel</h3>
      <div className={statsStyles.statsBar}>
        <div
          className={statsStyles.statsBarPour}
          style={{ width: `${stats.total > 0 ? (stats.pour / stats.total) * 100 : 0}%` }}
        >
          {stats.pour > 0 && stats.pour}
        </div>
        <div
          className={statsStyles.statsBarContre}
          style={{ width: `${stats.total > 0 ? (stats.contre / stats.total) * 100 : 0}%` }}
        >
          {stats.contre > 0 && stats.contre}
        </div>
        <div
          className={statsStyles.statsBarAbstention}
          style={{ width: `${stats.total > 0 ? (stats.abstention / stats.total) * 100 : 0}%` }}
        >
          {stats.abstention > 0 && stats.abstention}
        </div>
      </div>
      <div className={statsStyles.statsDetails}>
        <div className={statsStyles.statDetail}>
          <CheckCircle size={18} color="var(--success)" aria-hidden="true" />
          <span>Pour: {stats.pour} tantièmes</span>
        </div>
        <div className={statsStyles.statDetail}>
          <XCircle size={18} color="var(--danger)" aria-hidden="true" />
          <span>Contre: {stats.contre} tantièmes</span>
        </div>
        <div className={statsStyles.statDetail}>
          <MinusCircle size={18} color="var(--warning)" aria-hidden="true" />
          <span>Abstention: {stats.abstention} tantièmes</span>
        </div>
        <div className={statsStyles.statDetail}>
          <Users size={18} color="var(--text-secondary)" aria-hidden="true" />
          <span>Non voté: {stats.nonVote} tantièmes</span>
        </div>
      </div>
    </div>
  );
}
