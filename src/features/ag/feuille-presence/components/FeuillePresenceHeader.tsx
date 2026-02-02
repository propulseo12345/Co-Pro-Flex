'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/feuille-presence/feuille-presence.module.css';

interface FeuillePresenceHeaderProps {
  agTitle: string | undefined;
  isSaving: boolean;
  onBack: () => void;
}

export function FeuillePresenceHeader({ agTitle, isSaving, onBack }: FeuillePresenceHeaderProps) {
  return (
    <div className={styles.header}>
      <button onClick={onBack} className={styles.backButton}>
        <ArrowLeft size={20} aria-hidden="true" />
        Retour
      </button>
      <div>
        <h1 className={styles.title}>Feuille de présence</h1>
        <p className={styles.subtitle}>
          {agTitle || 'Assemblée Générale'}
          {isSaving && (
            <span className={styles.savingIndicator}>
              <Loader2 size={14} className={styles.spinnerSmall} /> Enregistrement...
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
