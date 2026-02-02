'use client';

import { Vote, Users } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/preparation/preparation.module.css';

export type TabType = 'votes' | 'pouvoirs';

interface PreparationTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  votesProgress: {
    coproprietairesComplets: number;
    totalCoproprietaires: number;
  };
  pouvoirsStats: {
    totalPouvoirs: number;
    mandatairesOverLimit: number;
  };
}

export function PreparationTabs({
  activeTab,
  onTabChange,
  votesProgress,
  pouvoirsStats,
}: PreparationTabsProps) {
  return (
    <div className={styles.tabs}>
      <button
        onClick={() => onTabChange('votes')}
        className={`${styles.tab} ${activeTab === 'votes' ? styles.tabActive : ''}`}
      >
        <Vote size={18} aria-hidden="true" />
        Votes par correspondance
        <span className={styles.tabBadge}>
          {votesProgress.coproprietairesComplets}/{votesProgress.totalCoproprietaires}
        </span>
      </button>
      <button
        onClick={() => onTabChange('pouvoirs')}
        className={`${styles.tab} ${activeTab === 'pouvoirs' ? styles.tabActive : ''}`}
      >
        <Users size={18} aria-hidden="true" />
        Pouvoirs (mandats)
        <span className={styles.tabBadge}>{pouvoirsStats.totalPouvoirs}</span>
        {pouvoirsStats.mandatairesOverLimit > 0 && (
          <span className={styles.tabBadgeError}>!</span>
        )}
      </button>
    </div>
  );
}
