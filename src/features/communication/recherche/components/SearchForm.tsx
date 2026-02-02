'use client';

import { Search, X } from 'lucide-react';
import type { ResultType } from '../hooks/useRecherchePage';
import styles from '@/app/(dashboard)/communication/recherche/recherche.module.css';

interface SearchFormProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedType: string;
  onTypeChange: (value: string) => void;
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
  authorFilter: string;
  onAuthorFilterChange: (value: string) => void;
  resultTypes: ResultType[];
  onSubmit: (e: React.FormEvent) => void;
  onClearFilters: () => void;
}

export function SearchForm({
  searchQuery,
  onSearchQueryChange,
  selectedType,
  onTypeChange,
  dateFilter,
  onDateFilterChange,
  authorFilter,
  onAuthorFilterChange,
  resultTypes,
  onSubmit,
  onClearFilters,
}: SearchFormProps) {
  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <form onSubmit={onSubmit} className={styles.searchForm}>
        <div className={styles.mainSearch}>
          <Search size={20} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par mot-clé, titre, contenu, auteur..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => onSearchQueryChange('')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Type</label>
            <select
              className={styles.select}
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              {resultTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Date</label>
            <select
              className={styles.select}
              value={dateFilter}
              onChange={(e) => onDateFilterChange(e.target.value)}
            >
              <option value="all">Toutes les dates</option>
              <option value="today">Aujourd&apos;hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Auteur</label>
            <input
              type="text"
              placeholder="Filtrer par auteur"
              className={styles.select}
              value={authorFilter}
              onChange={(e) => onAuthorFilterChange(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClearFilters}
            style={{ marginTop: '1.5rem' }}
          >
            <X size={16} style={{ marginRight: 6 }} aria-hidden="true" />
            Effacer
          </button>
        </div>
      </form>
    </div>
  );
}
