'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PosteBudgetData, PosteBudget, DepenseBudget } from './types';
import { POSTE_COLORS } from './types';
import styles from './BudgetPostesList.module.css';

interface BudgetPostesListProps {
  postesBudget: PosteBudgetData[];
  depenses?: DepenseBudget[];
  onSelectPoste?: (poste: PosteBudget) => void;
}

export function BudgetPostesList({ postesBudget, depenses = [], onSelectPoste }: BudgetPostesListProps) {
  const [expandedPoste, setExpandedPoste] = useState<PosteBudget | null>(null);

  const handleToggle = (posteId: PosteBudget) => {
    setExpandedPoste((prev) => (prev === posteId ? null : posteId));
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
      {postesBudget.map((poste) => {
        const pct = poste.budgetVote > 0 ? (poste.consomme / poste.budgetVote) * 100 : 0;
        const rest = poste.budgetVote - poste.consomme;
        const color = POSTE_COLORS[poste.poste] || '#6B7280';
        const isConsumed = pct >= 100 && rest >= 0;
        const isOver = pct > 100 && rest < 0;
        const isAlert = pct >= 80 && pct < 100;
        const isExpanded = expandedPoste === poste.poste;
        const posteDepenses = depenses.filter((d) => d.poste === poste.poste);

        return (
          <div key={poste.poste}>
            <div
              className={`${styles.row} ${isExpanded ? styles.rowExpanded : ''}`}
              onClick={() => handleToggle(poste.poste)}
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
              <span className={styles.rowRest} style={{ color: isOver ? '#f87171' : isConsumed ? '#22c55e' : '#64748b' }}>
                {isOver ? `-${Math.abs(rest).toLocaleString('fr-FR')}` : rest.toLocaleString('fr-FR')} €
              </span>
            </div>

            {isExpanded && (
              <div className={styles.expandedPanel}>
                {/* Summary stats */}
                <div className={styles.panelStats}>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Budget voté</span>
                    <span className={styles.panelStatValue}>{poste.budgetVote.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Consommé</span>
                    <span className={styles.panelStatValue} style={{ color: '#f59e0b' }}>{poste.consomme.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Restant</span>
                    <span className={styles.panelStatValue} style={{ color: isOver ? '#f87171' : '#22c55e' }}>
                      {rest.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>

                {/* Progress bar full width */}
                <div className={styles.panelProgress}>
                  <div className={styles.panelProgressFill} style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                </div>

                {/* Transactions list */}
                {posteDepenses.length > 0 ? (
                  <div className={styles.transactions}>
                    <div className={styles.transactionsTitle}>Transactions ({posteDepenses.length})</div>
                    {posteDepenses.map((dep) => (
                      <div key={dep.id} className={styles.transactionRow}>
                        <div className={styles.transactionInfo}>
                          <span className={styles.transactionLabel}>{dep.libelle}</span>
                          <span className={styles.transactionMeta}>
                            {new Date(dep.date).toLocaleDateString('fr-FR')}
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
