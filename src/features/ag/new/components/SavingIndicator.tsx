'use client';

import styles from '@/app/(dashboard)/ag/new/new-ag.module.css';

export function SavingIndicator() {
  return (
    <div className={styles.savingIndicator}>
      <span className={styles.savingDot} />
      Sauvegarde en cours...
    </div>
  );
}
