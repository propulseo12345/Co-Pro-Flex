'use client';

import { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { StatutOrdreService, TypeOrdreService } from '@/types';
import { getStatutLabel, getTypeLabel } from '@/lib/utils/service-order';
import styles from './FilterBar.module.css';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statutFilter: StatutOrdreService | 'TOUS';
  onStatutFilterChange: (value: StatutOrdreService | 'TOUS') => void;
  typeFilter: TypeOrdreService | 'TOUS';
  onTypeFilterChange: (value: TypeOrdreService | 'TOUS') => void;
  fournisseurFilter: string;
  onFournisseurFilterChange: (value: string) => void;
  fournisseurs: Array<{ id: string; nom: string }>;
  onClearFilters: () => void;
}

const STATUTS: Array<StatutOrdreService | 'TOUS'> = [
  'TOUS',
  'BROUILLON',
  'ENVOYE',
  'EN_ATTENTE_PRESTATAIRE',
  'INTERVENTION_PROGRAMMEE',
  'INTERVENTION_REALISEE',
  'CLOTURE'
];

const TYPES: Array<TypeOrdreService | 'TOUS'> = ['TOUS', 'CLASSIQUE', 'CONTRACTUEL'];

export default function FilterBar({
  searchTerm,
  onSearchChange,
  statutFilter,
  onStatutFilterChange,
  typeFilter,
  onTypeFilterChange,
  fournisseurFilter,
  onFournisseurFilterChange,
  fournisseurs,
  onClearFilters
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    statutFilter !== 'TOUS',
    typeFilter !== 'TOUS',
    fournisseurFilter !== 'TOUS',
    searchTerm.trim() !== ''
  ].filter(Boolean).length;

  return (
    <div className={styles.container}>
      <div className={styles.mainRow}>
        {/* Search box */}
        <div className={styles.searchBox}>
          <Search size={20} aria-hidden="true" />
          <input type="text" placeholder="Rechercher par titre, description ou fournisseur..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className={styles.clearButton}
              aria-label="Effacer la recherche"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter toggle button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={styles.filterToggle}
        >
          <Filter size={18} aria-hidden="true" />
          Filtres
          {activeFiltersCount > 0 && (
            <span className={styles.filterBadge}>{activeFiltersCount}</span>
          )}
        </button>

        {/* Clear all button */}
        {activeFiltersCount > 0 && (
          <button onClick={onClearFilters} className={styles.clearAllButton}>
            <X size={16} aria-hidden="true" />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          {/* Statut filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="statut-filter" className={styles.filterLabel}>
              Statut
            </label>
            <select
              id="statut-filter"
              value={statutFilter}
              onChange={(e) =>
                onStatutFilterChange(e.target.value as StatutOrdreService | 'TOUS')
              }
              className={styles.filterSelect}
            >
              {STATUTS.map((statut) => (
                <option key={statut} value={statut}>
                  {statut === 'TOUS' ? 'Tous les statuts' : getStatutLabel(statut)}
                </option>
              ))}
            </select>
          </div>

          {/* Type filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="type-filter" className={styles.filterLabel}>
              Type
            </label>
            <select
              id="type-filter"
              value={typeFilter}
              onChange={(e) =>
                onTypeFilterChange(e.target.value as TypeOrdreService | 'TOUS')
              }
              className={styles.filterSelect}
            >
              {TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'TOUS' ? 'Tous les types' : getTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Fournisseur filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="fournisseur-filter" className={styles.filterLabel}>
              Fournisseur
            </label>
            <select
              id="fournisseur-filter"
              value={fournisseurFilter}
              onChange={(e) => onFournisseurFilterChange(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="TOUS">Tous les fournisseurs</option>
              {fournisseurs.map((fournisseur) => (
                <option key={fournisseur.id} value={fournisseur.id}>
                  {fournisseur.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
