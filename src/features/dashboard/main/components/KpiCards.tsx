'use client';

import Link from 'next/link';
import { Wallet, AlertTriangle, Calendar } from 'lucide-react';
import { formatDateFR } from '@/lib/time/period';
import { formatCurrency, type KpisData } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface KpiCardsProps {
  kpis: KpisData;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <section className={styles.metricsRow}>
      {/* Solde global */}
      <Link href="/finance/treasury" className={styles.metricCard}>
        <div className={styles.metricIcon}>
          <Wallet size={20} />
        </div>
        <div className={styles.metricContent}>
          <span className={styles.metricLabel}>Solde global</span>
          <span className={styles.metricValue}>{formatCurrency(kpis.current_balance)}</span>
        </div>
      </Link>

      {/* Impayés */}
      <Link
        href="/finance/unpaid"
        className={`${styles.metricCard} ${kpis.unpaid_total > 0 ? styles.metricDanger : ''}`}
      >
        <div className={styles.metricIcon}>
          <AlertTriangle size={20} />
        </div>
        <div className={styles.metricContent}>
          <span className={styles.metricLabel}>Impayés en cours</span>
          <span className={styles.metricValue}>
            {kpis.unpaid_total > 0 ? formatCurrency(kpis.unpaid_total) : 'Aucun'}
          </span>
        </div>
        {kpis.unpaid_total > 0 && <AlertTriangle size={20} />}
      </Link>

      {/* Prochaine AG */}
      <Link href={kpis.next_ag_id ? `/ag/${kpis.next_ag_id}` : '/ag/dashboard'} className={styles.metricCard}>
        <div className={styles.metricIcon}>
          <Calendar size={20} />
        </div>
        <div className={styles.metricContent}>
          <span className={styles.metricLabel}>Prochaine AG</span>
          <span className={styles.metricValue}>
            {kpis.next_ag_date ? formatDateFR(kpis.next_ag_date) : 'Aucune prévue'}
          </span>
        </div>
      </Link>
    </section>
  );
}
