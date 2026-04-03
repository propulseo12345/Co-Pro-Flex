'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_AG_VOTES } from './demoData';

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  'Adoptée': { bg: 'var(--demo-badge-success-bg)', color: 'var(--demo-success-bright)' },
  'Rejetée': { bg: 'var(--demo-badge-danger-bg)', color: 'var(--demo-danger-bright)' },
  'En cours': { bg: 'var(--demo-badge-info-bg)', color: 'var(--demo-secondary)' },
};

export function DemoAgVotes() {
  const { resolutions, summary } = DEMO_AG_VOTES;

  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Votes en direct</div>
          <div className={styles.topBarSubtitle}>AG Ordinaire — 15 Avril 2026</div>
        </div>
        <div className={styles.topBarActions}>
          <div className={styles.segmented}>
            <button className={`${styles.segmentItem} ${styles.segmentItemActive}`}>Résultats</button>
            <button className={styles.segmentItem}>Détail</button>
          </div>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Résolutions</div>
          <div className={styles.kpiValue} style={{ color: 'var(--demo-text)', fontSize: 18 }}>{summary.total}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Adoptées</div>
          <div className={styles.kpiValue} style={{ color: 'var(--demo-success)', fontSize: 18 }}>{summary.adoptees}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>Rejetées</div>
          <div className={styles.kpiValue} style={{ color: 'var(--demo-danger)', fontSize: 18 }}>{summary.rejetees}</div>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiLabel}>En cours</div>
          <div className={styles.kpiValue} style={{ color: 'var(--demo-primary)', fontSize: 18 }}>{summary.enCours}</div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Résultats des votes</div>
      <div className={styles.cardList}>
        {resolutions.map((r) => {
          const st = STATUS_STYLE[r.status] || STATUS_STYLE['En cours'];
          return (
            <div key={r.num} className={styles.card} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {r.status === 'Adoptée'
                    ? <CheckCircle size={14} style={{ color: 'var(--demo-success-bright)' }} />
                    : <XCircle size={14} style={{ color: 'var(--demo-danger-bright)' }} />
                  }
                  <span className={styles.cardTitle}>{r.title}</span>
                </div>
                <span
                  className={styles.badge}
                  style={{ background: st.bg, color: st.color }}
                >
                  {r.status}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--demo-text-tertiary)' }}>
                <span>{r.article}</span>
                <span style={{ margin: '0 4px' }}>·</span>
                <span style={{ color: 'var(--demo-success-bright)' }}>Pour {r.pour}%</span>
                <span style={{ margin: '0 2px' }}>·</span>
                <span style={{ color: 'var(--demo-danger-bright)' }}>Contre {r.contre}%</span>
                <span style={{ margin: '0 2px' }}>·</span>
                <span style={{ color: 'var(--demo-text-secondary)' }}>Abst. {r.abstention}%</span>
              </div>
              <div className={styles.progressBar} style={{ height: 6 }}>
                <div style={{
                  display: 'flex', height: '100%', borderRadius: 2, overflow: 'hidden',
                }}>
                  <div style={{ width: `${r.pour}%`, background: 'var(--demo-success)' }} />
                  <div style={{ width: `${r.contre}%`, background: 'var(--demo-danger)' }} />
                  <div style={{ width: `${r.abstention}%`, background: 'var(--demo-text-muted)' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
