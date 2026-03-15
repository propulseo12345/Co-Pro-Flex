'use client';

import { Search } from 'lucide-react';
import type { GrandLivreViewMode } from './types';
import styles from './ComptaViewSwitcher.module.css';

interface ComptaViewSwitcherProps {
  viewMode: GrandLivreViewMode;
  onViewModeChange: (mode: GrandLivreViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  compteFilter: string;
  onCompteFilterChange: (value: string) => void;
  comptesUniques: string[];
  dateFilter: string;
  onDateFilterChange: (value: string) => void;
}

const VIEW_MODES: { id: GrandLivreViewMode; label: string }[] = [
  { id: 'par-compte', label: 'Par compte' },
  { id: 'chronologique', label: 'Chronologique' },
  { id: 'par-journal', label: 'Par journal' },
];

export function ComptaViewSwitcher({
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  compteFilter,
  onCompteFilterChange,
  comptesUniques,
  dateFilter,
  onDateFilterChange,
}: ComptaViewSwitcherProps) {
  return (
    <div className={styles.viewBar}>
      <div className={styles.viewModes}>
        {VIEW_MODES.map((mode) => (
          <button
            key={mode.id}
            className={`${styles.viewMode} ${viewMode === mode.id ? styles.active : ''}`}
            onClick={() => onViewModeChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <div className={styles.searchInput}>
          <Search size={14} />
          <input
            type="text"
            placeholder="Rechercher libellé, compte..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={compteFilter}
          onChange={(e) => onCompteFilterChange(e.target.value)}
        >
          <option value="TOUS">Tous les comptes</option>
          {comptesUniques.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className={styles.filterSelect}
          value={dateFilter}
          onChange={(e) => onDateFilterChange(e.target.value)}
        >
          <option value="">Toutes les dates</option>
          <option value="T1">T1 (Jan-Mar)</option>
          <option value="T2">T2 (Avr-Jun)</option>
          <option value="T3">T3 (Jul-Sep)</option>
          <option value="T4">T4 (Oct-Déc)</option>
        </select>
      </div>
    </div>
  );
}
