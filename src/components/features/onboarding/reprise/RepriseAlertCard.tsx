'use client';

import { AlertTriangle, ChevronRight } from 'lucide-react';
import styles from './RepriseAlertCard.module.css';

interface RepriseAlertCardProps {
  coproName: string;
  residual: number;
  onOpen: () => void;
}

export function RepriseAlertCard({ coproName, residual, onOpen }: RepriseAlertCardProps) {
  return (
    <button type="button" className={styles.card} onClick={onOpen}>
      <AlertTriangle size={18} className={styles.icon} />
      <div className={styles.body}>
        <span className={styles.title}>Reprise à terminer — {coproName}</span>
        <span className={styles.detail}>
          {Math.abs(residual).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} à imputer (471/472)
        </span>
      </div>
      <ChevronRight size={18} className={styles.chevron} />
    </button>
  );
}
