'use client';

import type { ReactNode } from 'react';
import styles from './FinanceKpiStrip.module.css';

export interface FinanceKpi {
  label: string;
  value: string;
  color?: string; // CSS color string
  trend?: ReactNode;
}

interface FinanceKpiStripProps {
  items: FinanceKpi[];
}

export function FinanceKpiStrip({ items }: FinanceKpiStripProps) {
  return (
    <div className={styles.strip}>
      {items.map((item, i) => (
        <div key={i} className={styles.kpiCard}>
          <div className={styles.label}>{item.label}</div>
          <div className={styles.value} style={item.color ? { color: item.color } : undefined}>
            {item.value}
          </div>
          {item.trend && <div className={styles.trend}>{item.trend}</div>}
        </div>
      ))}
    </div>
  );
}
