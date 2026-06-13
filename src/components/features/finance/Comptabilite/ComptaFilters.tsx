'use client';

import { Search, Calendar } from 'lucide-react';
import { TabCompta } from './types';
import { TYPE_DEPENSE_LABELS } from './data';
import styles from './Comptabilite.module.css';

interface ComptaFiltersProps {
  activeTab: TabCompta;
  searchTerm: string;
  dateDebut: string;
  dateFin: string;
  compteFilter: string;
  typeDepenseFilter: string;
  comptesUniques: string[];
  onSearchChange: (value: string) => void;
  onDateDebutChange: (value: string) => void;
  onDateFinChange: (value: string) => void;
  onCompteFilterChange: (value: string) => void;
  onTypeDepenseFilterChange: (value: string) => void;
}

export function ComptaFilters({
  activeTab,
  searchTerm,
  dateDebut,
  dateFin,
  compteFilter,
  typeDepenseFilter,
  comptesUniques,
  onSearchChange,
  onDateDebutChange,
  onDateFinChange,
  onCompteFilterChange,
  onTypeDepenseFilterChange
}: ComptaFiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.searchBox}>
        <Search size={20} aria-hidden="true" />
        <input
          type="text"
          placeholder={activeTab === 'grand-livre' ? "Rechercher par libellé ou compte..." : "Rechercher par libellé ou fournisseur..."}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.dateFilters}>
        <div className={styles.dateInput}>
          <Calendar size={16} aria-hidden="true" />
          <input
            type="date"
            value={dateDebut}
            onChange={(e) => onDateDebutChange(e.target.value)}
            placeholder="Date début"
          />
        </div>
        <span className={styles.dateSeparator}>à</span>
        <div className={styles.dateInput}>
          <Calendar size={16} aria-hidden="true" />
          <input
            type="date"
            value={dateFin}
            onChange={(e) => onDateFinChange(e.target.value)}
            placeholder="Date fin"
          />
        </div>
      </div>

      {activeTab === 'grand-livre' && (
        <select
          className={styles.filterSelect}
          value={compteFilter}
          onChange={(e) => onCompteFilterChange(e.target.value)}
        >
          <option value="TOUS">Tous les comptes</option>
          {comptesUniques.map(compte => (
            <option key={compte} value={compte}>Compte {compte}</option>
          ))}
        </select>
      )}

      {activeTab === 'compte-gestion' && (
        <select
          className={styles.filterSelect}
          value={typeDepenseFilter}
          onChange={(e) => onTypeDepenseFilterChange(e.target.value)}
        >
          <option value="TOUS">Tous les types</option>
          {Object.entries(TYPE_DEPENSE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
