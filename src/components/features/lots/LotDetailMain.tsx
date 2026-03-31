'use client';

import { BarChart3 } from 'lucide-react';
import type { LotRepartitionEntry } from '@/hooks/modules/useLotDetailPage';
import styles from './LotDetailMain.module.css';

interface LotDetailMainProps {
  repartition: LotRepartitionEntry[];
}

export function LotDetailMain({ repartition }: LotDetailMainProps) {
  return (
    <div className={styles.main}>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>
          <BarChart3 size={18} />
          Tantièmes &amp; Clés de répartition
        </h3>
        {repartition.length > 0 ? (
          <table className={styles.repTable}>
            <thead>
              <tr>
                <th>Clé</th>
                <th>Tantièmes</th>
                <th>Total clé</th>
                <th>Part</th>
                <th style={{ width: '30%' }}></th>
              </tr>
            </thead>
            <tbody>
              {repartition.map(r => (
                <tr key={r.key_id}>
                  <td>{r.key_name}</td>
                  <td className={styles.mono}>{r.weight}</td>
                  <td className={styles.mono}>{r.total_weight}</td>
                  <td className={styles.pct}>{r.share_pct.toFixed(2)}%</td>
                  <td>
                    <div className={styles.barContainer}>
                      <div className={styles.bar} style={{ width: `${Math.min(r.share_pct, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className={styles.emptyNote}>Aucune clé de répartition configurée pour ce lot</p>
        )}
      </div>
    </div>
  );
}
