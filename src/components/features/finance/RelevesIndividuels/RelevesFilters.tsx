'use client';

import { Search } from 'lucide-react';
import type { RelevesFilters } from './types';
import styles from './releves-individuels.module.css';

interface RelevesFiltersProps {
  filters: RelevesFilters;
  onFiltersChange: (filters: RelevesFilters) => void;
  exercices: string[];
}

export function RelevesFilters({ filters, onFiltersChange, exercices }: RelevesFiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.searchBox}>
        <Search size={18} />
        <input
          type="text"
          placeholder="Rechercher par nom, lot..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
        />
      </div>

      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>Exercice</label>
        <select
          className={styles.filterSelect}
          value={filters.exercice}
          onChange={(e) => onFiltersChange({ ...filters, exercice: e.target.value })}
        >
          {exercices.map(ex => (
            <option key={ex} value={ex}>{ex}</option>
          ))}
        </select>
      </div>

      <div className={styles.filterButtons}>
        <button
          className={`${styles.filterButton} ${filters.statutSolde === 'tous' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltersChange({ ...filters, statutSolde: 'tous' })}
        >
          Tous
        </button>
        <button
          className={`${styles.filterButton} ${filters.statutSolde === 'debiteur' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltersChange({ ...filters, statutSolde: 'debiteur' })}
        >
          Débiteurs
        </button>
        <button
          className={`${styles.filterButton} ${filters.statutSolde === 'crediteur' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltersChange({ ...filters, statutSolde: 'crediteur' })}
        >
          Créditeurs
        </button>
        <button
          className={`${styles.filterButton} ${filters.statutSolde === 'equilibre' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltersChange({ ...filters, statutSolde: 'equilibre' })}
        >
          À jour
        </button>
      </div>
    </div>
  );
}
