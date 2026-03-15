'use client';

import { BudgetTravaux, getBudgetAppele } from './types';
import styles from './TravauxOverview.module.css';

interface TravauxOverviewProps {
  budgetsTravaux: BudgetTravaux[];
}

export function TravauxOverview({ budgetsTravaux }: TravauxOverviewProps) {
  const totalVote = budgetsTravaux.reduce((sum, t) => sum + t.budgetVote, 0);
  const totalAppele = budgetsTravaux.reduce((sum, t) => sum + getBudgetAppele(t.appelsDeFonds), 0);
  const totalCollecte = budgetsTravaux.reduce((sum, t) =>
    sum + t.appelsDeFonds.reduce((s, a) => s + (a.totalPaid ?? 0), 0), 0);
  const projetsEnCours = budgetsTravaux.filter((t) => t.statut === 'EN_COURS').length;

  const appelePct = totalVote > 0 ? (totalAppele / totalVote) * 100 : 0;
  const collectePct = totalAppele > 0 ? (totalCollecte / totalAppele) * 100 : 0;

  return (
    <div className={styles.strip}>
      <div className={styles.card}>
        <div className={styles.label}>Budget total voté</div>
        <div className={`${styles.value} ${styles.blue}`}>{totalVote.toLocaleString('fr-FR')} €</div>
        <div className={styles.sub}>{budgetsTravaux.length} projet{budgetsTravaux.length > 1 ? 's' : ''}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total appelé</div>
        <div className={`${styles.value} ${styles.orange}`}>{totalAppele.toLocaleString('fr-FR')} €</div>
        <div className={styles.progress}><div className={styles.progressFill} style={{ width: `${appelePct}%`, background: '#f59e0b' }} /></div>
        <div className={styles.sub}>{appelePct.toFixed(0)}% du budget</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total collecté</div>
        <div className={`${styles.value} ${styles.green}`}>{totalCollecte.toLocaleString('fr-FR')} €</div>
        <div className={styles.progress}><div className={styles.progressFill} style={{ width: `${collectePct}%`, background: '#22c55e' }} /></div>
        <div className={styles.sub}>{collectePct.toFixed(0)}% des appels</div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Projets en cours</div>
        <div className={`${styles.value} ${styles.blue}`}>{projetsEnCours} / {budgetsTravaux.length}</div>
      </div>
    </div>
  );
}
