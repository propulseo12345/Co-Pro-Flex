'use client';

import { Download, Plus } from 'lucide-react';
import { getExercicesList } from '@/lib/dates';
import styles from './BudgetTopBar.module.css';

const AVAILABLE_YEARS = getExercicesList(4).map(y => parseInt(y));

interface BudgetTopBarProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  onCreateBudget: () => void;
  onExportPDF: () => void;
}

export function BudgetTopBar({
  selectedYear,
  onYearChange,
  onCreateBudget,
  onExportPDF,
}: BudgetTopBarProps) {
  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>Budgets</h1>
        <div className={styles.yearPill}>
          <span className={styles.dot} />
          Exercice {selectedYear}
        </div>
        <select
          className={styles.yearSelect}
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {AVAILABLE_YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>
      <div className={styles.actions}>
        <button className={styles.btnIcon} onClick={onExportPDF} title="Export PDF">
          <Download size={16} />
        </button>
        <button className={styles.btnPrimary} onClick={onCreateBudget}>
          <Plus size={16} />
          Créer un budget
        </button>
      </div>
    </div>
  );
}
