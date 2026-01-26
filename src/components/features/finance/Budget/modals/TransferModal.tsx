'use client';

import { BudgetTravaux, FondsALUR } from '../types';
import styles from '../Budget.module.css';

interface TransferModalProps {
  fondsALUR: FondsALUR;
  budgetsTravaux: BudgetTravaux[];
  onClose: () => void;
  onTransfer: (
    montant: number,
    destination: 'COMPTE_COURANT' | 'BUDGET_TRAVAUX',
    budgetId?: string
  ) => void;
}

export function TransferModal({
  fondsALUR,
  budgetsTravaux,
  onClose,
  onTransfer,
}: TransferModalProps) {
  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={styles.modalTitle}>Transfert de fonds ALUR</h2>
        <p className={styles.modalSubtitle}>
          Solde disponible : {fondsALUR.soldeActuel.toLocaleString()} €
        </p>

        <div className={styles.modalForm}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Montant à transférer</label>
            <input type="number" className={styles.input} placeholder="0" max={fondsALUR.soldeActuel} aria-label="0"/>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Destination</label>
            <select className={styles.input} aria-label="Sélectionner une option">
              <option value="COMPTE_COURANT">Compte courant</option>
              <option value="BUDGET_TRAVAUX">Budget travaux spécifique</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Budget travaux (optionnel)</label>
            <select className={styles.input} aria-label="Sélectionner une option">
              <option value="">Sélectionner...</option>
              {budgetsTravaux.map((bt) => (
                <option key={bt.id} value={bt.id}>
                  {bt.titre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} rows={3} placeholder="Motif du transfert..." aria-label="Motif du transfert..." />
          </div>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button
            onClick={() => onTransfer(5000, 'COMPTE_COURANT')}
            className="btn btn-primary"
          >
            Confirmer le transfert
          </button>
        </div>
      </div>
    </div>
  );
}
