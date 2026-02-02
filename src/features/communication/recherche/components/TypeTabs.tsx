'use client';

import clsx from 'clsx';
import type { ResultType } from '../hooks/useRecherchePage';
import styles from '@/app/(dashboard)/communication/recherche/recherche.module.css';

interface TypeTabsProps {
  resultTypes: ResultType[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  getResultCount: (typeId: string) => number;
}

export function TypeTabs({
  resultTypes,
  selectedType,
  onTypeChange,
  getResultCount,
}: TypeTabsProps) {
  return (
    <div className={styles.typeTabs}>
      {resultTypes.map((type) => {
        const Icon = type.icon;
        const count = getResultCount(type.id);

        return (
          <button
            key={type.id}
            className={clsx(
              styles.typeTab,
              selectedType === type.id && styles.active
            )}
            onClick={() => onTypeChange(type.id)}
          >
            <Icon size={18} aria-hidden="true" />
            {type.label}
            <span className={styles.count}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
