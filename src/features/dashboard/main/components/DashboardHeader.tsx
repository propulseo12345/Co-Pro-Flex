'use client';

import { RefreshCw } from 'lucide-react';
import { formatDateFR } from '@/lib/time/period';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface DashboardHeaderProps {
  businessYear: number;
  isRefreshing: boolean;
  showDate?: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  businessYear,
  isRefreshing,
  showDate = true,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <header className={styles.headerActions}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.subtitle}>
          {showDate
            ? `Exercice ${businessYear} — Mis à jour le ${formatDateFR(new Date())}`
            : `Exercice ${businessYear}`}
        </p>
      </div>
      <button onClick={onRefresh} disabled={isRefreshing} className={styles.refreshBtn}>
        <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
        {isRefreshing ? 'Actualisation...' : 'Actualiser'}
      </button>
    </header>
  );
}
