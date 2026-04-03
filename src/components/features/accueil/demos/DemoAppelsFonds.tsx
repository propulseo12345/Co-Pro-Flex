'use client';

import { DollarSign } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_APPELS_FONDS } from './demoData';

function getStatusBadge(status: string): string {
  switch (status) {
    case 'Soldé': return styles.badgeSuccess;
    case 'En cours': return styles.badgeWarning;
    case 'À venir': return styles.badgeInfo;
    default: return styles.badgeNeutral;
  }
}

function getBarColor(taux: number): string {
  if (taux >= 95) return '#22c55e';
  if (taux >= 60) return '#f59e0b';
  return '#3b82f6';
}

export function DemoAppelsFonds() {
  const { kpis, echeancier } = DEMO_APPELS_FONDS;

  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Appels de fonds</div>
          <div className={styles.topBarSubtitle}>Exercice 2025-2026 · Trimestriel</div>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnGhost}>Exporter</button>
          <button className={styles.btnPrimary}>
            <DollarSign size={12} />
            Nouvel appel
          </button>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        {kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiLabel}>{kpi.label}</div>
            <div className={styles.kpiValue} style={{ color: kpi.color, fontSize: 18 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className={styles.sectionTitle}>Échéancier</div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>Trimestre</th>
            <th className={styles.tableHeader} style={{ textAlign: 'right' }}>Montant</th>
            <th className={styles.tableHeader} style={{ textAlign: 'right' }}>Encaissé</th>
            <th className={styles.tableHeader} style={{ width: 100 }}>Avancement</th>
            <th className={styles.tableHeader}>Statut</th>
          </tr>
        </thead>
        <tbody>
          {echeancier.map((e) => (
            <tr key={e.trimestre} className={styles.tableRow}>
              <td className={styles.tableCell}>{e.trimestre}</td>
              <td className={`${styles.tableCell} ${styles.amount}`} style={{ textAlign: 'right' }}>
                {e.montant.toLocaleString('fr-FR')} €
              </td>
              <td className={`${styles.tableCell} ${styles.amount}`} style={{ textAlign: 'right', color: getBarColor(e.taux) }}>
                {e.encaisse.toLocaleString('fr-FR')} €
              </td>
              <td className={styles.tableCell}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className={styles.progressBar} style={{ flex: 1 }}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${e.taux}%`, background: getBarColor(e.taux) }}
                    />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: getBarColor(e.taux), minWidth: 28, textAlign: 'right' }}>
                    {e.taux}%
                  </span>
                </div>
              </td>
              <td className={styles.tableCell}>
                <span className={`${styles.badge} ${getStatusBadge(e.status)}`}>
                  {e.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
