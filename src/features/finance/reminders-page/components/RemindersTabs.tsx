'use client';

import { AlertCircle, History } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/unpaid/reminders/reminders.module.css';
import type { TabType } from '../hooks/useRemindersPage';

export interface RemindersTabsProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    unpaidCount: number;
    historyCount: number;
}

export function RemindersTabs({
    activeTab,
    onTabChange,
    unpaidCount,
    historyCount,
}: RemindersTabsProps) {
    return (
        <div className={styles.tabs}>
            <button
                className={`${styles.tab} ${activeTab === 'unpaid' ? styles.tabActive : ''}`}
                onClick={() => onTabChange('unpaid')}
            >
                <AlertCircle size={16} /> A relancer ({unpaidCount})
            </button>
            <button
                className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
                onClick={() => onTabChange('history')}
            >
                <History size={16} /> Historique ({historyCount})
            </button>
        </div>
    );
}
