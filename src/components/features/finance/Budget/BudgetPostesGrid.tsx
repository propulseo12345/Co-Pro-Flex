'use client';

import { AlertTriangle, CheckCircle } from 'lucide-react';
import { PosteBudget, PosteBudgetData, POSTE_COLORS, getProgressColor, getProgressPercentage } from './types';
import styles from './Budget.module.css';

interface BudgetPostesGridProps {
  postesBudget: PosteBudgetData[];
  onSelectPoste: (poste: PosteBudget) => void;
}

// États du budget : normal (< 80%), alerte (80-99%), consommé (100%), dépassé (> 100%)
type BudgetStatus = 'normal' | 'alerte' | 'consomme' | 'depasse';

function getBudgetStatus(percentage: number): BudgetStatus {
  if (percentage > 100) return 'depasse';
  if (percentage === 100) return 'consomme';
  if (percentage >= 80) return 'alerte';
  return 'normal';
}

export function BudgetPostesGrid({ postesBudget, onSelectPoste }: BudgetPostesGridProps) {
  return (
    <div className="card">
      <h2 className={styles.sectionTitle}>Détail par poste</h2>
      <div className={styles.postesGrid}>
        {postesBudget.map((poste) => {
          const percentage = getProgressPercentage(poste.consomme, poste.budgetVote);
          const color = getProgressColor(poste.consomme, poste.budgetVote);
          const status = getBudgetStatus(percentage);
          const showBadge = status !== 'normal';
          const restant = poste.budgetVote - poste.consomme;

          // Configuration des badges par état
          const badgeConfig = {
            alerte: { label: 'Alerte', className: styles.posteBadgeWarning, Icon: AlertTriangle },
            consomme: { label: 'Consommé', className: styles.posteBadgeConsomme, Icon: CheckCircle },
            depasse: { label: 'Dépassé', className: styles.posteBadgeDanger, Icon: AlertTriangle },
          };

          // Message de reste/dépassement selon l'état
          const getRestantMessage = () => {
            if (status === 'depasse') return `Dépassé de ${Math.abs(restant).toLocaleString()} €`;
            if (status === 'consomme') return 'Budget entièrement consommé';
            return `Reste : ${restant.toLocaleString()} €`;
          };

          return (
            <div
              key={poste.poste}
              className={`${styles.posteCard} ${showBadge ? styles.posteCardAlert : ''}`}
              onClick={() => onSelectPoste(poste.poste)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.posteHeader}>
                <div className={styles.posteTitleRow}>
                  <span
                    className={styles.posteColorDot}
                    style={{ backgroundColor: POSTE_COLORS[poste.poste] }}
                  />
                  <span className={styles.posteLabel}>{poste.label}</span>
                  {showBadge && (
                    <span className={`${styles.posteBadge} ${badgeConfig[status as Exclude<BudgetStatus, 'normal'>].className}`}>
                      {(() => {
                        const Icon = badgeConfig[status as Exclude<BudgetStatus, 'normal'>].Icon;
                        return <Icon size={12} aria-hidden="true" />;
                      })()}
                      {badgeConfig[status as Exclude<BudgetStatus, 'normal'>].label}
                    </span>
                  )}
                </div>
                <span className={styles.posteAmount}>
                  {poste.consomme.toLocaleString()} / {poste.budgetVote.toLocaleString()} €
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div className={styles.posteFooter}>
                <span className={styles.postePercentage} style={{ color }}>
                  {percentage.toFixed(1)}%
                </span>
                <span
                  className={styles.posteRestant}
                  style={{ color: status === 'depasse' ? 'var(--danger)' : status === 'consomme' ? 'var(--success)' : undefined }}
                >
                  {getRestantMessage()}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
