'use client';

import { FileText, TrendingDown, TrendingUp, Calendar } from 'lucide-react';
import { BudgetTravaux } from './types';
import styles from './TravauxOverview.module.css';

interface TravauxOverviewProps {
  budgetsTravaux: BudgetTravaux[];
}

export function TravauxOverview({ budgetsTravaux }: TravauxOverviewProps) {
  const totalVote = budgetsTravaux.reduce((sum, t) => sum + t.budgetVote, 0);
  const totalConsomme = budgetsTravaux.reduce((sum, t) => sum + t.consomme, 0);
  const totalDisponible = totalVote - totalConsomme;
  const projetsEnCours = budgetsTravaux.filter((t) => t.statut === 'EN_COURS').length;

  return (
    <div className={styles.strip}>
      <div className={styles.card}>
        <div className={styles.label}>Total budgets votés</div>
        <div className={`${styles.value} ${styles.blue}`}>{totalVote.toLocaleString('fr-FR')} €</div>
        <div className={styles.sub}>{budgetsTravaux.length} projets</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total consommé</div>
        <div className={`${styles.value} ${styles.orange}`}>{totalConsomme.toLocaleString('fr-FR')} €</div>
        <div className={styles.progress}><div className={styles.progressFill} style={{ width: `${totalVote > 0 ? (totalConsomme / totalVote) * 100 : 0}%`, background: '#f59e0b' }} /></div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total disponible</div>
        <div className={`${styles.value} ${styles.green}`}>{totalDisponible.toLocaleString('fr-FR')} €</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Projets en cours</div>
        <div className={`${styles.value} ${styles.blue}`}>{projetsEnCours} / {budgetsTravaux.length}</div>
      </div>
    </div>
  );
}
