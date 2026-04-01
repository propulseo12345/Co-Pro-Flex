'use client';

import { Search, Building2 } from 'lucide-react';
import type { ICoproprietePortefeuille } from '@/types/models/portefeuille';
import { PortefeuilleCoproCard } from './PortefeuilleCoproCard';
import styles from '../../../app/(dashboard)/portefeuille/portefeuille.module.css';

interface PortefeuilleGridProps {
  coproprietes: ICoproprietePortefeuille[];
  recherche: string;
  onRecherche: (value: string) => void;
  onSelectCopro: (copro: ICoproprietePortefeuille) => void;
}

export function PortefeuilleGrid({
  coproprietes,
  recherche,
  onRecherche,
  onSelectCopro,
}: PortefeuilleGridProps) {
  return (
    <div className={styles.gridSection}>
      <div className={styles.gridHeader}>
        <h2 className={styles.gridTitle}>
          Copropriétés
          <span className={styles.gridCount}>{coproprietes.length}</span>
        </h2>
        <div className={styles.gridSearch}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Rechercher une copropriété..."
            value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
          />
        </div>
      </div>

      {coproprietes.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 size={48} />
          <p>Aucune copropriété ne correspond à votre recherche</p>
        </div>
      ) : (
        <div className={styles.coproGrid}>
          {coproprietes.map((copro) => (
            <PortefeuilleCoproCard
              key={copro.id}
              copro={copro}
              onSelect={onSelectCopro}
            />
          ))}
        </div>
      )}
    </div>
  );
}
