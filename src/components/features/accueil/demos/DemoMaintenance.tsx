'use client';

import { Wrench } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_MAINTENANCE } from './demoData';

const STATUS_BADGE: Record<string, string> = {
  'En cours': styles.badgeWarning,
  'Terminé': styles.badgeSuccess,
  'Planifié': styles.badgeInfo,
};

export function DemoMaintenance() {
  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Carnet d&apos;entretien</div>
          <div className={styles.topBarSubtitle}>Résidence Les Terrasses de Belleville</div>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnGhost}>Exporter</button>
          <button className={styles.btnPrimary}>
            <Wrench size={12} />
            Nouvelle intervention
          </button>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        {DEMO_MAINTENANCE.kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiLabel}>{kpi.label}</div>
            <div className={styles.kpiValue} style={{ color: kpi.color, fontSize: 18 }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>Interventions</div>
        <div className={styles.segmented}>
          <button className={`${styles.segmentItem} ${styles.segmentItemActive}`}>Liste</button>
          <button className={styles.segmentItem}>Kanban</button>
          <button className={styles.segmentItem}>Calendrier</button>
        </div>
      </div>

      <div className={styles.cardList}>
        {DEMO_MAINTENANCE.interventions.map((item) => (
          <div key={item.title} className={styles.card}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.priority === 'high' && (
                  <span className={styles.priorityDot} style={{ background: 'var(--demo-danger)', width: 6, height: 6 }} />
                )}
                <span className={styles.cardTitle}>{item.title}</span>
              </div>
              <div className={styles.cardMeta}>{item.provider} · {item.date}</div>
            </div>
            <span className={`${styles.badge} ${STATUS_BADGE[item.status]}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
