'use client';

import type { ReactNode } from 'react';
import clsx from 'clsx';
import styles from './FinanceTopBar.module.css';

export interface FinanceTopBarPill {
  label: string;
  variant: 'green' | 'blue';
  dotVariant?: 'green' | 'blue' | 'gray';
}

interface FinanceTopBarProps {
  title: string;
  subtitle?: string;
  pill?: FinanceTopBarPill;
  actions?: ReactNode;
}

export function FinanceTopBar({ title, subtitle, pill, actions }: FinanceTopBarProps) {
  const pillClass = pill?.variant === 'green' ? styles.pillGreen : styles.pillBlue;
  const dotClass = pill?.dotVariant === 'green' ? styles.dotGreen
    : pill?.dotVariant === 'blue' ? styles.dotBlue
    : styles.dotGray;

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {pill && (
          <span className={clsx(styles.pill, pillClass)}>
            <span className={clsx(styles.dot, dotClass)} />
            {pill.label}
          </span>
        )}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}

// Re-export style classes for use in action buttons
export const topBarStyles = styles;
