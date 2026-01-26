'use client';

import { AlertCircle, RefreshCw, ArrowLeft, Download } from 'lucide-react';
import styles from './ConvocationErrorState.module.css';

interface ConvocationErrorStateProps {
  errorCode: string;
  errorMessage: string;
  errorDetails?: string;
  onRetry: () => void;
  onGoBack: () => void;
  onDownloadPDF?: () => void;
  showDegradedOptions?: boolean;
}

export function ConvocationErrorState({
  errorCode,
  errorMessage,
  errorDetails,
  onRetry,
  onGoBack,
  onDownloadPDF,
  showDegradedOptions = false,
}: ConvocationErrorStateProps) {
  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorCard}>
        <div className={styles.errorIcon}>
          <AlertCircle size={48} aria-hidden="true" />
        </div>

        <h2 className={styles.errorTitle}>{errorMessage}</h2>

        {errorDetails && (
          <p className={styles.errorDetails}>{errorDetails}</p>
        )}

        <div className={styles.errorCode}>
          Code erreur : <code>{errorCode}</code>
        </div>

        <div className={styles.errorActions}>
          <button onClick={onRetry} className={styles.retryButton}>
            <RefreshCw size={16} aria-hidden="true" />
            Réessayer
          </button>

          <button onClick={onGoBack} className={styles.backButton}>
            <ArrowLeft size={16} aria-hidden="true" />
            Retour aux AG
          </button>
        </div>

        {showDegradedOptions && onDownloadPDF && (
          <div className={styles.degradedSection}>
            <p className={styles.degradedText}>
              Mode dégradé disponible : vous pouvez télécharger le PDF même si
              certaines données ne sont pas chargées.
            </p>
            <button onClick={onDownloadPDF} className={styles.downloadButton}>
              <Download size={16} aria-hidden="true" />
              Télécharger le PDF (mode dégradé)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
