'use client';

import { Download, Upload, RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/finance/mouvements-bancaires/mouvements-bancaires.module.css';

interface PageHeaderProps {
  isRefreshing: boolean;
  isSyncing: boolean;
  onDownloadRIB: () => void;
  onImportClick: () => void;
  onRefresh: () => void;
}

export function PageHeader({
  isRefreshing,
  isSyncing,
  onDownloadRIB,
  onImportClick,
  onRefresh,
}: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Mouvements bancaires</h1>
        <p className={styles.subtitle}>Suivi en temps réel de vos comptes bancaires</p>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.downloadRibButton} onClick={onDownloadRIB}>
          <Download size={18} aria-hidden="true" />
          Télécharger RIB
        </button>
        <button
          className={styles.importButton}
          onClick={onImportClick}
          title="Importer un fichier bancaire (CSV, OFX, QIF)"
        >
          <Upload size={18} aria-hidden="true" />
          Import manuel
        </button>
        <button
          className={styles.refreshButton}
          onClick={onRefresh}
          disabled={isRefreshing || isSyncing}
        >
          <RefreshCw size={18} className={isRefreshing ? styles.spinning : ''} aria-hidden="true" />
          {isRefreshing ? 'Synchronisation...' : 'Synchroniser'}
        </button>
      </div>
    </div>
  );
}
