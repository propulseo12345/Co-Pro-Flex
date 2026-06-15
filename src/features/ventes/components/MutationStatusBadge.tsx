'use client';

import { Clock, FileCheck, FileText, Pen, CheckCircle2, XCircle, Send } from 'lucide-react';
import type { MutationStatus } from '../domain/types';
import { MUTATION_STATUS_LABELS } from '../domain/types';
import styles from './MutationStatusBadge.module.css';

interface MutationStatusBadgeProps {
  status: MutationStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<MutationStatus, { icon: typeof Clock; className: string }> = {
  draft: { icon: Clock, className: styles.draft },
  pre_etat_generated: { icon: FileText, className: styles.preEtat },
  etat_generated: { icon: FileCheck, className: styles.etatGenerated },
  sent_to_notary: { icon: Send, className: styles.sentToNotary },
  signed: { icon: Pen, className: styles.signed },
  validated: { icon: CheckCircle2, className: styles.validated },
  cancelled: { icon: XCircle, className: styles.cancelled },
};

export function MutationStatusBadge({ status, size = 'md' }: MutationStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className={`${styles.badge} ${config.className} ${styles[size]}`}>
      <Icon size={size === 'sm' ? 12 : 14} />
      <span>{MUTATION_STATUS_LABELS[status]}</span>
    </span>
  );
}
