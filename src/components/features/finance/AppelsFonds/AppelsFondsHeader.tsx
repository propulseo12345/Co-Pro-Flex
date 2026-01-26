'use client';

import { Plus } from 'lucide-react';
import styles from './appels-fonds.module.css';

interface AppelsFondsHeaderProps {
  onNewAppel: () => void;
}

export function AppelsFondsHeader({ onNewAppel }: AppelsFondsHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Appels de fonds</h1>
        <p className={styles.subtitle}>Gestion des appels de fonds et répartition par copropriétaire</p>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.addButton} onClick={onNewAppel}>
          <Plus size={20} aria-hidden="true" />
          Nouvel appel de fonds
        </button>
      </div>
    </div>
  );
}
