'use client';

import React from 'react';
import { Clock, Tag, CheckCircle } from 'lucide-react';
import { StatutFacture, StatutBadgeProps } from '../types';
import { STATUTS_FACTURE } from '../utils';
import styles from './StatutBadge.module.css';

/** Map des icones par nom */
const ICONES: Record<string, React.ElementType> = {
  Clock,
  Tag,
  CheckCircle,
};

/** Classes CSS par couleur */
const COULEURS_CLASSES: Record<'warning' | 'info' | 'success', string> = {
  warning: styles.warning,
  info: styles.info,
  success: styles.success,
};

/**
 * Badge affichant le statut d'une facture
 * Avec couleur sémantique et icone
 */
export function StatutBadge({
  statut,
  taille = 'md',
  afficherIcone = true,
  className = '',
}: StatutBadgeProps) {
  const config = STATUTS_FACTURE[statut];
  const IconeComponent = ICONES[config.icone];
  const couleurClass = COULEURS_CLASSES[config.couleur];

  const tailleClass = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  }[taille];

  const iconeTailles = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`${styles.badge} ${couleurClass} ${tailleClass} ${className}`}
      title={config.description}
      role="status"
      aria-label={`Statut : ${config.libelle}`}
    >
      {afficherIcone && IconeComponent && (
        <IconeComponent
          size={iconeTailles[taille]}
          className={styles.icone}
          aria-hidden="true"
        />
      )}
      <span className={styles.label}>
        {taille === 'sm' ? config.libelleCourt : config.libelle}
      </span>
    </span>
  );
}

export default StatutBadge;
