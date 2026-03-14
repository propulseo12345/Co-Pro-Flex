'use client';

import styles from '../styles/StatsGrid.module.css';
import clsx from 'clsx';

export type StatColor = 'blue' | 'green' | 'red' | 'amber' | 'purple';

export interface StatItem {
  icon: string;
  iconColor: StatColor;
  label: string;
  value: string;
  valueColor?: 'green' | 'red';
  suffix?: string;
}

interface StatsGridProps {
  items: StatItem[];
}

const iconColorMap: Record<StatColor, string> = {
  blue: styles.iconBlue,
  green: styles.iconGreen,
  red: styles.iconRed,
  amber: styles.iconAmber,
  purple: styles.iconPurple,
};

const valueColorMap: Record<string, string> = {
  green: styles.valueGreen,
  red: styles.valueRed,
};

export function StatsGrid({ items }: StatsGridProps) {
  return (
    <div className={styles.grid}>
      {items.map((item, i) => (
        <div key={i} className={styles.card}>
          <div className={clsx(styles.icon, iconColorMap[item.iconColor])}>
            {item.icon}
          </div>
          <div>
            <div className={styles.label}>{item.label}</div>
            <div className={clsx(styles.value, item.valueColor && valueColorMap[item.valueColor])}>
              {item.value}
              {item.suffix && <span className={styles.valueSuffix}> {item.suffix}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
