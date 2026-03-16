'use client';

import { TrendingUp, AlertTriangle, Percent } from 'lucide-react';
import clsx from 'clsx';
import type { AppelStats } from '../types';
import { formatEuros } from '../utils';
import styles from './AppelsFondsKpiStrip.module.css';

interface AppelsFondsKpiStripProps {
  stats: AppelStats;
}

export function AppelsFondsKpiStrip({ stats }: AppelsFondsKpiStripProps) {
  const rateColor = stats.recoveryRate >= 80 ? 'green' : stats.recoveryRate >= 50 ? 'amber' : 'red';
  const trendColor = stats.recoveryRate >= 80 ? styles.trendGreen : stats.recoveryRate >= 50 ? styles.trendAmber : styles.trendRed;

  return (
    <div className={styles.strip}>
      <div className={styles.card}>
        <div className={styles.label}>Total Appelé</div>
        <div className={clsx(styles.value, styles.blue)}>
          {formatEuros(stats.totalCalled)}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.label}>Total Encaissé</div>
        <div className={clsx(styles.value, styles.green)}>
          {formatEuros(stats.totalPaid)}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.label}>Impayés</div>
        <div className={clsx(styles.value, styles.red)}>
          {formatEuros(stats.totalUnpaid)}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.label}>Taux de recouvrement</div>
        <div className={clsx(styles.value, styles[rateColor])}>
          {stats.recoveryRate} %
        </div>
        <div className={clsx(styles.trend, trendColor)}>
          {stats.recoveryRate >= 80 ? (
            <><TrendingUp size={12} /> Bon niveau</>
          ) : stats.recoveryRate >= 50 ? (
            <><Percent size={12} /> À surveiller</>
          ) : (
            <><AlertTriangle size={12} /> Critique</>
          )}
        </div>
      </div>
    </div>
  );
}
