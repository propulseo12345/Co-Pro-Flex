'use client';

import { Filter, Tag, Calendar, HardDrive, FileType } from 'lucide-react';
import clsx from 'clsx';
import { DOCUMENT_CATEGORIES } from '@/data/mock/documents-ged';
import type { SearchFilters } from '../domain/types';
import { FILE_TYPES } from '../domain/constants';
import { getCategoryColor } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface AdvancedFiltersProps {
  filters: SearchFilters;
  hasActiveFilters: boolean;
  onCategoryFilter: (category: string) => void;
  onFileTypeFilter: (type: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSizeMinChange: (value: string) => void;
  onSizeMaxChange: (value: string) => void;
  onClearFilters: () => void;
}

export function AdvancedFilters({
  filters,
  hasActiveFilters,
  onCategoryFilter,
  onFileTypeFilter,
  onDateFromChange,
  onDateToChange,
  onSizeMinChange,
  onSizeMaxChange,
  onClearFilters,
}: AdvancedFiltersProps) {
  return (
    <div className={clsx('card', styles.advancedFilters)}>
      <div className={styles.filtersHeader}>
        <h3>
          <Filter size={18} /> Filtres avancés
        </h3>
        {hasActiveFilters && (
          <button className={styles.clearFiltersBtn} onClick={onClearFilters}>
            Réinitialiser
          </button>
        )}
      </div>

      <div className={styles.filtersGrid}>
        <div className={styles.filterGroup}>
          <label>
            <Tag size={14} /> Catégories
          </label>
          <div className={styles.filterChips}>
            {DOCUMENT_CATEGORIES.slice(1).map((cat) => (
              <button
                key={cat.value}
                className={clsx(
                  styles.filterChip,
                  filters.categories.includes(cat.value) && styles.filterChipActive
                )}
                onClick={() => onCategoryFilter(cat.value)}
                style={{ '--chip-color': getCategoryColor(cat.value) } as React.CSSProperties}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <Calendar size={14} /> Période
          </label>
          <div className={styles.filterRow}>
            <input
              type="date"
              className={styles.filterInput}
              value={filters.dateFrom}
              onChange={(e) => onDateFromChange(e.target.value)}
              placeholder="Du"
            />
            <span className={styles.filterSeparator}>au</span>
            <input
              type="date"
              className={styles.filterInput}
              value={filters.dateTo}
              onChange={(e) => onDateToChange(e.target.value)}
              placeholder="Au"
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <HardDrive size={14} /> Taille (Mo)
          </label>
          <div className={styles.filterRow}>
            <input
              type="number"
              className={styles.filterInput}
              value={filters.sizeMin}
              onChange={(e) => onSizeMinChange(e.target.value)}
              placeholder="Min"
              min="0"
              step="0.1"
            />
            <span className={styles.filterSeparator}>à</span>
            <input
              type="number"
              className={styles.filterInput}
              value={filters.sizeMax}
              onChange={(e) => onSizeMaxChange(e.target.value)}
              placeholder="Max"
              min="0"
              step="0.1"
            />
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>
            <FileType size={14} /> Type de fichier
          </label>
          <div className={styles.filterChips}>
            {FILE_TYPES.map((type) => (
              <button
                key={type}
                className={clsx(
                  styles.filterChip,
                  filters.fileTypes.includes(type.toLowerCase()) && styles.filterChipActive
                )}
                onClick={() => onFileTypeFilter(type)}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
