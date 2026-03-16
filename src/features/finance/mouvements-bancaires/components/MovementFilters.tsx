'use client';

import { Search } from 'lucide-react';
import clsx from 'clsx';
import type { TypeMouvement } from '../domain/types';
import styles from './MovementFilters.module.css';

interface MovementFiltersProps {
  searchTerm: string;
  typeFilter: 'TOUS' | TypeMouvement;
  categorieFilter: 'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE';
  rapprochementFilter: 'tous' | 'rapproche' | 'non_rapproche';
  totalCount: number;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (filter: 'TOUS' | TypeMouvement) => void;
  onCategorieFilterChange: (filter: 'TOUS' | 'CATEGORISE' | 'NON_CATEGORISE') => void;
  onRapprochementFilterChange: (filter: 'tous' | 'rapproche' | 'non_rapproche') => void;
}

export function MovementFilters({
  searchTerm,
  typeFilter,
  categorieFilter,
  rapprochementFilter,
  totalCount,
  onSearchChange,
  onTypeFilterChange,
  onCategorieFilterChange,
  onRapprochementFilterChange,
}: MovementFiltersProps) {
  return (
    <div className={styles.filtersContainer}>
      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Rechercher par libellé, montant, fournisseur..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <button
        type="button"
        className={clsx(styles.filterBtn, typeFilter === 'TOUS' && categorieFilter === 'TOUS' && rapprochementFilter === 'tous' && styles.filterBtnActive)}
        onClick={() => {
          onTypeFilterChange('TOUS');
          onCategorieFilterChange('TOUS');
          onRapprochementFilterChange('tous');
        }}
      >
        Tous ({totalCount})
      </button>

      <button
        type="button"
        className={clsx(styles.filterBtn, typeFilter === 'ENTREE' && styles.filterBtnActive)}
        onClick={() => onTypeFilterChange(typeFilter === 'ENTREE' ? 'TOUS' : 'ENTREE')}
      >
        ↓ Entrées
      </button>

      <button
        type="button"
        className={clsx(styles.filterBtn, typeFilter === 'SORTIE' && styles.filterBtnActive)}
        onClick={() => onTypeFilterChange(typeFilter === 'SORTIE' ? 'TOUS' : 'SORTIE')}
      >
        ↑ Sorties
      </button>

      <button
        type="button"
        className={clsx(
          styles.filterBtn,
          categorieFilter === 'NON_CATEGORISE' && styles.filterBtnWarning
        )}
        onClick={() => onCategorieFilterChange(categorieFilter === 'NON_CATEGORISE' ? 'TOUS' : 'NON_CATEGORISE')}
      >
        ⚠ Non cat.
      </button>

      <button
        type="button"
        className={clsx(
          styles.filterBtn,
          rapprochementFilter === 'non_rapproche' && styles.filterBtnOrange
        )}
        onClick={() => onRapprochementFilterChange(rapprochementFilter === 'non_rapproche' ? 'tous' : 'non_rapproche')}
      >
        ○ Non rappr.
      </button>
    </div>
  );
}
