'use client';

import styles from './AgOverview.module.css';

interface AgStats {
  total: number;
  draft: number;
  convoked: number;
  closed: number;
  pvGenerated: number;
}

interface AgStatsCardProps {
  stats: AgStats;
}

export function AgStatsCard({ stats }: AgStatsCardProps) {
  if (stats.total === 0) return null;

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3 className={styles.sectionTitle}>Statistiques</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Total AG</span>
          <span style={{ fontWeight: 600 }}>{stats.total}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Brouillons</span>
          <span style={{ fontWeight: 600, color: 'var(--warning)' }}>{stats.draft}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Convoquées</span>
          <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{stats.convoked}</span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>Clôturées</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>
            {stats.closed + stats.pvGenerated}
          </span>
        </div>
      </div>
    </div>
  );
}
