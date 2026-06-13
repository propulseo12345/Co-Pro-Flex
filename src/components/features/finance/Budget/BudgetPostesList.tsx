'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PosteBudgetData, DepenseBudget } from './types';
import { POSTE_COLORS } from './types';
import styles from './BudgetPostesList.module.css';

interface BudgetPostesListProps {
  postesBudget: PosteBudgetData[];
  depenses?: DepenseBudget[];
  onSelectDepense?: (depense: DepenseBudget) => void;
}

export function BudgetPostesList({ postesBudget, depenses = [], onSelectDepense }: BudgetPostesListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span>Poste</span>
        <span className={styles.headerRight}>Budget voté</span>
        <span>Consommation</span>
        <span className={styles.headerRight}>%</span>
        <span className={styles.headerRight}>Reste</span>
      </div>
      {postesBudget.map((poste, index) => {
        const pct = poste.budgetVote > 0 ? (poste.consomme / poste.budgetVote) * 100 : 0;
        const rest = poste.budgetVote - poste.consomme;
        const color = POSTE_COLORS[poste.poste] || '#6B7280';
        const isConsumed = pct >= 100 && rest >= 0;
        const isOver = pct > 100 && rest < 0;
        const isAlert = pct >= 80 && pct < 100;
        const isExpanded = expandedIndex === index;
        const posteDepenses = depenses.filter((d) => d.poste === poste.poste);

        return (
          // poste.poste (code de poste) n'est pas garanti unique dans la liste : on conserve l'index pour la clé
          // eslint-disable-next-line react/no-array-index-key
          <div key={`${poste.poste}-${index}`}>
            <div
              className={`${styles.row} ${isExpanded ? styles.rowExpanded : ''}`}
              onClick={() => handleToggle(index)}
            >
              <span className={styles.rowName}>
                <ChevronDown
                  size={14}
                  className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                />
                <span className={styles.dot} style={{ background: color }} />
                {poste.label}
                {isAlert && <span className={styles.badgeWarning}>⚠ Alerte</span>}
                {isConsumed && <span className={styles.badgeConsumed}>✓ Consommé</span>}
                {isOver && <span className={styles.badgeDanger}>⚠ Dépassé</span>}
              </span>
              <span className={styles.rowAmount}>{poste.budgetVote.toLocaleString('fr-FR')} €</span>
              <span className={styles.rowProgress}>
                <span className={styles.miniBar}>
                  <span className={styles.miniFill} style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </span>
              </span>
              <span className={styles.rowPct} style={{ color }}>{pct.toFixed(1)}%</span>
              <span className={styles.rowRest} style={{ color: isOver ? 'var(--danger)' : isConsumed ? 'var(--success)' : 'var(--text-tertiary)' }}>
                {isOver ? `-${Math.abs(rest).toLocaleString('fr-FR')}` : rest.toLocaleString('fr-FR')} €
              </span>
            </div>

            {isExpanded && (
              <div className={styles.expandedPanel}>
                <div className={styles.panelStats}>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Budget voté</span>
                    <span className={styles.panelStatValue}>{poste.budgetVote.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Consommé</span>
                    <span className={styles.panelStatValue} style={{ color: 'var(--warning)' }}>{poste.consomme.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Restant</span>
                    <span className={styles.panelStatValue} style={{ color: isOver ? 'var(--danger)' : 'var(--success)' }}>
                      {rest.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                <div className={styles.panelProgress}>
                  <div className={styles.panelProgressFill} style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>

                {posteDepenses.length > 0 ? (
                  <div className={styles.transactions}>
                    <div className={styles.transactionsTitle}>Transactions ({posteDepenses.length})</div>
                    {posteDepenses.map((dep) => (
                      <div
                        key={dep.id}
                        className={styles.transactionRow}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDepense?.(dep);
                        }}
                      >
                        <div className={styles.transactionInfo}>
                          <span className={styles.transactionLabel}>{dep.libelle}</span>
                          <span className={styles.transactionMeta}>
                            {new Date(dep.date).toLocaleDateString('fr-FR')}
                            {dep.fournisseur && <> · {dep.fournisseur}</>}
                            {dep.compteCharge && <> · Compte: {dep.compteCharge}</>}
                          </span>
                        </div>
                        <span className={styles.transactionAmount}>
                          -{dep.montant.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noTransactions}>Aucune transaction pour ce poste</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
