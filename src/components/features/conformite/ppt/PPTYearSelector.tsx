'use client';

import clsx from 'clsx';
import styles from './PPTYearSelector.module.css';

interface PPTYearSelectorProps {
  years: number[];
  selectedYear: number | null;
  onSelect: (year: number | null) => void;
}

export function PPTYearSelector({ years, selectedYear, onSelect }: PPTYearSelectorProps) {
  return (
    <div className={styles.container}>
      <button
        type="button"
        className={clsx(styles.pill, selectedYear === null && styles.pillActive)}
        onClick={() => onSelect(null)}
      >
        Tous
      </button>
      {years.map(year => (
        <button
          key={year}
          type="button"
          className={clsx(styles.pill, selectedYear === year && styles.pillActive)}
          onClick={() => onSelect(year)}
        >
          {year}
        </button>
      ))}
    </div>
  );
}
