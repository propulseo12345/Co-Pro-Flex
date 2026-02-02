'use client';

import { RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/tantiemes/tantiemes.module.css';

interface TantiemesHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export function TantiemesHeader({ isLoading, onRefresh }: TantiemesHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Tantièmes et clés de répartition</h1>
        <p className={styles.subtitle}>
          Gestion de la répartition des charges et pondération des votes en AG
        </p>
      </div>
      <button
        className="btn btn-secondary"
        onClick={onRefresh}
        disabled={isLoading}
        title="Rafraîchir"
      >
        <RefreshCw size={16} className={isLoading ? styles.spinning : ''} aria-hidden="true" />
      </button>
    </div>
  );
}
