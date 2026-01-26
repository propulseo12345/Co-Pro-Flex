'use client';

import type { HistoriqueItem } from './types';
import { formatDateTime } from './utils';
import styles from './VenteDetail.module.css';

interface VenteHistoriqueProps {
  historique: HistoriqueItem[];
}

export function VenteHistorique({ historique }: VenteHistoriqueProps) {
  return (
    <div className="card">
      <div className={styles.historiqueList}>
        {historique.map((item, index) => (
          <div key={item.id} className={styles.historiqueItem}>
            <div className={styles.historiqueTimeline}>
              <div className={styles.timelineDot}></div>
              {index < historique.length - 1 && (
                <div className={styles.timelineLine}></div>
              )}
            </div>

            <div className={styles.historiqueContent}>
              <p className={styles.historiqueDescription}>{item.description}</p>
              <div className={styles.historiqueMeta}>
                <span>{formatDateTime(item.date)}</span>
                <span>•</span>
                <span>{item.auteur}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
