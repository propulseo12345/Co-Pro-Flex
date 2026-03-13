'use client';

import clsx from 'clsx';
import { Wrench, TrendingUp } from 'lucide-react';
import type { ActiveTab } from '@/components/features/maintenance/Logbook/types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export interface LogbookTabsProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    interventionsCount: number;
    travauxCount: number;
}

export function LogbookTabs({
    activeTab,
    onTabChange,
    interventionsCount,
    travauxCount,
}: LogbookTabsProps) {
    return (
        <div className={styles.tabs}>
            <button
                className={clsx(styles.tab, activeTab === 'interventions' && styles.activeTab)}
                onClick={() => onTabChange('interventions')}
            >
                <Wrench size={15} aria-hidden="true" />
                Interventions
                <span className={styles.tabCount}>{interventionsCount}</span>
            </button>
            <button
                className={clsx(styles.tab, activeTab === 'travaux' && styles.activeTab)}
                onClick={() => onTabChange('travaux')}
            >
                <TrendingUp size={15} aria-hidden="true" />
                Travaux prévisionnels
                <span className={styles.tabCount}>{travauxCount}</span>
            </button>
        </div>
    );
}
