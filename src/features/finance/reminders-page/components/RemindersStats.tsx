'use client';

import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';
import type { RemindersStats } from '../hooks/useRemindersPage';

export interface RemindersStatsGridProps {
    stats: RemindersStats;
}

export function RemindersStatsGrid({ stats }: RemindersStatsGridProps) {
    return (
        <div className={styles.statsGrid}>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Total impayes</div>
                <div className={`${styles.statValue} ${styles.statValueError}`}>
                    {stats.totalUnpaid.toLocaleString('fr-FR')} EUR
                </div>
            </div>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Lots en retard</div>
                <div className={styles.statValue}>{stats.lotsCount}</div>
            </div>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Retard &gt; 30 jours</div>
                <div className={`${styles.statValue} ${styles.statValueWarning}`}>
                    {stats.lotsOver30Days}
                </div>
            </div>
            <div className={styles.statCard}>
                <div className={styles.statLabel}>Deja relances</div>
                <div className={`${styles.statValue} ${styles.statValueSuccess}`}>
                    {stats.totalReminded}
                </div>
            </div>
        </div>
    );
}
