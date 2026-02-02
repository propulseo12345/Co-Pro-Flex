'use client';

import { Loader2 } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

export function LoadingState() {
  return (
    <div className="container">
      <div className={styles.loadingState}>
        <Loader2 className={styles.loadingSpinner} size={32} />
        <p>Chargement des ventes...</p>
      </div>
    </div>
  );
}
