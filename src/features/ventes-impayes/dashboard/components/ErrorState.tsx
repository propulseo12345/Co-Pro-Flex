'use client';

import { AlertTriangle } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes-impayes.module.css';

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="container">
      <div className={styles.errorState}>
        <AlertTriangle size={32} />
        <p>Erreur: {error}</p>
      </div>
    </div>
  );
}
