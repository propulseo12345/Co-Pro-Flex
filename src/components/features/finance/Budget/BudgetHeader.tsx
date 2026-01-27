'use client';

import { Download, Plus } from 'lucide-react';
import { getExercicesList } from '@/lib/dates';
import { BudgetTab } from './types';
import styles from './Budget.module.css';

// Liste des années disponibles (dynamique)
const AVAILABLE_YEARS = getExercicesList(4).map(y => parseInt(y));

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
            {AVAILABLE_YEARS.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
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
