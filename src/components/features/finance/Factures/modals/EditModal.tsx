'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Facture, PosteBudget } from '../types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { MOCK_FOURNISSEURS } from '../data';
import { detectPosteBudgetaire, getResteDisponible, formatCurrency, POSTE_BUDGET_LABELS } from '../utils';
import { PosteBudgetSelector } from '../PosteBudgetSelector';
import styles from '../Factures.module.css';

interface EditModalProps {
  facture: Facture;
  editForm: Partial<Facture>;
  postesBudget: PosteBudgetData[];
  onEditFormChange: (form: Partial<Facture>) => void;
  onClose: () => void;
  onSave: () => void;
}

export function EditModal({ facture, editForm, postesBudget, onEditFormChange, onClose, onSave }: EditModalProps) {
  const [suggestedPoste, setSuggestedPoste] = useState<PosteBudget | null>(null);

  // Détection automatique du poste budgétaire quand le fournisseur change
  useEffect(() => {
    if (editForm.fournisseur) {
      const detected = detectPosteBudgetaire({ fournisseur: editForm.fournisseur });
      setSuggestedPoste(detected);
    }
  }, [editForm.fournisseur]);

  const handleSave = () => {
    // Vérifier le dépassement budgétaire
    const montant = editForm.montant || 0;
    const poste = editForm.posteBudgetaire;
    if (poste) {
      const resteDisponible = getResteDisponible(poste, postesBudget);
      if (resteDisponible !== null && montant > resteDisponible) {
        const confirmDepassement = window.confirm(
          `Attention : Cette facture de ${formatCurrency(montant)} dépasse le budget restant ` +
          `de ${formatCurrency(resteDisponible)} pour le poste "${POSTE_BUDGET_LABELS[poste]}".\n\n` +
          `Cette action nécessite une validation du syndic. Continuer ?`
        );
        if (!confirmDepassement) return;
      }
    }
    onSave();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="edit-modal-title" className={styles.modalTitle}>Modifier la facture</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label htmlFor="edit-date">Date <span className={styles.required}>*</span></label>
            <input
              id="edit-date"
              type="date"
              value={editForm.date || ''}
              onChange={(e) => onEditFormChange({ ...editForm, date: e.target.value })}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-fournisseur">Fournisseur <span className={styles.required}>*</span></label>
            <select
              id="edit-fournisseur"
              value={MOCK_FOURNISSEURS.find(f => f.nom === editForm.fournisseur)?.id || ''}
              onChange={(e) => {
                const fournisseur = MOCK_FOURNISSEURS.find(f => f.id === e.target.value);
                if (fournisseur) {
                  onEditFormChange({ ...editForm, fournisseur: fournisseur.nom });
                }
              }}
              className={styles.formInput}
            >
              <option value="">Sélectionner un fournisseur...</option>
              {MOCK_FOURNISSEURS.map((f) => (
                <option key={f.id} value={f.id}>{f.nom}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-reference">Référence <span className={styles.required}>*</span></label>
            <input
              id="edit-reference"
              type="text"
              value={editForm.reference || ''}
              onChange={(e) => onEditFormChange({ ...editForm, reference: e.target.value })}
              className={styles.formInput}
              placeholder="Ex: FAC-2025-001"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-montant">Montant (EUR) <span className={styles.required}>*</span></label>
            <input
              id="edit-montant"
              type="number"
              step="0.01"
              value={editForm.montant || ''}
              onChange={(e) => onEditFormChange({ ...editForm, montant: parseFloat(e.target.value) })}
              className={styles.formInput}
              placeholder="Ex: 1250.00"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Poste budgétaire <span className={styles.required}>*</span></label>
            <PosteBudgetSelector
              value={editForm.posteBudgetaire}
              onChange={(poste) => onEditFormChange({ ...editForm, posteBudgetaire: poste })}
              montantFacture={editForm.montant || 0}
              postesBudget={postesBudget}
              suggestedPoste={suggestedPoste}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="edit-fichier">URL du fichier (optionnel)</label>
            <input
              id="edit-fichier"
              type="text"
              value={editForm.fichier || ''}
              onChange={(e) => onEditFormChange({ ...editForm, fichier: e.target.value })}
              className={styles.formInput}
              placeholder="Ex: /documents/factures/facture.pdf"
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.payButton} onClick={handleSave}>
            <CheckCircle size={20} aria-hidden="true" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
