'use client';

import { CheckCircle, AlertTriangle } from 'lucide-react';
import styles from './BudgetProjectionCard.module.css';

interface BudgetProjectionCardProps {
  budgetAnnuelVote: number;
  totalConsomme: number;
  projectedYearEnd: number;
  projectedDifference: number;
  monthsElapsed: number;
  monthsRemaining: number;
  avgMonthlyConsumption?: number;
  fiabiliteNiveau?: 'faible' | 'moyenne' | 'bonne';
}

export function BudgetProjectionCard({
  budgetAnnuelVote,
  totalConsomme,
  projectedYearEnd,
  projectedDifference,
  monthsElapsed,
  monthsRemaining,
  avgMonthlyConsumption,
  fiabiliteNiveau = 'moyenne',
}: BudgetProjectionCardProps) {
  const isWithinBudget = projectedDifference >= 0;
  const consumedPct = budgetAnnuelVote > 0 ? (totalConsomme / budgetAnnuelVote) * 100 : 0;
  const avgMonthly = avgMonthlyConsumption ?? (monthsElapsed > 0 ? totalConsomme / monthsElapsed : 0);

  const fiabiliteLabels: Record<string, string> = {
    faible: 'Faible',
    moyenne: 'Moyenne',
    bonne: `Haute (${monthsElapsed} mois)`,
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>Projection fin d&apos;exercice</span>
        <span className={`${styles.badge} ${isWithinBudget ? styles.badgeSafe : styles.badgeRisk}`}>
          {isWithinBudget ? <><CheckCircle size={12} /> Dans le budget</> : <><AlertTriangle size={12} /> Dépassement prévu</>}
        </span>
      </div>

      <div className={styles.timeline}>
        <div className={styles.timelineBar}>
          <div className={styles.timelineConsumed} style={{ width: `${consumedPct}%` }} />
          <div className={styles.timelineProjected} style={{ width: `${100 - consumedPct}%` }} />
        </div>
        <div className={styles.timelineLabels}>
          <span>Jan — {monthsElapsed > 0 ? `Mois ${monthsElapsed}` : 'Actuel'}</span>
          <span>{monthsRemaining > 0 ? `${monthsRemaining} mois restants` : 'Fin exercice'}</span>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Projection totale</div>
          <div className={styles.statValue} style={{ color: '#3b82f6' }}>
            {projectedYearEnd.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Écart vs budget</div>
          <div className={styles.statValue} style={{ color: isWithinBudget ? '#22c55e' : '#ef4444' }}>
            {projectedDifference >= 0 ? '-' : '+'}{Math.abs(projectedDifference).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Conso. mensuelle moy.</div>
          <div className={styles.statValue}>
            {avgMonthly.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € /mois
          </div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statLabel}>Fiabilité</div>
          <div className={styles.statValue} style={{ color: fiabiliteNiveau === 'bonne' ? '#22c55e' : fiabiliteNiveau === 'faible' ? '#f59e0b' : '#e2e8f0' }}>
            {fiabiliteLabels[fiabiliteNiveau]}
          </div>
        </div>
      </div>
    </div>
  );
}
