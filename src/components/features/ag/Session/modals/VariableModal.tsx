'use client';

import { Edit3 } from 'lucide-react';
import modalsStyles from '../styles/modals.module.css';

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
    <div className={modalsStyles.modalOverlay} onClick={onClose}>
      <div
        className={modalsStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={modalsStyles.modalTitle}>
          <Edit3 size={24} aria-hidden="true" />
          Définir : {variableName}
        </h2>
        <div className={modalsStyles.variableForm}>
          <label className={modalsStyles.variableLabel}>
            Valeur pour "{variableName}"
          </label>
          <input
            type="text"
            value={variableValue}
            onChange={(e) => onChange(e.target.value)}
            className={modalsStyles.variableInput}
            placeholder={`Entrez la valeur pour ${variableName}`}
            autoFocus
          />
        </div>
        <div className={modalsStyles.modalActions}>
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
