'use client';

import { Search } from 'lucide-react';
import type { EligibleOwner } from '@/lib/ag/correspondence';
import { OwnerCard } from './OwnerCard';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/votes-correspondance.module.css';

interface OwnersPanelProps {
  owners: EligibleOwner[];
  selectedOwnerId: string | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectOwner: (owner: EligibleOwner) => void;
}

export function OwnersPanel({
  owners,
  selectedOwnerId,
  searchTerm,
  onSearchChange,
  onSelectOwner,
}: OwnersPanelProps) {
  return (
    <div className={styles.ownersPanel}>
      <div className={styles.panelHeader}>
        <h2>Coproprietaires</h2>
        <span className={styles.ownerCount}>{owners.length}</span>
      </div>

      <div className={styles.searchBox}>
        <Search size={16} />
        <input
          type="text"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.ownersList}>
        {owners.map((owner) => (
          <OwnerCard
            key={owner.id}
            owner={owner}
            selected={selectedOwnerId === owner.id}
            onClick={() => onSelectOwner(owner)}
          />
        ))}
      </div>
    </div>
  );
}
