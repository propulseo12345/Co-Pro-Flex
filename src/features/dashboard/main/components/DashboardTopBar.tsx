'use client';

import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface DashboardTopBarProps {
  coproName: string;
  businessYear: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function DashboardTopBar({
  coproName,
  businessYear,
  isRefreshing,
  onRefresh,
}: DashboardTopBarProps) {
  return (
    <div className={styles.topbar}>
      <div>
        <div className={styles.topbarTitle}>Dashboard</div>
        <div className={styles.topbarSub}>
          {coproName} · Exercice {businessYear}
        </div>
      </div>
      <div className={styles.topbarActions}>
        <Link href="/maintenance/service-orders/new" className={`${styles.btn} ${styles.btnPill} ${styles.btnPrimary}`}>
          Créer ODS
        </Link>
        <Link href="/finance/appels-fonds" className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}>
          Appel de fonds
        </Link>
        <Link href="/finance/invoices" className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}>
          Nouvelle facture
        </Link>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`${styles.btn} ${styles.btnPill} ${styles.btnGhost}`}
        >
          <RefreshCw size={14} className={isRefreshing ? styles.spinning : ''} />
        </button>
      </div>
    </div>
  );
}
