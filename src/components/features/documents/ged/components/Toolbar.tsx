'use client';

import { SortAsc, SortDesc, Grid, List } from 'lucide-react';
import clsx from 'clsx';
import type { SortField, SortOrder, ViewMode } from '../domain/types';
import styles from '../../../../../app/(dashboard)/documents/ged/ged.module.css';

interface ToolbarProps {
  sortField: SortField;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  hasSearchQuery: boolean;
  onSortFieldChange: (field: SortField) => void;
  onSortOrderToggle: () => void;
  onViewModeChange: (mode: ViewMode) => void;
}

export function Toolbar({
  sortField,
  sortOrder,
  viewMode,
  hasSearchQuery,
  onSortFieldChange,
  onSortOrderToggle,
  onViewModeChange,
}: ToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div className={styles.selectWrapper}>
          {sortOrder === 'asc' ? (
            <SortAsc size={16} className={styles.selectIcon} />
          ) : (
            <SortDesc size={16} className={styles.selectIcon} />
          )}
          <select
            className={styles.select}
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value as SortField)}
          >
            {hasSearchQuery && <option value="pertinence">Pertinence</option>}
            <option value="dateAjout">Date d'ajout</option>
            <option value="nom">Nom</option>
            <option value="categorie">Catégorie</option>
            <option value="taille">Taille</option>
          </select>
        </div>

        {sortField !== 'pertinence' && (
          <button
            className={styles.sortOrderBtn}
            onClick={onSortOrderToggle}
            aria-label={sortOrder === 'asc' ? 'Tri croissant' : 'Tri décroissant'}
          >
            {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
          </button>
        )}
      </div>

      <div className={styles.toolbarRight}>
        <div className={styles.viewToggle}>
          <button
            className={clsx(styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive)}
            onClick={() => onViewModeChange('grid')}
            aria-label="Vue grille"
          >
            <Grid size={18} aria-hidden="true" />
          </button>
          <button
            className={clsx(styles.viewBtn, viewMode === 'list' && styles.viewBtnActive)}
            onClick={() => onViewModeChange('list')}
            aria-label="Vue liste"
          >
            <List size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
