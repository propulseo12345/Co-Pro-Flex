'use client';

import clsx from 'clsx';
import { Upload, Tag, GitCompare, Lock } from 'lucide-react';
import type { WorkflowTab } from '../domain/types';
import styles from './WorkflowTabs.module.css';

interface WorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
  counts: {
    import: number;
    categorisation: number;
    rapprochement: number;
    cloture: number;
  };
}

const TABS: { key: WorkflowTab; label: string; icon: typeof Upload }[] = [
  { key: 'import', label: 'Import', icon: Upload },
  { key: 'categorisation', label: 'Catégorisation', icon: Tag },
  { key: 'rapprochement', label: 'Rapprochement', icon: GitCompare },
  { key: 'cloture', label: 'Clôture', icon: Lock },
];

export function WorkflowTabs({ activeTab, onTabChange, counts }: WorkflowTabsProps) {
  return (
    <div className={styles.tabs}>
      {TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          className={clsx(styles.tab, activeTab === key && styles.active)}
          onClick={() => onTabChange(key)}
        >
          <Icon size={15} />
          <span>{label}</span>
          {counts[key] > 0 && (
            <span className={clsx(styles.count, activeTab === key && styles.countActive)}>
              {counts[key]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
