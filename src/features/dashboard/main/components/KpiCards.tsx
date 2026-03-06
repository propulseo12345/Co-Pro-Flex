'use client';

import Link from 'next/link';
import { Wallet, AlertTriangle, Calendar, TrendingUp, Landmark, Wrench } from 'lucide-react';
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

      {/* Budget consommé — depuis annexe 2 */}
      {kpis.budget_pct !== undefined && (
        <Link href="/finance/budget-current" className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <TrendingUp size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Budget consommé</span>
            <span className={styles.metricValue}>{kpis.budget_pct}%</span>
          </div>
        </Link>
      )}

      {/* Provisions travaux — depuis annexe 1 */}
      {kpis.provisions_travaux !== undefined && kpis.provisions_travaux > 0 && (
        <Link href="/documents/annexes" className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Landmark size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Provisions travaux</span>
            <span className={styles.metricValue}>{formatCurrency(kpis.provisions_travaux)}</span>
          </div>
        </Link>
      )}

      {/* Travaux en cours — depuis annexe 4 */}
      {kpis.nb_travaux_ouverts !== undefined && kpis.nb_travaux_ouverts > 0 && (
        <Link href="/documents/annexes" className={styles.metricCard}>
          <div className={styles.metricIcon}>
            <Wrench size={20} />
          </div>
          <div className={styles.metricContent}>
            <span className={styles.metricLabel}>Travaux en cours</span>
            <span className={styles.metricValue}>
              {kpis.nb_travaux_ouverts} ({formatCurrency(kpis.travaux_en_cours ?? 0)})
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}
