'use client';

import { FileText, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { BudgetTravaux } from './types';
import styles from './Budget.module.css';

interface TravauxOverviewProps {
  budgetsTravaux: BudgetTravaux[];
}

export function TravauxOverview({ budgetsTravaux }: TravauxOverviewProps) {
  const totalVote = budgetsTravaux.reduce((sum, t) => sum + t.budgetVote, 0);
  const totalConsomme = budgetsTravaux.reduce((sum, t) => sum + t.consomme, 0);
  const totalDisponible = budgetsTravaux.reduce((sum, t) => sum + (t.budgetVote - t.consomme), 0);
  const projetsEnCours = budgetsTravaux.filter((t) => t.statut === 'EN_COURS').length;

  return (
    <div className={styles.travauxOverview}>
      <div className={styles.travauxOverviewCard}>
        <div className={styles.travauxOverviewIcon} style={{ background: 'var(--primary-light)' }}>
          <FileText size={24} color="var(--primary)" aria-hidden="true" />
        </div>
        <div className={styles.travauxOverviewContent}>
          <span className={styles.travauxOverviewLabel}>Total budgets votés</span>
          <span className={styles.travauxOverviewValue}>{totalVote.toLocaleString()} €</span>
        </div>
      </div>
      <div className={styles.travauxOverviewCard}>
        <div className={styles.travauxOverviewIcon} style={{ background: 'var(--warning-light)' }}>
          <TrendingDown size={24} color="var(--warning)" aria-hidden="true" />
        </div>
        <div className={styles.travauxOverviewContent}>
          <span className={styles.travauxOverviewLabel}>Total consommé</span>
          <span className={styles.travauxOverviewValue}>{totalConsomme.toLocaleString()} €</span>
        </div>
      </div>
      <div className={styles.travauxOverviewCard}>
        <div className={styles.travauxOverviewIcon} style={{ background: 'var(--success-light)' }}>
          <TrendingUp size={24} color="var(--success)" aria-hidden="true" />
        </div>
        <div className={styles.travauxOverviewContent}>
          <span className={styles.travauxOverviewLabel}>Total disponible</span>
          <span className={styles.travauxOverviewValue}>{totalDisponible.toLocaleString()} €</span>
        </div>
      </div>
      <div className={styles.travauxOverviewCard}>
        <div className={styles.travauxOverviewIcon} style={{ background: 'var(--info-light)' }}>
          <Calendar size={24} color="var(--info)" aria-hidden="true" />
        </div>
        <div className={styles.travauxOverviewContent}>
          <span className={styles.travauxOverviewLabel}>Projets en cours</span>
          <span className={styles.travauxOverviewValue}>
            {projetsEnCours} / {budgetsTravaux.length}
          </span>
        </div>
      </div>
    </div>
  );
}
