'use client';

import styles from '@/app/(dashboard)/ag/new/new-ag.module.css';

export function AgNewLoadingState() {
  return (
    <div className="container">
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Chargement du brouillon...</p>
      </div>
    </div>
  );
}
