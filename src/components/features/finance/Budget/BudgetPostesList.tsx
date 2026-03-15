'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, User, CreditCard, Receipt } from 'lucide-react';
import type { PosteBudgetData, PosteBudget, DepenseBudget } from './types';
import { POSTE_COLORS } from './types';
import styles from './BudgetPostesList.module.css';

interface BudgetPostesListProps {
  postesBudget: PosteBudgetData[];
  depenses?: DepenseBudget[];
  onSelectPoste?: (poste: PosteBudget) => void;
}

export function BudgetPostesList({ postesBudget, depenses = [] }: BudgetPostesListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [expandedDepenseId, setExpandedDepenseId] = useState<string | null>(null);

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
    setExpandedDepenseId(null);
  };

  const handleDepenseToggle = (depId: string) => {
    setExpandedDepenseId((prev) => (prev === depId ? null : depId));
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
              <span className={styles.rowRest} style={{ color: isOver ? '#f87171' : isConsumed ? '#22c55e' : '#64748b' }}>
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
                    <span className={styles.panelStatValue} style={{ color: '#f59e0b' }}>{poste.consomme.toLocaleString('fr-FR')} €</span>
                  </div>
                  <div className={styles.panelStat}>
                    <span className={styles.panelStatLabel}>Restant</span>
                    <span className={styles.panelStatValue} style={{ color: isOver ? '#f87171' : '#22c55e' }}>
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
                    {posteDepenses.map((dep) => {
                      const isDepExpanded = expandedDepenseId === dep.id;
                      return (
                        <div key={dep.id} className={styles.transactionItem}>
                          <div
                            className={styles.transactionRow}
                            onClick={(e) => { e.stopPropagation(); handleDepenseToggle(dep.id); }}
                          >
                            <div className={styles.transactionLeft}>
                              <ChevronRight
                                size={12}
                                className={`${styles.depChevron} ${isDepExpanded ? styles.depChevronOpen : ''}`}
                              />
                              <div className={styles.transactionInfo}>
                                <span className={styles.transactionLabel}>{dep.libelle}</span>
                                <span className={styles.transactionMeta}>
                                  {new Date(dep.date).toLocaleDateString('fr-FR')}
                                  {dep.fournisseur && <> · {dep.fournisseur}</>}
                                </span>
                              </div>
                            </div>
                            <span className={styles.transactionAmount}>
                              -{dep.montant.toLocaleString('fr-FR')} €
                            </span>
                          </div>

                          {isDepExpanded && (
                            <div className={styles.depDetail}>
                              <div className={styles.depDetailGrid}>
                                {dep.fournisseur && (
                                  <div className={styles.depDetailItem}>
                                    <User size={13} />
                                    <span className={styles.depDetailLabel}>Fournisseur</span>
                                    <span className={styles.depDetailValue}>{dep.fournisseur}</span>
                                  </div>
                                )}
                                {dep.compteCharge && (
                                  <div className={styles.depDetailItem}>
                                    <CreditCard size={13} />
                                    <span className={styles.depDetailLabel}>Compte</span>
                                    <span className={styles.depDetailValue}>{dep.compteCharge}</span>
                                  </div>
                                )}
                                {dep.montantHT !== undefined && (
                                  <div className={styles.depDetailItem}>
                                    <Receipt size={13} />
                                    <span className={styles.depDetailLabel}>Montant HT</span>
                                    <span className={styles.depDetailValue}>{dep.montantHT.toLocaleString('fr-FR')} €</span>
                                  </div>
                                )}
                                {dep.tauxTVA !== undefined && (
                                  <div className={styles.depDetailItem}>
                                    <Receipt size={13} />
                                    <span className={styles.depDetailLabel}>TVA ({dep.tauxTVA}%)</span>
                                    <span className={styles.depDetailValue}>{(dep.montantTVA ?? 0).toLocaleString('fr-FR')} €</span>
                                  </div>
                                )}
                                {dep.statut && (
                                  <div className={styles.depDetailItem}>
                                    <FileText size={13} />
                                    <span className={styles.depDetailLabel}>Statut</span>
                                    <span className={styles.depDetailValue}>{dep.statut}</span>
                                  </div>
                                )}
                                {dep.pieceJointe && (
                                  <div className={styles.depDetailItem}>
                                    <FileText size={13} />
                                    <span className={styles.depDetailLabel}>Pièce jointe</span>
                                    <span className={styles.depDetailValue}>{dep.pieceJointe}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
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
