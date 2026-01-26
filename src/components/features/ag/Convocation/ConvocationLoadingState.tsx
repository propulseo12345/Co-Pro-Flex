'use client';

import { Loader2 } from 'lucide-react';
import styles from './ConvocationLoadingState.module.css';

interface ConvocationLoadingStateProps {
  message?: string;
}

export function ConvocationLoadingState({
  message = 'Chargement de la convocation...',
}: ConvocationLoadingStateProps) {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingCard}>
        <div className={styles.spinner}>
          <Loader2 size={40} className={styles.spinnerIcon} aria-hidden="true" />
        </div>
        <p className={styles.loadingMessage}>{message}</p>
        <p className={styles.loadingHint}>
          Cette opération peut prendre quelques secondes.
        </p>
      </div>
    </div>
  );
}
