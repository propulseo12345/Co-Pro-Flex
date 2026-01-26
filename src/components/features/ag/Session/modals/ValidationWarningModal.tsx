'use client';

import { AlertTriangle } from 'lucide-react';
import styles from '../Session.module.css';

interface ValidationWarningModalProps {
  missingVariables: string[];
  onClose: () => void;
  onConfirmContinue: () => void;
}

export function ValidationWarningModal({
  missingVariables,
  onClose,
  onConfirmContinue
}: ValidationWarningModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.warningModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.warningHeader}>
          <AlertTriangle size={32} color="var(--warning)" aria-hidden="true" />
          <h2 className={styles.warningTitle}>Champs non remplis</h2>
        </div>
        <p className={styles.warningDescription}>
          Les champs suivants ne sont pas encore remplis pour cette résolution :
        </p>
        <ul className={styles.warningList}>
          {missingVariables.map((varName, index) => (
            <li key={index} className={styles.warningListItem}>
              <span className={styles.warningVariable}>{varName}</span>
            </li>
          ))}
        </ul>
        <p className={styles.warningQuestion}>
          Voulez-vous continuer malgré tout ?
        </p>
        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-primary">
            Remplir les champs
          </button>
          <button onClick={onConfirmContinue} className="btn btn-secondary">
            Continuer quand même
          </button>
        </div>
      </div>
    </div>
  );
}
