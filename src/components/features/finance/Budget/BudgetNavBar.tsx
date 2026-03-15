'use client';

import type { BudgetTab } from './types';
import styles from './BudgetNavBar.module.css';

interface BudgetNavBarProps {
  activeTab: BudgetTab;
  onTabChange: (tab: BudgetTab) => void;
}

const TABS: { id: BudgetTab; label: string }[] = [
  { id: 'fonctionnement', label: 'Fonctionnement' },
  { id: 'travaux', label: 'Travaux' },
  { id: 'alur', label: 'Fonds ALUR' },
];

export function BudgetNavBar({ activeTab, onTabChange }: BudgetNavBarProps) {
  return (
    <div className={styles.navbar}>
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
