'use client';

import { ArrowLeft } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/preparation/preparation.module.css';

interface PreparationHeaderProps {
  onGoBack: () => void;
}

export function PreparationHeader({ onGoBack }: PreparationHeaderProps) {
  return (
    <div className={styles.header}>
      <button onClick={onGoBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour
      </button>
      <div className={styles.headerContent}>
        <h1 className={styles.title}>Votes par correspondance &amp; Pouvoirs</h1>
        <p className={styles.subtitle}>
          Saisissez les votes par correspondance et enregistrez les pouvoirs avant la séance
        </p>
      </div>
    </div>
  );
}
