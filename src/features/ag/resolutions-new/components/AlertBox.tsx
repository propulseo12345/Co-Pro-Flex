'use client';

import { AlertTriangle } from 'lucide-react';
import styles from '@/app/(dashboard)/ag/[id]/resolutions/new/new-resolution.module.css';

interface AlertBoxProps {
  onClose: () => void;
}

export function AlertBox({ onClose }: AlertBoxProps) {
  return (
    <div className={styles.alertBox}>
      <AlertTriangle size={20} className={styles.alertIcon} aria-hidden="true" />
      <div className={styles.alertContent}>
        <strong>Important</strong>
        <p>
          Pour les votes de <strong>budget courant ou de travaux</strong>, veuillez utiliser les resolutions deja creees par Matera de vote de budget courant et de vote de travaux.
        </p>
      </div>
      <button
        onClick={onClose}
        className={styles.alertClose}
        aria-label="Fermer l'alerte"
      >
        x
      </button>
    </div>
  );
}
