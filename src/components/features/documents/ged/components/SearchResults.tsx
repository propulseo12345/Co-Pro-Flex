'use client';

import { X } from 'lucide-react';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface SearchResultsProps {
  count: number;
  query: string;
  onClear: () => void;
}

export function SearchResults({ count, query, onClear }: SearchResultsProps) {
  return (
    <div className={styles.searchResults}>
      <div className={styles.searchResultsHeader}>
        <span className={styles.searchResultsCount}>
          {count} résultat{count > 1 ? 's' : ''} pour "{query}"
        </span>
        <button className={styles.searchResultsClear} onClick={onClear}>
          <X size={14} /> Effacer la recherche
        </button>
      </div>
    </div>
  );
}
