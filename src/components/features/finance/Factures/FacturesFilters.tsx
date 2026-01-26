'use client';

import { Search, ArrowDown, ArrowUp, Building2, Calendar, X } from 'lucide-react';
import { StatutFacture } from './types';
import styles from './Factures.module.css';

type StatutFilterValue = 'TOUS' | StatutFacture;

interface FacturesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statutFilter: StatutFilterValue;
  onStatutFilterChange: (value: StatutFilterValue) => void;
  sortOrder: 'DESC' | 'ASC';
  onSortOrderChange: () => void;
  fournisseurFilter?: string;
  onFournisseurFilterChange?: (value: string) => void;
  fournisseurs?: string[];
  periodeFilter?: { debut: string; fin: string } | null;
  onPeriodeFilterChange?: (value: { debut: string; fin: string } | null) => void;
}

export function FacturesFilters({
  searchTerm,
  onSearchChange,
  statutFilter,
  onStatutFilterChange,
  sortOrder,
  onSortOrderChange,
  fournisseurFilter,
  onFournisseurFilterChange,
  fournisseurs = [],
  periodeFilter,
  onPeriodeFilterChange,
}: FacturesFiltersProps) {
  const hasActiveFilters = statutFilter !== 'TOUS' || fournisseurFilter || periodeFilter || searchTerm;

  const handleClearFilters = () => {
    onStatutFilterChange('TOUS');
    onFournisseurFilterChange?.('');
    onPeriodeFilterChange?.(null);
    onSearchChange('');
  };

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.filtersRow}>
        {/* Recherche */}
        <div className={styles.searchBox}>
          <Search size={18} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par fournisseur, référence..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              className={styles.clearSearch}
              onClick={() => onSearchChange('')}
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtre par fournisseur */}
        {onFournisseurFilterChange && fournisseurs.length > 0 && (
          <div className={styles.filterSelect}>
            <Building2 size={16} aria-hidden="true" />
            <select
              value={fournisseurFilter || ''}
              onChange={(e) => onFournisseurFilterChange(e.target.value)}
            >
              <option value="">Tous les fournisseurs</option>
              {fournisseurs.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filtre par période */}
        {onPeriodeFilterChange && (
          <div className={styles.filterPeriode}>
            <Calendar size={16} aria-hidden="true" />
            <input
              type="date"
              value={periodeFilter?.debut || ''}
              onChange={(e) => onPeriodeFilterChange(e.target.value ? { debut: e.target.value, fin: periodeFilter?.fin || '' } : null)}
              placeholder="Du"
            />
            <span className={styles.periodeSeparator}>→</span>
            <input
              type="date"
              value={periodeFilter?.fin || ''}
              onChange={(e) => onPeriodeFilterChange(periodeFilter?.debut ? { ...periodeFilter, fin: e.target.value } : null)}
              placeholder="Au"
            />
          </div>
        )}

        {/* Actions */}
        <div className={styles.filterActions}>
          <button
            className={styles.sortButton}
            onClick={onSortOrderChange}
            title={sortOrder === 'DESC' ? 'Du plus récent au plus ancien' : 'Du plus ancien au plus récent'}
          >
            {sortOrder === 'DESC' ? <ArrowDown size={16} aria-hidden="true" /> : <ArrowUp size={16} aria-hidden="true" />}
            <span>{sortOrder === 'DESC' ? 'Récent' : 'Ancien'}</span>
          </button>

          {hasActiveFilters && (
            <button
              className={styles.clearFiltersButton}
              onClick={handleClearFilters}
              title="Réinitialiser les filtres"
            >
              <X size={14} aria-hidden="true" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Indicateur de filtre actif */}
      {(statutFilter !== 'TOUS' || fournisseurFilter || periodeFilter) && (
        <div className={styles.activeFiltersRow}>
          {statutFilter !== 'TOUS' && (
            <span className={styles.activeFilterTag}>
              Statut: {statutFilter.replace('_', ' ')}
              <button onClick={() => onStatutFilterChange('TOUS')} aria-label="Supprimer le filtre statut">
                <X size={12} />
              </button>
            </span>
          )}
          {fournisseurFilter && (
            <span className={styles.activeFilterTag}>
              {fournisseurFilter}
              <button onClick={() => onFournisseurFilterChange?.('')} aria-label="Supprimer le filtre fournisseur">
                <X size={12} />
              </button>
            </span>
          )}
          {periodeFilter && (
            <span className={styles.activeFilterTag}>
              {periodeFilter.debut} → {periodeFilter.fin || '...'}
              <button onClick={() => onPeriodeFilterChange?.(null)} aria-label="Supprimer le filtre période">
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
