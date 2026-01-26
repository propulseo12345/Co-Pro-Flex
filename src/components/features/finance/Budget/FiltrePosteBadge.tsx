'use client';

import { X } from 'lucide-react';
import styles from './FiltrePosteBadge.module.css';

interface FiltrePosteBadgeProps {
  poste: string;
  couleur: string;
  total: number;
  nombreDepenses: number;
  onRemove: () => void;
}

/**
 * Formate un montant en euros
 */
function formatMontant(montant: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(montant);
}

/**
 * Badge affichant le filtre actif par poste
 */
export function FiltrePosteBadge({
  poste,
  couleur,
  total,
  nombreDepenses,
  onRemove,
}: FiltrePosteBadgeProps) {
  return (
    <div className={styles.badge} style={{ '--badge-color': couleur } as React.CSSProperties}>
      <span className={styles.dot} />
      <span className={styles.label}>
        Filtré par : <strong>{poste}</strong>
      </span>
      <span className={styles.stats}>
        ({formatMontant(total)} &bull; {nombreDepenses} dépense
        {nombreDepenses > 1 ? 's' : ''})
      </span>
      <button
        type="button"
        className={styles.removeBtn}
        onClick={onRemove}
        aria-label={`Supprimer le filtre ${poste}`}
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
