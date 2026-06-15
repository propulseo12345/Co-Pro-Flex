'use client';

import styles from './etat-date.module.css';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export interface PartieLine {
  /** Texte affiché à gauche (ex. « 450-1 · Provisions exigibles »). */
  label: string;
  amount: number;
}

interface EtatDatePartieProps {
  title: string;
  total: number;
  lines: PartieLine[];
  /** Note légale facultative affichée sous les lignes (ex. mention ALUR / hors 450-5). */
  note?: string | null;
  /** Texte affiché quand il n'y a aucune ligne. */
  emptyLabel?: string;
}

export function EtatDatePartie({ title, total, lines, note, emptyLabel = 'Aucune somme' }: EtatDatePartieProps) {
  const totalClass = total > 0 ? styles.partieTotalDanger : total < 0 ? styles.partieTotalSuccess : styles.partieTotal;

  return (
    <div className={styles.partieSection}>
      <div className={styles.partieHeader}>
        <span className={styles.partieTitle}>{title}</span>
        <span className={totalClass}>{fmt(total)}</span>
      </div>

      {lines.length === 0 ? (
        <p className={styles.emptyNote}>{emptyLabel}</p>
      ) : (
        lines.map((line, idx) => (
          // Lignes dérivées du payload à ordre figé (codes non garantis uniques) : index acceptable
          // eslint-disable-next-line react/no-array-index-key
          <div className={styles.partieRow} key={idx}>
            <span className={styles.partieRowLabel}>{line.label}</span>
            <span className={line.amount === 0 ? styles.partieRowAmountZero : styles.partieRowAmount}>
              {fmt(line.amount)}
            </span>
          </div>
        ))
      )}

      {note && note.trim() !== '' && <p className={styles.partieNote}>{note}</p>}
    </div>
  );
}
