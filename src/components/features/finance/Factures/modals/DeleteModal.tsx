'use client';

import { X, Trash2, AlertCircle } from 'lucide-react';
import { Facture } from '../types';
import { formatCurrency } from '../utils';
import styles from '../Factures.module.css';

interface DeleteModalProps {
  facture: Facture;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteModal({ facture, onClose, onConfirm }: DeleteModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="delete-modal-title" className={styles.modalTitle}>Confirmer la suppression</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.deleteWarning}>
            <AlertCircle size={48} aria-hidden="true" />
            <p>Êtes-vous sûr de vouloir supprimer cette facture ?</p>
          </div>

          <div className={styles.deleteDetails}>
            <div className={styles.deleteRow}>
              <span className={styles.deleteLabel}>Référence</span>
              <span className={styles.deleteValue}>{facture.reference}</span>
            </div>
            <div className={styles.deleteRow}>
              <span className={styles.deleteLabel}>Fournisseur</span>
              <span className={styles.deleteValue}>{facture.fournisseur}</span>
            </div>
            <div className={styles.deleteRow}>
              <span className={styles.deleteLabel}>Montant</span>
              <span className={styles.deleteValue}>{formatCurrency(facture.montant)}</span>
            </div>
          </div>

          <p className={styles.deleteWarningText}>
            Cette action est irréversible.
          </p>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.deleteButton} onClick={onConfirm}>
            <Trash2 size={20} aria-hidden="true" />
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}
