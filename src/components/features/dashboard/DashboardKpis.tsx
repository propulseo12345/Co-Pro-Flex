'use client';

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import styles from '../../../app/(dashboard)/dashboard/dashboard.module.css';

interface Kpi {
  id: number;
  label: string;
  value: string;
  change: string;
  trend: string;
  icon: React.ElementType;
  color: string;
}

interface DashboardKpisProps {
  kpis: Kpi[];
}

export function DashboardKpis({ kpis }: DashboardKpisProps) {
  return (
    <>
      <div className={styles.essentialKpis}>
        {kpis.slice(0, 2).map((kpi) => {
          const Icon = kpi.icon;
          const TrendIcon = kpi.trend === 'up' ? ArrowUpRight : ArrowDownRight;
          return (
            <div key={kpi.id} className={`${styles.kpiCard} ${styles[`kpi${kpi.color.charAt(0).toUpperCase() + kpi.color.slice(1)}`]}`}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <div className={styles.kpiIcon}><Icon size={20} aria-hidden="true" /></div>
              </div>
              <div className={styles.kpiValue}>{kpi.value}</div>
              <div className={styles.kpiChange}>
                {kpi.trend !== 'stable' && kpi.trend !== 'warning' && (<TrendIcon size={16} className={styles.kpiTrendIcon} />)}
                <span>{kpi.change}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.secondaryKpis}>
        {kpis.slice(2).map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.id} className={`${styles.kpiCard} ${styles[`kpi${kpi.color.charAt(0).toUpperCase() + kpi.color.slice(1)}`]}`}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiLabel}>{kpi.label}</span>
                <div className={styles.kpiIcon}><Icon size={20} aria-hidden="true" /></div>
              </div>
              <div className={styles.kpiValue}>{kpi.value}</div>
              <div className={styles.kpiChange}><span>{kpi.change}</span></div>
            </div>
          );
        })}
      </div>
    </>
  );
}
