'use client';

import { Loader2 } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/preparation/preparation.module.css';

export function PreparationLoadingState() {
  return (
    <div className="container">
      <div className={styles.loadingContainer}>
        <Loader2 size={32} className={styles.spinner} aria-hidden="true" />
        <p>Verification des prerequis...</p>
      </div>
    </div>
  );
}
