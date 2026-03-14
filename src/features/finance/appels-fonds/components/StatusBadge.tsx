'use client';

import clsx from 'clsx';
import styles from '../styles/StatsGrid.module.css';

export type BadgeVariant = 'green' | 'amber' | 'red' | 'neutral' | 'purple';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
}

const variantMap: Record<BadgeVariant, string> = {
  green: styles.badgeGreen,
  amber: styles.badgeAmber,
  red: styles.badgeRed,
  neutral: styles.badgeNeutral,
  purple: styles.badgePurple,
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
  return (
    <span className={clsx(styles.badge, variantMap[variant])}>
      {label}
    </span>
  );
}
