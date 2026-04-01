'use client';

import { Search, Building2 } from 'lucide-react';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import { PortefeuilleCoproRow } from './PortefeuilleCoproRow';
import styles from '../../../app/(gestionnaire)/portefeuille/portefeuille.module.css';

interface PortefeuilleListProps {
  coproprietes: ICoproprietePortefeuille[];
  recherche: string;
  onRecherche: (value: string) => void;
  onSelectCopro: (copro: ICoproprietePortefeuille) => void;
}

export function PortefeuilleList({
  coproprietes,
  recherche,
  onRecherche,
  onSelectCopro,
}: PortefeuilleListProps) {
  return (
    <section className={styles.listSection}>
      <div className={styles.listHeader}>
        <h3 className={styles.listTitle}>
          Coproprietes
          <span className={styles.listBadge}>{coproprietes.length} UNITES</span>
        </h3>
        <div className={styles.listSearch}>
          <Search size={16} className={styles.listSearchIcon} />
          <input
            type="text"
            placeholder="Rechercher une adresse, un nom..."
            className={styles.listSearchInput}
            value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
          />
        </div>
      </div>

      {coproprietes.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} />
          <p>Aucune copropriete ne correspond a votre recherche</p>
        </div>
      ) : (
        <div className={styles.rowsContainer}>
          {coproprietes.map((copro) => (
            <PortefeuilleCoproRow
              key={copro.id}
              copro={copro}
              onSelect={onSelectCopro}
            />
          ))}
        </div>
      )}
    </section>
  );
}
