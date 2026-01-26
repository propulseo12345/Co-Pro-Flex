'use client';

import { Download, Plus } from 'lucide-react';
import { BudgetTab } from './types';
import styles from './Budget.module.css';

interface BudgetHeaderProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  onCreateBudget: () => void;
  activeTab: BudgetTab;
  onTabChange: (tab: BudgetTab) => void;
}

export function BudgetHeader({
  selectedYear,
  onYearChange,
  onCreateBudget,
  activeTab,
  onTabChange,
}: BudgetHeaderProps) {
  return (
    <>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Budgets</h1>
          <p className={styles.subtitle}>
            Gestion des budgets de fonctionnement, travaux et fonds ALUR
          </p>
        </div>
        <div className={styles.headerActions}>
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className={styles.yearSelect}
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => alert('Export PDF en cours...\n\nLe budget sera téléchargé au format PDF dans quelques instants.')}
          >
            <Download size={16} aria-hidden="true" />
            Export PDF
          </button>
          <button
            className="btn btn-primary"
            onClick={onCreateBudget}
          >
            <Plus size={16} aria-hidden="true" />
            Creer un budget
          </button>
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          onClick={() => onTabChange('fonctionnement')}
          className={`${styles.tab} ${activeTab === 'fonctionnement' ? styles.tabActive : ''}`}
        >
          Budget de fonctionnement
        </button>
        <button
          onClick={() => onTabChange('travaux')}
          className={`${styles.tab} ${activeTab === 'travaux' ? styles.tabActive : ''}`}
        >
          Budget Travaux
        </button>
        <button
          onClick={() => onTabChange('alur')}
          className={`${styles.tab} ${activeTab === 'alur' ? styles.tabActive : ''}`}
        >
          Fonds ALUR
        </button>
      </div>
    </>
  );
}
