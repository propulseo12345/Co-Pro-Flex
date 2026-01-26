'use client';

import { Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import type { StatutRapprochement, RapprochementStats } from '../domain/types';
import styles from '../../../../app/(dashboard)/finance/rapprochement-bancaire/rapprochement-bancaire.module.css';

interface FiltersProps {
  searchTerm: string;
  filtreStatut: 'TOUS' | StatutRapprochement;
  stats: RapprochementStats;
  onSearchChange: (value: string) => void;
  onFiltreChange: (filtre: 'TOUS' | StatutRapprochement) => void;
}

export function Filters({
  searchTerm,
  filtreStatut,
  stats,
  onSearchChange,
  onFiltreChange,
}: FiltersProps) {
  return (
    <div className={styles.filters}>
      <div className={styles.searchBox}>
        <Search size={20} />
        <input
          type="text"
          placeholder="Rechercher par libellé..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.filterButtons}>
        <button
          className={`${styles.filterButton} ${filtreStatut === 'TOUS' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltreChange('TOUS')}
        >
          Tous ({stats.total})
        </button>
        <button
          className={`${styles.filterButton} ${filtreStatut === 'RAPPROCHE' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltreChange('RAPPROCHE')}
        >
          <CheckCircle size={16} />
          Rapprochés ({stats.rapprochees})
        </button>
        <button
          className={`${styles.filterButton} ${filtreStatut === 'NON_RAPPROCHE' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltreChange('NON_RAPPROCHE')}
        >
          <XCircle size={16} />
          Non rapprochés ({stats.dansReleveUniquement + stats.dansLogicielUniquement})
        </button>
        <button
          className={`${styles.filterButton} ${filtreStatut === 'ECART' ? styles.filterButtonActive : ''}`}
          onClick={() => onFiltreChange('ECART')}
        >
          <AlertTriangle size={16} />
          Écarts
        </button>
      </div>
    </div>
  );
}
