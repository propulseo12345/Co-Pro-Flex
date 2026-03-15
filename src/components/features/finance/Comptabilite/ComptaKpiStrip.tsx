'use client';

import { CheckCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from './utils';
import styles from './ComptaKpiStrip.module.css';

interface ComptaKpiStripProps {
  totalDebit: number;
  totalCredit: number;
  ecrituresCount: number;
  isBalanced: boolean;
}

export function ComptaKpiStrip({
  totalDebit,
  totalCredit,
  ecrituresCount,
  isBalanced,
}: ComptaKpiStripProps) {
  return (
    <div className={styles.strip}>
      <div className={styles.card}>
        <div className={styles.label}>Total Débit</div>
        <div className={`${styles.value} ${styles.red}`}>
          {formatCurrency(totalDebit)}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Total Crédit</div>
        <div className={`${styles.value} ${styles.green}`}>
          {formatCurrency(totalCredit)}
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>Écritures</div>
        <div className={`${styles.value} ${styles.blue}`}>{ecrituresCount}</div>
        <div className={styles.trend}>
          <CheckCircle size={12} /> Toutes comptabilisées
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.label}>État balance</div>
        <div className={`${styles.value} ${isBalanced ? styles.green : styles.red}`}>
          {isBalanced ? 'Équilibrée' : 'Déséquilibrée'}
        </div>
        {!isBalanced && (
          <div className={styles.trendDanger}>
            <AlertCircle size={12} /> Vérifier les écritures
          </div>
        )}
      </div>
    </div>
  );
}
