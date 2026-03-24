'use client';

import styles from './demo-shared.module.css';
import { DEMO_FINANCE } from './demoData';

function getBarColor(pct: number): string {
  if (pct >= 90) return '#ef4444';
  if (pct >= 70) return '#f59e0b';
  return '#3b82f6';
}

export function DemoFinance() {
  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Budgets</div>
          <div className={styles.topBarSubtitle}>Exercice 2025-2026</div>
        </div>
        <div className={styles.topBarActions}>
          <div className={styles.segmented}>
            <button className={`${styles.segmentItem} ${styles.segmentItemActive}`}>Fonctionnement</button>
            <button className={styles.segmentItem}>Travaux</button>
            <button className={styles.segmentItem}>ALUR</button>
          </div>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        {DEMO_FINANCE.kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiLabel}>{kpi.label}</div>
            <div className={styles.kpiValue} style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>Postes budgétaires</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>Poste</th>
            <th className={styles.tableHeader} style={{ textAlign: 'right' }}>Budget</th>
            <th className={styles.tableHeader} style={{ textAlign: 'right' }}>Dépensé</th>
            <th className={styles.tableHeader} style={{ width: 120 }}>Avancement</th>
            <th className={styles.tableHeader} style={{ textAlign: 'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_FINANCE.postes.map((p) => (
            <tr key={p.name} className={styles.tableRow}>
              <td className={styles.tableCell}>{p.name}</td>
              <td className={`${styles.tableCell} ${styles.amount}`} style={{ textAlign: 'right' }}>
                {p.budget.toLocaleString('fr-FR')} €
              </td>
              <td className={`${styles.tableCell} ${styles.amount}`} style={{ textAlign: 'right' }}>
                {p.spent.toLocaleString('fr-FR')} €
              </td>
              <td className={styles.tableCell}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${p.pct}%`, background: getBarColor(p.pct) }}
                  />
                </div>
              </td>
              <td className={styles.tableCell} style={{ textAlign: 'right', color: getBarColor(p.pct), fontWeight: 600, fontSize: 11 }}>
                {p.pct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
