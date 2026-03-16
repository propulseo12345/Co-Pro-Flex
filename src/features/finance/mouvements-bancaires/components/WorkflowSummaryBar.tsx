'use client';

import { AlertTriangle, CheckCircle, FileQuestion, GitCompare, TrendingUp } from 'lucide-react';
import styles from './WorkflowSummaryBar.module.css';

interface WorkflowSummaryBarProps {
  nonCategorises: { total: number; montantTotal: number };
  nonRapproches: number;
  suggestionsPretes: number;
  ecartSoldes: number;
  progressionMensuelle: number;
}

export function WorkflowSummaryBar({
  nonCategorises,
  nonRapproches,
  suggestionsPretes,
  ecartSoldes,
  progressionMensuelle,
}: WorkflowSummaryBarProps) {
  const formatMontant = (n: number) =>
    n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  return (
    <div className={styles.bar}>
      <div className={styles.stat}>
        <FileQuestion size={16} className={styles.iconWarning} />
        <div>
          <span className={styles.value}>{nonCategorises.total}</span>
          <span className={styles.label}>Non catégorisés</span>
        </div>
      </div>

      <div className={styles.stat}>
        <GitCompare size={16} className={styles.iconInfo} />
        <div>
          <span className={styles.value}>{nonRapproches}</span>
          <span className={styles.label}>Non rapprochés</span>
        </div>
      </div>

      <div className={styles.stat}>
        <CheckCircle size={16} className={styles.iconSuccess} />
        <div>
          <span className={styles.value}>{suggestionsPretes}</span>
          <span className={styles.label}>Suggestions prêtes</span>
        </div>
      </div>

      <div className={styles.stat}>
        <AlertTriangle size={16} className={ecartSoldes === 0 ? styles.iconSuccess : styles.iconError} />
        <div>
          <span className={styles.value}>{formatMontant(ecartSoldes)}</span>
          <span className={styles.label}>Écart soldes</span>
        </div>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressHeader}>
          <TrendingUp size={14} />
          <span className={styles.progressLabel}>Progression</span>
          <span className={styles.progressValue}>{progressionMensuelle}%</span>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressionMensuelle}%` }}
          />
        </div>
      </div>
    </div>
  );
}
