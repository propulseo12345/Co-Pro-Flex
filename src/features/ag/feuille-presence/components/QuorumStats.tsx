'use client';

import { UserCheck, Users } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

interface QuorumStatsData {
  attendeesCount: number;
  presentCount: number;
  proxyCount: number;
  presentTantiemes: number;
  totalTantiemes: number;
  quorumRatio: number;
}

interface QuorumStatsProps {
  stats: QuorumStatsData;
}

export function QuorumStats({ stats }: QuorumStatsProps) {
  return (
    <div className={styles.stats}>
      <div className={styles.statCard}>
        <UserCheck size={24} aria-hidden="true" />
        <div>
          <div className={styles.statValue}>{stats.attendeesCount}</div>
          <div className={styles.statLabel}>
            Présents ({stats.presentCount}) / Représentés ({stats.proxyCount})
          </div>
        </div>
      </div>
      <div className={styles.statCard}>
        <Users size={24} aria-hidden="true" />
        <div>
          <div className={styles.statValue}>
            {stats.presentTantiemes} / {stats.totalTantiemes}
          </div>
          <div className={styles.statLabel}>Tantièmes</div>
        </div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{stats.quorumRatio.toFixed(2)}%</div>
        <div className={styles.statLabel}>Taux de participation</div>
      </div>
    </div>
  );
}
