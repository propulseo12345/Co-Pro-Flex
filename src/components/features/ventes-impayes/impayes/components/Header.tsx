'use client';

import { Download, Send } from 'lucide-react';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface HeaderProps {
  selectedCount: number;
  onExport: () => void;
  onRelancesGroupees: () => void;
}

export function Header({ selectedCount, onExport, onRelancesGroupees }: HeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Gestion des Impayés</h1>
        <p className={styles.subtitle}>Suivez et gérez les impayés avec le workflow de relances</p>
      </div>
      <div className={styles.headerActions}>
        <button className="btn btn-secondary" onClick={onExport}>
          <Download size={16} aria-hidden="true" />
          Exporter
        </button>
        <button className="btn btn-primary" onClick={onRelancesGroupees} disabled={selectedCount === 0}>
          <Send size={16} aria-hidden="true" />
          Relances groupées {selectedCount > 0 && `(${selectedCount})`}
        </button>
      </div>
    </div>
  );
}
