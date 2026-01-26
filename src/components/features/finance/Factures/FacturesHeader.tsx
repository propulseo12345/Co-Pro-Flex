'use client';

import { Plus } from 'lucide-react';
import styles from './Factures.module.css';

interface FacturesHeaderProps {
  onNewFacture: () => void;
}

export function FacturesHeader({ onNewFacture }: FacturesHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Factures</h1>
        <p className={styles.subtitle}>Gestion des factures fournisseurs</p>
      </div>
      <div className={styles.headerActions}>
        <button
          className={styles.addButton}
          onClick={onNewFacture}
        >
          <Plus size={20} aria-hidden="true" />
          Nouvelle facture
        </button>
      </div>
    </div>
  );
}
