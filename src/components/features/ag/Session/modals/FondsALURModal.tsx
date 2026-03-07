'use client';

import { useState } from 'react';
import { Building2 } from 'lucide-react';
import modalsStyles from '../styles/modals.module.css';
import styles from './FondsALURModal.module.css';

interface FondsALURModalProps {
  currentPourcentage: string;
  currentBudget: string;
  onClose: () => void;
  onSave: (pourcentage: string, montant: string) => void;
}

export function FondsALURModal({
  currentPourcentage,
  currentBudget,
  onClose,
  onSave,
}: FondsALURModalProps) {
  const [pourcentage, setPourcentage] = useState(currentPourcentage || '');
  const [budget, setBudget] = useState(currentBudget || '');

  const pct = parseFloat(pourcentage);
  const bgt = parseFloat(budget);
  const montantCalc = !isNaN(pct) && !isNaN(bgt) && bgt > 0 ? (bgt * pct) / 100 : null;

  const montantFormate = montantCalc !== null
    ? new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(montantCalc)
    : null;

  const handleSave = () => {
    if (!pourcentage || montantCalc === null) return;
    onSave(pourcentage, montantFormate!);
  };

  return (
    <div className={modalsStyles.modalOverlay} onClick={onClose}>
      <div
        className={modalsStyles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alur-modal-title"
      >
        <h2 className={modalsStyles.modalTitle} id="alur-modal-title">
          <Building2 size={24} aria-hidden="true" />
          Fonds de travaux (loi ALUR)
        </h2>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="budget-input">
              Budget prévisionnel de l'exercice (€) <span className={styles.required}>*</span>
            </label>
            <input
              id="budget-input"
              type="number"
              min="0"
              step="100"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={styles.input}
              placeholder="ex: 45000"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="pct-input">
              Pourcentage de provisionnement (%) <span className={styles.required}>*</span>
            </label>
            <div className={styles.inputWithSuffix}>
              <input
                id="pct-input"
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={pourcentage}
                onChange={(e) => setPourcentage(e.target.value)}
                className={styles.input}
                placeholder="ex: 5"
              />
              <span className={styles.suffix}>%</span>
            </div>
          </div>

          <div className={styles.result}>
            <span className={styles.resultLabel}>Montant du fonds de travaux :</span>
            <span className={styles.resultValue}>
              {montantFormate !== null ? `${montantFormate} €` : '—'}
            </span>
          </div>
        </div>

        <div className={modalsStyles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            ✕ Annuler
          </button>
          <button
            onClick={handleSave}
            className="btn btn-primary"
            disabled={!pourcentage || montantCalc === null}
          >
            ✓ Valider
          </button>
        </div>
      </div>
    </div>
  );
}
