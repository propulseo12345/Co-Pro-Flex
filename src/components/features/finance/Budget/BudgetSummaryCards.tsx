'use client';

import { DollarSign, TrendingDown, TrendingUp } from 'lucide-react';
import styles from './Budget.module.css';

interface BudgetSummaryCardsProps {
  budgetAnnuelVote: number;
  totalConsomme: number;
  budgetRestant: number;
}

export function BudgetSummaryCards({
  budgetAnnuelVote,
  totalConsomme,
  budgetRestant,
}: BudgetSummaryCardsProps) {
  return (
    <div className={styles.summaryCards}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardIcon}>
          <DollarSign size={24} aria-hidden="true" />
        </div>
        <div className={styles.summaryCardContent}>
          <span className={styles.summaryCardLabel}>Budget annuel voté</span>
          <span className={styles.summaryCardValue}>
            {budgetAnnuelVote.toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardIcon}>
          <TrendingDown size={24} aria-hidden="true" />
        </div>
        <div className={styles.summaryCardContent}>
          <span className={styles.summaryCardLabel}>Consommation actuelle</span>
          <span className={styles.summaryCardValue}>
            {totalConsomme.toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardIcon}>
          <TrendingUp size={24} aria-hidden="true" />
        </div>
        <div className={styles.summaryCardContent}>
          <span className={styles.summaryCardLabel}>Disponible</span>
          <span className={styles.summaryCardValue}>
            {budgetRestant.toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>
    </div>
  );
}
