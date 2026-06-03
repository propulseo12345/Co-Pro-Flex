'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
import styles from './EquilibreIndicator.module.css';

interface EquilibreIndicatorProps {
  /** Net 471/472 courant (signé). Considéré équilibré si |residual| < 0,01. */
  residual: number;
}

const EPSILON = 0.01;

export function EquilibreIndicator({ residual }: EquilibreIndicatorProps) {
  const isBalanced = Math.abs(residual) < EPSILON;

  if (isBalanced) {
    return (
      <div className={`${styles.indicator} ${styles.balanced}`}>
        <CheckCircle2 size={16} className={styles.icon} />
        <span className={styles.label}>Reprise équilibrée — rien en attente (471/472)</span>
      </div>
    );
  }

  return (
    <div className={`${styles.indicator} ${styles.warning}`}>
      <AlertTriangle size={16} className={styles.icon} />
      <div className={styles.body}>
        <span className={styles.label}>
          Reste à imputer (471/472) :{' '}
          <strong className={styles.amount}>
            {residual.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </strong>
        </span>
        <span className={styles.nudge}>
          Ce n&apos;est pas bloquant, mais cherchez la cause : banque, réserves ou report manquant.
        </span>
      </div>
    </div>
  );
}
