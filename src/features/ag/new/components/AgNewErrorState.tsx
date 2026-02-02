'use client';

import styles from '@/app/(dashboard)/ag/new/new-ag.module.css';

interface AgNewErrorStateProps {
  error: string;
}

export function AgNewErrorState({ error }: AgNewErrorStateProps) {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="container">
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>{error}</p>
        <button className={styles.retryButton} onClick={handleRetry}>
          Reessayer
        </button>
      </div>
    </div>
  );
}
