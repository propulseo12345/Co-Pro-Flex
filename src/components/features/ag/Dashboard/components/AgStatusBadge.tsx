'use client';

import clsx from 'clsx';
import styles from './agDashboard.shared.module.css';

export type AgBadgeStatus = 'draft' | 'convoked' | 'in_progress' | 'closed' | 'pv_generated';

interface AgStatusBadgeProps {
  status: AgBadgeStatus;
  label?: string;
  /** For quorum display */
  quorum?: number;
}

const STATUS_CONFIG: Record<AgBadgeStatus, { label: string; className: string }> = {
  draft: { label: 'En préparation', className: styles.badgeDraft },
  convoked: { label: 'Convoquée', className: styles.badgeConvoked },
  in_progress: { label: 'En cours', className: styles.badgeReady },
  closed: { label: 'Clôturée', className: styles.badgeClosed },
  pv_generated: { label: 'PV généré', className: styles.badgeClosed },
};

export function AgStatusBadge({ status, label, quorum }: AgStatusBadgeProps) {
  // Quorum badge variant
  if (quorum !== undefined) {
    return (
      <span className={clsx(styles.badge, styles.badgeQuorum)}>
        Quorum: {quorum.toFixed(1)}%
      </span>
    );
  }

  const config = STATUS_CONFIG[status] || { label: status, className: '' };
  const displayLabel = label || config.label;

  return (
    <span className={clsx(styles.badge, config.className)}>
      {displayLabel}
    </span>
  );
}
