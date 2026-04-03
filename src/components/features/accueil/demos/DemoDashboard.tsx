'use client';

import styles from './demo-shared.module.css';
import { DEMO_DASHBOARD } from './demoData';

const BADGE_STYLES: Record<string, string> = {
  urgent: styles.badgeUrgent,
  warning: styles.badgeWarning,
  info: styles.badgeInfo,
};

const BADGE_LABELS: Record<string, string> = {
  urgent: 'Urgent',
  warning: 'Attention',
  info: 'À faire',
};

const ACTIVITY_DOTS: Record<string, string> = {
  success: 'var(--demo-success)',
  info: 'var(--demo-primary)',
  warning: 'var(--demo-warning)',
};

export function DemoDashboard() {
  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Dashboard</div>
          <div className={styles.topBarSubtitle}>Résidence Les Terrasses de Belleville — 120 lots</div>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        {DEMO_DASHBOARD.kpis.map((kpi) => (
          <div key={kpi.label} className={styles.kpiCard}>
            <div className={styles.kpiLabel}>{kpi.label}</div>
            <div className={styles.kpiValue} style={{ color: kpi.color }}>{kpi.value}</div>
            <div className={styles.kpiTrend}>{kpi.trend}</div>
          </div>
        ))}
      </div>

      <div className={styles.twoColumns}>
        <div>
          <div className={styles.sectionTitle}>Priorités</div>
          <div className={styles.cardList}>
            {DEMO_DASHBOARD.priorities.map((p) => (
              <div key={p.label} className={styles.card}>
                <div className={styles.cardTitle}>{p.label}</div>
                <span className={`${styles.badge} ${BADGE_STYLES[p.type]}`}>
                  {BADGE_LABELS[p.type]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sectionTitle}>Activité récente</div>
          <div className={styles.cardList}>
            {DEMO_DASHBOARD.activity.map((a) => (
              <div key={a.text} className={styles.card}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={styles.priorityDot} style={{ background: ACTIVITY_DOTS[a.type] }} />
                    <span className={styles.cardTitle}>{a.text}</span>
                  </div>
                  <div className={styles.cardMeta}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
