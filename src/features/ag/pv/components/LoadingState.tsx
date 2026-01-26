'use client';

import { Loader2 } from 'lucide-react';
import styles from '../../../../app/(dashboard)/ag/[id]/pv/pv.module.css';

interface LoadingStateProps {
  message: string;
  hint?: string;
}

export function LoadingState({ message, hint }: LoadingStateProps) {
  return (
    <div className="container">
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={32} />
        <p>{message}</p>
        {hint && (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>{hint}</p>
        )}
      </div>
    </div>
  );
}
