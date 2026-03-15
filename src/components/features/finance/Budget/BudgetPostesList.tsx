'use client';

import type { PosteBudgetData, PosteBudget } from './types';
import { POSTE_COLORS } from './types';
import styles from './BudgetPostesList.module.css';

interface BudgetPostesListProps {
  postesBudget: PosteBudgetData[];
  onSelectPoste: (poste: PosteBudget) => void;
}

export function BudgetPostesList({ postesBudget, onSelectPoste }: BudgetPostesListProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>Poste</span>
        <span className={styles.headerRight}>Budget voté</span>
        <span>Consommation</span>
        <span className={styles.headerRight}>%</span>
        <span className={styles.headerRight}>Reste</span>
      </div>
      {postesBudget.map((poste) => {
        const pct = poste.budgetVote > 0 ? (poste.consomme / poste.budgetVote) * 100 : 0;
        const rest = poste.budgetVote - poste.consomme;
        const color = POSTE_COLORS[poste.poste] || '#6B7280';
        const isAlert = pct >= 80 && pct < 100;
        const isOver = pct >= 100;

        return (
          <div
            key={poste.poste}
            className={styles.row}
            onClick={() => onSelectPoste(poste.poste)}
          >
            <span className={styles.rowName}>
              <span className={styles.dot} style={{ background: color }} />
              {poste.label}
              {isAlert && <span className={styles.badgeWarning}>⚠ Alerte</span>}
              {isOver && <span className={styles.badgeDanger}>⚠ Dépassé</span>}
            </span>
            <span className={styles.rowAmount}>{poste.budgetVote.toLocaleString('fr-FR')} €</span>
            <span className={styles.rowProgress}>
              <span className={styles.miniBar}>
                <span className={styles.miniFill} style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
              </span>
            </span>
            <span className={styles.rowPct} style={{ color }}>{pct.toFixed(1)}%</span>
            <span className={styles.rowRest} style={{ color: isOver ? '#f87171' : '#64748b' }}>
              {isOver ? `-${Math.abs(rest).toLocaleString('fr-FR')}` : rest.toLocaleString('fr-FR')} €
            </span>
          </div>
        );
      })}
    </div>
  );
}
