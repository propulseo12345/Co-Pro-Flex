'use client';

import { FileEdit, Clock, CheckCircle, XCircle } from 'lucide-react';
import { DepenseStatut } from '@/types/enums/statuts';
import styles from './Budget.module.css';

interface DepenseStatusBadgeProps {
  statut: DepenseStatut | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof FileEdit }> = {
  [DepenseStatut.BROUILLON]: { label: 'Brouillon', icon: FileEdit },
  [DepenseStatut.EN_ATTENTE_VALIDATION]: { label: 'En attente', icon: Clock },
  [DepenseStatut.VALIDEE]: { label: 'Validée', icon: CheckCircle },
  [DepenseStatut.REJETEE]: { label: 'Rejetée', icon: XCircle },
};

const STYLE_MAP: Record<string, string> = {
  [DepenseStatut.BROUILLON]: styles.depenseStatusBrouillon,
  [DepenseStatut.EN_ATTENTE_VALIDATION]: styles.depenseStatusEnAttente,
  [DepenseStatut.VALIDEE]: styles.depenseStatusValidee,
  [DepenseStatut.REJETEE]: styles.depenseStatusRejetee,
};

export function DepenseStatusBadge({ statut, size = 'md', showIcon = true }: DepenseStatusBadgeProps) {
  const config = STATUS_CONFIG[statut] || STATUS_CONFIG[DepenseStatut.BROUILLON];
  const Icon = config.icon;

  const sizeClass = size === 'sm'
    ? styles.depenseStatusBadgeSm
    : size === 'lg'
      ? styles.depenseStatusBadgeLg
      : '';

  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;

  return (
    <span className={`${styles.depenseStatusBadge} ${STYLE_MAP[statut] || styles.depenseStatusBrouillon} ${sizeClass}`}>
      {showIcon && <Icon size={iconSize} aria-hidden="true" />}
      {config.label}
    </span>
  );
}
