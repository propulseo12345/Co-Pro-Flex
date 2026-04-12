'use client';

import { Euro } from 'lucide-react';
import clsx from 'clsx';
import type { ITravauxPPT } from '@/types';
import { TravauxPrevisionnelStatut } from '@/types/enums';
import styles from './PPTKanban.module.css';

const COLONNES: { statut: TravauxPrevisionnelStatut; label: string; dotClass: string }[] = [
  { statut: TravauxPrevisionnelStatut.A_L_ETUDE, label: "À l'étude", dotClass: styles.dotEtude },
  { statut: TravauxPrevisionnelStatut.PREVU,     label: 'Prévu',      dotClass: styles.dotPrevu },
  { statut: TravauxPrevisionnelStatut.VOTE,      label: 'Voté en AG', dotClass: styles.dotVote },
  { statut: TravauxPrevisionnelStatut.EN_COURS,  label: 'En cours',   dotClass: styles.dotEnCours },
  { statut: TravauxPrevisionnelStatut.TERMINE,   label: 'Terminé',    dotClass: styles.dotTermine },
];

const PRIORITE_CLASS: Record<ITravauxPPT['priorite'], string> = {
  FAIBLE: styles.prioFaible, NORMALE: styles.prioNormale, HAUTE: styles.prioHaute, CRITIQUE: styles.prioCritique,
};

interface PPTKanbanProps {
  travauxByStatut: Record<string, ITravauxPPT[]>;
  onCardClick: (travail: ITravauxPPT) => void;
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}

export function PPTKanban({ travauxByStatut, onCardClick }: PPTKanbanProps) {
  return (
    <div className={styles.board}>
      {COLONNES.map(col => {
        const travaux = travauxByStatut[col.statut] ?? [];
        const total = travaux.reduce((s, t) => s + t.montantEstime, 0);

        return (
          <div key={col.statut} className={styles.column}>
            <div className={styles.colHeader}>
              <div className={styles.colTitle}>
                <span className={clsx(styles.colDot, col.dotClass)} />
                {col.label}
                <span className={styles.colCount}>{travaux.length}</span>
              </div>
              {total > 0 && <span className={styles.colTotal}>{formatEur(total)}</span>}
            </div>

            <div className={styles.cards}>
              {travaux.length === 0 && (
                <div className={styles.emptyCol}>Aucun travail</div>
              )}
              {travaux.map(t => (
                <button
                  key={t.id}
                  className={styles.card}
                  onClick={() => onCardClick(t)}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardTitle}>{t.titre}</span>
                    <span className={clsx(styles.cardPrio, PRIORITE_CLASS[t.priorite])}>
                      {t.priorite}
                    </span>
                  </div>
                  <div className={styles.cardType}>{t.type}</div>
                  <div className={styles.cardFooter}>
                    <span className={styles.cardDate}>
                      {new Date(t.datePrevisionnelle).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                    </span>
                    <span className={styles.cardMontant}>
                      <Euro size={11} />{formatEur(t.montantEstime)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
