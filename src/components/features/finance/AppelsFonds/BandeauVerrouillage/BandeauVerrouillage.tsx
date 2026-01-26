'use client';

import React from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import styles from './BandeauVerrouillage.module.css';

interface BandeauVerrouillageProps {
  /** Message principal à afficher */
  message: string;
  /** Date de génération de l'appel (optionnelle) */
  dateGeneration?: string | Date;
  /** Callback pour demander une annulation */
  onDemanderAnnulation?: () => void;
  /** Variante de style */
  variant?: 'warning' | 'info';
}

/**
 * Bandeau affiché quand un appel de fonds est verrouillé (généré)
 *
 * Informe l'utilisateur que l'appel ne peut plus être modifié
 * et propose des actions alternatives (annulation, etc.)
 */
export function BandeauVerrouillage({
  message,
  dateGeneration,
  onDemanderAnnulation,
  variant = 'warning',
}: BandeauVerrouillageProps) {
  const formattedDate = dateGeneration
    ? new Date(dateGeneration).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div
      className={`${styles.bandeau} ${variant === 'info' ? styles.bandeauInfo : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className={styles.contenu}>
        <Lock size={20} className={styles.icone} aria-hidden="true" />
        <div className={styles.textes}>
          <p className={styles.message}>{message}</p>
          {formattedDate && (
            <p className={styles.date}>Généré le {formattedDate}</p>
          )}
        </div>
      </div>

      {onDemanderAnnulation && (
        <button
          type="button"
          onClick={onDemanderAnnulation}
          className={styles.boutonAnnulation}
        >
          <AlertTriangle size={16} aria-hidden="true" />
          Demander une annulation
        </button>
      )}
    </div>
  );
}

export default BandeauVerrouillage;
