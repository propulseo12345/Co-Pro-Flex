'use client';

import { Search, Filter, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { CLASSES_COMPTABLES } from '@/components/features/finance/Comptabilite/utils';
import styles from '@/app/(dashboard)/documents/balance/balance.module.css';

interface BalanceFiltersProps {
  searchTerm: string;
  classeFilter: string;
  masquerSoldesNuls: boolean;
  showComparison: boolean;
  onSearchChange: (value: string) => void;
  onClasseFilterChange: (value: string) => void;
  onToggleSoldesNuls: () => void;
  onToggleComparison: () => void;
}

export function BalanceFilters({
  searchTerm,
  classeFilter,
  masquerSoldesNuls,
  showComparison,
  onSearchChange,
  onClasseFilterChange,
  onToggleSoldesNuls,
  onToggleComparison,
}: BalanceFiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.searchBox}>
        <Search size={18} aria-hidden="true" />
        <input
          type="text"
          placeholder="Rechercher un compte..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.filterGroup}>
        <Filter size={16} aria-hidden="true" />
        <select
          value={classeFilter}
          onChange={(e) => onClasseFilterChange(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="TOUTES">Toutes les classes</option>
          {Object.entries(CLASSES_COMPTABLES).map(([classe, label]) => (
            <option key={classe} value={classe}>{label}</option>
          ))}
        </select>
      </div>

      <button
        className={`${styles.toggleButton} ${masquerSoldesNuls ? styles.active : ''}`}
        onClick={onToggleSoldesNuls}
        title={masquerSoldesNuls ? 'Afficher tous les comptes' : 'Masquer les comptes à solde nul'}
      >
        {masquerSoldesNuls ? <Eye size={16} /> : <EyeOff size={16} />}
        {masquerSoldesNuls ? 'Afficher soldes nuls' : 'Masquer soldes nuls'}
      </button>

      <button
        className={`${styles.toggleButton} ${showComparison ? styles.active : ''}`}
        onClick={onToggleComparison}
        title={showComparison ? 'Masquer la comparaison N-1' : 'Afficher la comparaison N-1'}
      >
        <TrendingUp size={16} />
        {showComparison ? 'Masquer N-1' : 'Afficher N-1'}
      </button>
    </div>
  );
}
