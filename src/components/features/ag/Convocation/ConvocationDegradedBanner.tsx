'use client';

import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import styles from './ConvocationDegradedBanner.module.css';

interface ConvocationDegradedBannerProps {
  agDataFailed: boolean;
  resolutionsFailed: boolean;
  coproprietairesFailed: boolean;
  onRetry: () => void;
  onDownloadPDF: () => void;
}

export function ConvocationDegradedBanner({
  agDataFailed,
  resolutionsFailed,
  coproprietairesFailed,
  onRetry,
  onDownloadPDF,
}: ConvocationDegradedBannerProps) {
  const issues: string[] = [];

  if (agDataFailed) {
    issues.push('informations de l\'AG');
  }
  if (resolutionsFailed) {
    issues.push('résolutions');
  }
  if (coproprietairesFailed) {
    issues.push('liste des copropriétaires');
  }

  if (issues.length === 0) {
    return null;
  }

  return (
    <div className={styles.degradedBanner}>
      <div className={styles.bannerIcon}>
        <AlertTriangle size={24} aria-hidden="true" />
      </div>

      <div className={styles.bannerContent}>
        <strong className={styles.bannerTitle}>Mode dégradé actif</strong>
        <p className={styles.bannerText}>
          Certaines données n&apos;ont pas pu être chargées : {issues.join(', ')}.
          La page reste utilisable mais certaines fonctionnalités peuvent être limitées.
        </p>
      </div>

      <div className={styles.bannerActions}>
        <button onClick={onRetry} className={styles.retryBtn}>
          <RefreshCw size={14} aria-hidden="true" />
          Réessayer
        </button>
        <button onClick={onDownloadPDF} className={styles.downloadBtn}>
          <Download size={14} aria-hidden="true" />
          PDF dégradé
        </button>
      </div>
    </div>
  );
}
