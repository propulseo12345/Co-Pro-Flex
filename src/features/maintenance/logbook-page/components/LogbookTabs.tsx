'use client';

import clsx from 'clsx';
import { Wrench, TrendingUp, Shield } from 'lucide-react';
import type { ActiveTab } from '@/components/features/maintenance/Logbook/types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

export interface LogbookTabsProps {
    activeTab: ActiveTab;
    onTabChange: (tab: ActiveTab) => void;
    interventionsCount: number;
    travauxCount: number;
    documentsCount: number;
}

export function LogbookTabs({
    activeTab,
    onTabChange,
    interventionsCount,
    travauxCount,
    documentsCount,
}: LogbookTabsProps) {
    return (
        <div className={styles.tabs}>
            <button
                className={clsx(styles.tab, activeTab === 'interventions' && styles.activeTab)}
                onClick={() => onTabChange('interventions')}
            >
                <Wrench size={18} aria-hidden="true" /> Interventions ({interventionsCount})
            </button>
            <button
                className={clsx(styles.tab, activeTab === 'travaux' && styles.activeTab)}
                onClick={() => onTabChange('travaux')}
            >
                <TrendingUp size={18} aria-hidden="true" /> Travaux previsionnels ({travauxCount})
            </button>
            <button
                className={clsx(styles.tab, activeTab === 'documents' && styles.activeTab)}
                onClick={() => onTabChange('documents')}
            >
                <Shield size={18} aria-hidden="true" /> Documents techniques ({documentsCount})
            </button>
        </div>
    );
}
