'use client';

import { ArrowLeft } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface PageHeaderProps {
  onBack: () => void;
}

export function PageHeader({ onBack }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour a l'ordre du jour
      </button>
      <div>
        <h1 className={styles.title}>Nouvelle resolution</h1>
      </div>
    </div>
  );
}
