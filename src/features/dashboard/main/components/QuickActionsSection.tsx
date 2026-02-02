'use client';

import Link from 'next/link';
import type { QuickAction } from '../hooks/useDashboardMainPage';
import styles from '@/app/(dashboard)/dashboard/dashboard.module.css';

interface QuickActionsSectionProps {
  quickActions: QuickAction[];
}

export function QuickActionsSection({ quickActions }: QuickActionsSectionProps) {
  return (
    <section className={styles.shortcutsSection}>
      <h2 className={styles.sectionTitle}>Raccourcis</h2>
      <div className={styles.shortcutsGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} className={styles.shortcutBtn}>
              <Icon size={18} />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
