'use client';

import { XCircle, RefreshCw } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

interface PresenceErrorStateProps {
  error: string;
  onRefresh: () => void;
}

export function PresenceErrorState({ error, onRefresh }: PresenceErrorStateProps) {
  return (
    <div className="container">
      <div className={styles.errorState}>
        <XCircle size={48} className={styles.errorIcon} />
        <h2>Erreur de chargement</h2>
        <p className={styles.errorDetails}>{error}</p>
        <button onClick={onRefresh} className="btn btn-primary">
          <RefreshCw size={16} />
          Réessayer
        </button>
      </div>
    </div>
  );
}
