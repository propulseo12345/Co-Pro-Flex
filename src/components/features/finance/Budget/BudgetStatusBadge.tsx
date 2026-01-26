'use client';

import { FileEdit, Clock, CheckCircle, XCircle, Lock } from 'lucide-react';
import { BudgetStatut } from '@/types/enums/statuts';
import styles from './Budget.module.css';

interface BudgetStatusBadgeProps {
  statut: BudgetStatut;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<BudgetStatut, { label: string; icon: typeof FileEdit }> = {
  [BudgetStatut.BROUILLON]: { label: 'Brouillon', icon: FileEdit },
  [BudgetStatut.EN_ATTENTE_APPROBATION]: { label: 'En attente AG', icon: Clock },
  [BudgetStatut.APPROUVE]: { label: 'Approuve', icon: CheckCircle },
  [BudgetStatut.REJETE]: { label: 'Rejete', icon: XCircle },
  [BudgetStatut.CLOTURE]: { label: 'Cloture', icon: Lock },
};

const STYLE_MAP: Record<BudgetStatut, string> = {
  [BudgetStatut.BROUILLON]: styles.budgetStatusBrouillon,
  [BudgetStatut.EN_ATTENTE_APPROBATION]: styles.budgetStatusEnAttenteApprobation,
  [BudgetStatut.APPROUVE]: styles.budgetStatusApprouve,
  [BudgetStatut.REJETE]: styles.budgetStatusRejete,
  [BudgetStatut.CLOTURE]: styles.budgetStatusCloture,
};

export function BudgetStatusBadge({ statut, size = 'md', showIcon = true }: BudgetStatusBadgeProps) {
  const config = STATUS_CONFIG[statut];
  const Icon = config.icon;

  const sizeClass = size === 'sm'
    ? styles.budgetStatusBadgeSm
    : size === 'lg'
      ? styles.budgetStatusBadgeLg
      : '';

  const iconSize = size === 'sm' ? 10 : size === 'lg' ? 16 : 12;

  return (
    <span className={`${styles.budgetStatusBadge} ${STYLE_MAP[statut]} ${sizeClass}`}>
      {showIcon && <Icon size={iconSize} aria-hidden="true" />}
      {config.label}
    </span>
  );
}
