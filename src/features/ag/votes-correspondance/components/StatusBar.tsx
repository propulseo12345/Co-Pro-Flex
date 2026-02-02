'use client';

import { RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/votes-correspondance.module.css';

interface CorrespondenceStatus {
  forms_received: number;
  forms_validated: number;
  forms_integrated: number;
  correspondence_tantiemes: number;
  total_tantiemes: number;
  correspondence_ratio: number;
}

interface StatusBarProps {
  status: CorrespondenceStatus;
  onRefresh: () => void;
}

export function StatusBar({ status, onRefresh }: StatusBarProps) {
  return (
    <div className={styles.statusBar}>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Formulaires recus</span>
        <span className={styles.statusValue}>{status.forms_received}</span>
      </div>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Valides</span>
        <span className={styles.statusValue}>{status.forms_validated}</span>
      </div>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Integres</span>
        <span className={styles.statusValue}>{status.forms_integrated}</span>
      </div>
      <div className={styles.statusItem}>
        <span className={styles.statusLabel}>Tantiemes correspondance</span>
        <span className={styles.statusValue}>
          {status.correspondence_tantiemes} / {status.total_tantiemes}
          <span className={styles.statusPercent}>({status.correspondence_ratio}%)</span>
        </span>
      </div>
      <button onClick={onRefresh} className={styles.refreshButton} title="Rafraichir">
        <RefreshCw size={16} />
      </button>
    </div>
  );
}
