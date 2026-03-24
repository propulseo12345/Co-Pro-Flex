'use client';

import { Calendar, MapPin, Users, Play, FileText } from 'lucide-react';
import styles from './demo-shared.module.css';
import { DEMO_AG } from './demoData';

export function DemoAg() {
  const { nextAg, stats, resolutions } = DEMO_AG;

  return (
    <div className={styles.demoContainer}>
      <div className={styles.topBar}>
        <div>
          <div className={styles.topBarTitle}>Assemblées Générales</div>
          <div className={styles.topBarSubtitle}>Résidence Les Terrasses de Belleville</div>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.btnPrimary}>
            <Play size={12} />
            Commencer l&apos;AG
          </button>
        </div>
      </div>

      <div className={styles.twoColumns}>
        {/* Prochaine AG */}
        <div>
          <div className={styles.sectionTitle}>Prochaine Assemblée</div>
          <div className={styles.card} style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={styles.cardTitle} style={{ fontSize: 13, fontWeight: 600 }}>{nextAg.title}</span>
              <span className={`${styles.badge} ${styles.badgeInfo}`}>{nextAg.status}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <Calendar size={12} />
                {nextAg.date}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <MapPin size={12} />
                {nextAg.location}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
                <Users size={12} />
                {nextAg.participants} — Quorum {nextAg.quorum}
              </div>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: nextAg.quorum, background: '#3b82f6' }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ marginTop: 16 }}>
            <div className={styles.sectionTitle}>Statistiques</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {stats.map((s) => (
                <div key={s.label} className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>{s.label}</div>
                  <div className={styles.kpiValue} style={{ color: s.color, fontSize: 18 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Résolutions */}
        <div>
          <div className={styles.sectionTitle}>Ordre du jour — {nextAg.resolutions} résolutions</div>
          <div className={styles.cardList}>
            {resolutions.map((r) => (
              <div key={r.num} className={styles.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {r.num}
                  </span>
                  <div>
                    <div className={styles.cardTitle}>{r.title}</div>
                    <div className={styles.cardMeta}>{r.article}</div>
                  </div>
                </div>
                <FileText size={14} color="#64748b" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
