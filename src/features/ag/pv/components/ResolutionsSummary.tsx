'use client';

import type { Resolution, ResolutionResult } from '../domain/types';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface ResolutionsSummaryProps {
  resolutions: Resolution[];
  getResolutionResult: (resolution: Resolution) => ResolutionResult;
}

export function ResolutionsSummary({ resolutions, getResolutionResult }: ResolutionsSummaryProps) {
  return (
    <div className="card">
      <h2 className={styles.sectionTitle}>Résumé des résolutions</h2>
      <div className={styles.compactResultsList}>
        {resolutions.map((resolution, index) => {
          const result = getResolutionResult(resolution);
          return (
            <div key={resolution.id} className={styles.compactResultItem}>
              <span className={styles.compactResultNumber}>{index + 1}</span>
              <span className={styles.compactResultTitle}>{resolution.titre}</span>
              <span
                className={`${styles.compactResultBadge} ${
                  result.adopte ? styles.compactResultBadgeSuccess : styles.compactResultBadgeDanger
                }`}
              >
                {result.adopte ? 'Adoptée' : 'Rejetée'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
