'use client';

import { useMemo } from 'react';
import type { PosteBudgetData } from './types';
import { POSTE_COLORS } from './types';
import styles from './BudgetOverviewHero.module.css';

interface BudgetOverviewHeroProps {
  budgetAnnuelVote: number;
  totalConsomme: number;
  budgetRestant: number;
  postesEnAlerte: number;
  postesEnAlerteLabels?: string;
  postesBudget: PosteBudgetData[];
}

export function BudgetOverviewHero({
  budgetAnnuelVote,
  totalConsomme,
  budgetRestant,
  postesEnAlerte,
  postesEnAlerteLabels,
  postesBudget,
}: BudgetOverviewHeroProps) {
  const consumedPct = budgetAnnuelVote > 0 ? (totalConsomme / budgetAnnuelVote) * 100 : 0;

  // Build conic-gradient for donut
  const donutGradient = useMemo(() => {
    const total = postesBudget.reduce((s, p) => s + p.consomme, 0);
    if (total === 0) return 'conic-gradient(rgba(148,163,184,0.1) 0deg 360deg)';

    const segments: string[] = [];
    let currentDeg = 0;
    for (const p of postesBudget) {
      if (p.consomme <= 0) continue;
      const deg = (p.consomme / total) * 360;
      const color = POSTE_COLORS[p.poste] || '#6B7280';
      segments.push(`${color} ${currentDeg}deg ${currentDeg + deg}deg`);
      currentDeg += deg;
    }
    return `conic-gradient(${segments.join(', ')})`;
  }, [postesBudget]);

  // Legend items (only postes with consumption)
  const legendItems = useMemo(() => {
    return postesBudget
      .filter(p => p.consomme > 0)
      .sort((a, b) => b.consomme - a.consomme);
  }, [postesBudget]);

  return (
    <div className={styles.hero}>
      <div className={styles.left}>
        <div className={styles.headline}>Budget annuel voté</div>
        <div className={styles.amount}>{budgetAnnuelVote.toLocaleString('fr-FR')} €</div>
        <div className={styles.sub}>
          {postesBudget.length} postes budgétaires
        </div>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Consommé</div>
            <div className={styles.statValue} style={{ color: 'var(--warning)' }}>
              {totalConsomme.toLocaleString('fr-FR')} €
            </div>
            <div className={styles.statBar}>
              <div className={styles.statBarFill} style={{ width: `${consumedPct}%`, background: 'var(--warning)' }} />
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Disponible</div>
            <div className={styles.statValue} style={{ color: 'var(--success)' }}>
              {budgetRestant.toLocaleString('fr-FR')} €
            </div>
            <div className={styles.statBar}>
              <div className={styles.statBarFill} style={{ width: `${100 - consumedPct}%`, background: 'var(--success)' }} />
            </div>
          </div>
          <div className={styles.stat}>
            <div className={styles.statLabel}>Postes en alerte</div>
            <div className={styles.statValue} style={{ color: postesEnAlerte > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {postesEnAlerte}
            </div>
            {postesEnAlerteLabels && (
              <div className={styles.statSub}>{postesEnAlerteLabels}</div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.right}>
        <div className={styles.donutContainer}>
          <div className={styles.donut} style={{ background: donutGradient }}>
            <div className={styles.donutCenter}>
              <div className={styles.donutValue}>{consumedPct.toFixed(1)}%</div>
              <div className={styles.donutLabel}>consommé</div>
            </div>
          </div>
        </div>
        <div className={styles.legend}>
          {legendItems.map((p) => (
            <div key={p.poste} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: POSTE_COLORS[p.poste] || '#6B7280' }} />
              <span className={styles.legendName}>{p.label}</span>
              <span className={styles.legendValue}>{p.consomme.toLocaleString('fr-FR')} €</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
