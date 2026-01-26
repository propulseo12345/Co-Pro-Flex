'use client';

import { Search } from 'lucide-react';
import type { StatutAppel, TypeAppel } from './types';
import styles from './appels-fonds.module.css';

interface AppelsFondsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statutFilter: 'TOUS' | StatutAppel;
  onStatutChange: (value: 'TOUS' | StatutAppel) => void;
  typeFilter: 'TOUS' | TypeAppel;
  onTypeChange: (value: 'TOUS' | TypeAppel) => void;
}

export function AppelsFondsFilters({
  searchTerm,
  onSearchChange,
  statutFilter,
  onStatutChange,
  typeFilter,
  onTypeChange,
}: AppelsFondsFiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.searchBox}>
        <Search size={20} aria-hidden="true" />
        <input type="text" placeholder="Rechercher par description, période ou montant..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.filterGroups}>
        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Statut</span>
          <div className={styles.filterButtons}>
            <button
              className={`${styles.filterButton} ${statutFilter === 'TOUS' ? styles.filterButtonActive : ''}`}
              onClick={() => onStatutChange('TOUS')}
            >
              Tous
            </button>
            <button
              className={`${styles.filterButton} ${statutFilter === 'A_GENERER' ? styles.filterButtonActive : ''}`}
              onClick={() => onStatutChange('A_GENERER')}
            >
              À générer
            </button>
            <button
              className={`${styles.filterButton} ${statutFilter === 'EN_PREPARATION' ? styles.filterButtonActive : ''}`}
              onClick={() => onStatutChange('EN_PREPARATION')}
            >
              En préparation
            </button>
            <button
              className={`${styles.filterButton} ${statutFilter === 'ENVOYE' ? styles.filterButtonActive : ''}`}
              onClick={() => onStatutChange('ENVOYE')}
            >
              Envoyés
            </button>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.filterGroupLabel}>Type</span>
          <div className={styles.filterButtons}>
            <button
              className={`${styles.filterButton} ${typeFilter === 'TOUS' ? styles.filterButtonActive : ''}`}
              onClick={() => onTypeChange('TOUS')}
            >
              Tous
            </button>
            <button
              className={`${styles.filterButton} ${typeFilter === 'fonctionnement' ? styles.filterButtonActive : ''}`}
              onClick={() => onTypeChange('fonctionnement')}
            >
              Fonctionnement
            </button>
            <button
              className={`${styles.filterButton} ${typeFilter === 'travaux' ? styles.filterButtonActive : ''}`}
              onClick={() => onTypeChange('travaux')}
            >
              Travaux
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
