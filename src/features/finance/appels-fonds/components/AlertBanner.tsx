'use client';

import styles from '../styles/StatsGrid.module.css';

interface AlertBannerProps {
  count: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function AlertBanner({ count, message, actionLabel, onAction }: AlertBannerProps) {
  if (count === 0) return null;

  return (
    <div className={styles.alertBanner}>
      <span className={styles.alertIcon}>⚠</span>
      <div className={styles.alertText}>
        <span className={styles.alertStrong}>{count} copropriétaire{count > 1 ? 's' : ''} en impayé</span>
        {' '}{message}
      </div>
      {actionLabel && onAction && (
        <button className={styles.alertAction} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
