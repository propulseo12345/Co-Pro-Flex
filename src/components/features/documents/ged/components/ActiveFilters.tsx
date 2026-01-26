'use client';

import { X } from 'lucide-react';
import type { SearchFilters } from '../domain/types';
import { getCategoryLabel } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface ActiveFiltersProps {
  filters: SearchFilters;
  onCategoryRemove: (category: string) => void;
  onDateFromClear: () => void;
  onDateToClear: () => void;
  onClearAll: () => void;
}

export function ActiveFilters({
  filters,
  onCategoryRemove,
  onDateFromClear,
  onDateToClear,
  onClearAll,
}: ActiveFiltersProps) {
  const hasFilters =
    filters.categories.length > 0 || filters.dateFrom || filters.dateTo;

  if (!hasFilters) return null;

  return (
    <div className={styles.activeFilters}>
      <span className={styles.activeFiltersLabel}>Filtres actifs :</span>
      {filters.categories.map((cat) => (
        <span key={cat} className={styles.activeFilterTag}>
          {getCategoryLabel(cat)}
          <button onClick={() => onCategoryRemove(cat)}>
            <X size={12} />
          </button>
        </span>
      ))}
      {filters.dateFrom && (
        <span className={styles.activeFilterTag}>
          Depuis {new Date(filters.dateFrom).toLocaleDateString('fr-FR')}
          <button onClick={onDateFromClear}>
            <X size={12} />
          </button>
        </span>
      )}
      {filters.dateTo && (
        <span className={styles.activeFilterTag}>
          Jusqu'au {new Date(filters.dateTo).toLocaleDateString('fr-FR')}
          <button onClick={onDateToClear}>
            <X size={12} />
          </button>
        </span>
      )}
      <button className={styles.clearAllFilters} onClick={onClearAll}>
        Tout effacer
      </button>
    </div>
  );
}
