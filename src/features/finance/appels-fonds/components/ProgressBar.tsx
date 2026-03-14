'use client';

import React from 'react';
import clsx from 'clsx';
import styles from '../styles/StatsGrid.module.css';

interface ProgressBarProps {
  label: string;
  value: string;
  percentage: number;
  color?: 'green' | 'purple';
}

export function ProgressBar({ label, value, percentage, color = 'green' }: ProgressBarProps) {
  return (
    <div className={styles.progressCompact}>
      <span className={styles.progressLabel}>{label}</span>
      <div className={styles.progressTrack}>
        <div
          className={clsx(styles.progressFill, color === 'purple' ? styles.progressPurple : styles.progressGreen)}
          style={{ '--progress-width': `${Math.min(percentage, 100)}%` } as React.CSSProperties}
        />
      </div>
      <span className={styles.progressValue}>{value}</span>
    </div>
  );
}
