'use client';

import { Download, FileText, RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/documents/balance/balance.module.css';

interface BalanceHeaderProps {
  periodName: string;
  today: string;
  onRefresh: () => void;
}

export function BalanceHeader({ periodName, today, onRefresh }: BalanceHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Balance Comptable</h1>
        <p className={styles.subtitle}>
          {periodName} - Vue au {today}
        </p>
      </div>
      <div className={styles.actions}>
        <button className="btn btn-secondary" onClick={onRefresh} title="Actualiser les données">
          <RefreshCw size={16} style={{ marginRight: 8 }} aria-hidden="true" /> Actualiser
        </button>
        <button className="btn btn-secondary"><Download size={16} aria-hidden="true" /> Export Excel</button>
        <button className="btn btn-secondary"><FileText size={16} aria-hidden="true" /> Export PDF</button>
      </div>
    </div>
  );
}
