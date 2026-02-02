'use client';

import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface ProgressCardProps {
  votesComplets: number;
  totalVotes: number;
  progression: number;
}

export function ProgressCard({ votesComplets, totalVotes, progression }: ProgressCardProps) {
  return (
    <div className={styles.progressCard}>
      <div className={styles.progressHeader}>
        <span className={styles.progressLabel}>Progression</span>
        <span className={styles.progressValue}>{votesComplets} / {totalVotes} votes</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progression}%` }} />
      </div>
      <div className={styles.progressPercentage}>{progression}%</div>
    </div>
  );
}
