'use client';

import { AlertTriangle } from 'lucide-react';
import modalsStyles from '../styles/modals.module.css';

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
    <div className={modalsStyles.modalOverlay} onClick={onClose}>
      <div className={modalsStyles.warningModalContent} onClick={(e) => e.stopPropagation()}>
        <div className={modalsStyles.warningHeader}>
          <AlertTriangle size={32} color="var(--warning)" aria-hidden="true" />
          <h2 className={modalsStyles.warningTitle}>Champs non remplis</h2>
        </div>
        <p className={modalsStyles.warningDescription}>
          Les champs suivants ne sont pas encore remplis pour cette résolution :
        </p>
        <ul className={modalsStyles.warningList}>
          {missingVariables.map((varName, index) => (
            <li key={index} className={modalsStyles.warningListItem}>
              <span className={modalsStyles.warningVariable}>{varName}</span>
            </li>
          ))}
        </ul>
        <p className={modalsStyles.warningQuestion}>
          Voulez-vous continuer malgré tout ?
        </p>
        <div className={modalsStyles.modalActions}>
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
