'use client';

import { Download, Plus } from 'lucide-react';
import styles from './BudgetTopBar.module.css';

interface BudgetTopBarProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  onCreateBudget: () => void;
  onExportPDF: () => void;
}

export function BudgetTopBar({
  onCreateBudget,
  onExportPDF,
}: BudgetTopBarProps) {
  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <h1 className={styles.title}>Budgets</h1>
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
