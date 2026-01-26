'use client';

import { Edit3 } from 'lucide-react';
import styles from '../Session.module.css';

interface VariableModalProps {
  variableName: string;
  variableValue: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export function VariableModal({
  variableName,
  variableValue,
  onChange,
  onClose,
  onSave
}: VariableModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.modalTitle}>
          <Edit3 size={24} aria-hidden="true" />
          Définir : {variableName}
        </h2>
        <div className={styles.variableForm}>
          <label className={styles.variableLabel}>
            Valeur pour "{variableName}"
          </label>
          <input
            type="text"
            value={variableValue}
            onChange={(e) => onChange(e.target.value)}
            className={styles.variableInput}
            placeholder={`Entrez la valeur pour ${variableName}`}
            autoFocus
          />
        </div>
        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={onSave} className="btn btn-primary">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
