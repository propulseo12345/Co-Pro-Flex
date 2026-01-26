'use client';

import { useState, useCallback, useEffect } from 'react';
import { X, Plus, AlertCircle, Calendar } from 'lucide-react';
import { NewFactureForm, PJFacture, calculerDateEcheanceDefaut, PosteBudget } from '../types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { MOCK_FOURNISSEURS } from '../data';
import { detectPosteBudgetaire, getResteDisponible, formatCurrency, POSTE_BUDGET_LABELS } from '../utils';
import { PosteBudgetSelector } from '../PosteBudgetSelector';
import { FacturePJSection } from '../PJ';
import styles from '../Factures.module.css';

interface NewFactureModalProps {
  form: NewFactureForm;
  postesBudget: PosteBudgetData[];
  onFormChange: (form: NewFactureForm) => void;
  onClose: () => void;
  onCreate: () => void;
}

export function NewFactureModal({ form, postesBudget, onFormChange, onClose, onCreate }: NewFactureModalProps) {
  const [pjError, setPjError] = useState<string | null>(null);
  const [suggestedPoste, setSuggestedPoste] = useState<PosteBudget | null>(null);

  // Détection automatique du poste budgétaire quand le fournisseur change
  useEffect(() => {
    if (form.fournisseur) {
      const detected = detectPosteBudgetaire({ fournisseur: form.fournisseur });
      setSuggestedPoste(detected);
      // Auto-remplir si le poste n'est pas encore défini
      if (!form.posteBudgetaire && detected) {
        onFormChange({ ...form, posteBudgetaire: detected });
      }
    }
  }, [form.fournisseur]);

  const handlePJChange = useCallback((piecesJointes: PJFacture[]) => {
    onFormChange({ ...form, piecesJointes });
    if (pjError && piecesJointes.length > 0) {
      setPjError(null);
    }
  }, [form, onFormChange, pjError]);

  // Quand la date de facture change, recalculer l'échéance par défaut
  const handleDateChange = useCallback((newDate: string) => {
    const dateEcheance = newDate ? calculerDateEcheanceDefaut(newDate) : '';
    onFormChange({ ...form, date: newDate, dateEcheance });
  }, [form, onFormChange]);

  const handleCreate = () => {
    // Vérifier qu'il y a au moins une PJ
    if (!form.piecesJointes || form.piecesJointes.length === 0) {
      setPjError('Une facture doit être accompagnée d\'un justificatif (PDF, image…) pour être enregistrée');
      return;
    }
    // Vérifier que la date d'échéance est renseignée
    if (!form.dateEcheance) {
      setPjError('La date d\'échéance est obligatoire');
      return;
    }
    // Vérifier que le poste budgétaire est renseigné
    if (!form.posteBudgetaire) {
      setPjError('Le poste budgétaire est obligatoire');
      return;
    }
    // Vérifier le dépassement budgétaire
    const montant = parseFloat(form.montant) || 0;
    const resteDisponible = getResteDisponible(form.posteBudgetaire, postesBudget);
    if (resteDisponible !== null && montant > resteDisponible) {
      const confirmDepassement = window.confirm(
        `Attention : Cette facture de ${formatCurrency(montant)} dépasse le budget restant ` +
        `de ${formatCurrency(resteDisponible)} pour le poste "${POSTE_BUDGET_LABELS[form.posteBudgetaire]}".\n\n` +
        `Cette action nécessite une validation du syndic. Continuer ?`
      );
      if (!confirmDepassement) return;
    }
    setPjError(null);
    onCreate();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-facture-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="new-facture-modal-title" className={styles.modalTitle}>Nouvelle facture</h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="new-date">Date facture <span className={styles.required}>*</span></label>
              <input
                id="new-date"
                type="date"
                value={form.date}
                onChange={(e) => handleDateChange(e.target.value)}
                className={styles.formInput}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="new-echeance">
                Date d&apos;échéance <span className={styles.required}>*</span>
                <span className={styles.labelHint}>(30j fin de mois par défaut)</span>
              </label>
              <div className={styles.inputWithIcon}>
                <Calendar size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  id="new-echeance"
                  type="date"
                  value={form.dateEcheance}
                  onChange={(e) => onFormChange({ ...form, dateEcheance: e.target.value })}
                  className={styles.formInput}
                  min={form.date}
                />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="new-fournisseur">Fournisseur <span className={styles.required}>*</span></label>
            <select
              id="new-fournisseur"
              value={form.fournisseur}
              onChange={(e) => {
                const fournisseur = MOCK_FOURNISSEURS.find(f => f.id === e.target.value);
                if (fournisseur) {
                  onFormChange({ ...form, fournisseur: fournisseur.nom });
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
            <label htmlFor="new-reference">Référence <span className={styles.required}>*</span></label>
            <input
              id="new-reference"
              type="text"
              value={form.reference}
              onChange={(e) => onFormChange({ ...form, reference: e.target.value })}
              className={styles.formInput}
              placeholder="Ex: FAC-2025-001"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="new-montant">Montant (EUR) <span className={styles.required}>*</span></label>
            <input
              id="new-montant"
              type="number"
              step="0.01"
              value={form.montant}
              onChange={(e) => onFormChange({ ...form, montant: e.target.value })}
              className={styles.formInput}
              placeholder="Ex: 1250.00"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Poste budgétaire <span className={styles.required}>*</span></label>
            <PosteBudgetSelector
              value={form.posteBudgetaire}
              onChange={(poste) => onFormChange({ ...form, posteBudgetaire: poste })}
              montantFacture={parseFloat(form.montant) || 0}
              postesBudget={postesBudget}
              suggestedPoste={suggestedPoste}
              required
            />
          </div>

          {/* Section Pièces Jointes */}
          <div className={styles.formGroup}>
            <FacturePJSection
              initialPJ={form.piecesJointes || []}
              onChange={handlePJChange}
              required={true}
            />
            {pjError && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} aria-hidden="true" />
                {pjError}
              </span>
            )}
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button className={styles.payButton} onClick={handleCreate}>
            <Plus size={20} aria-hidden="true" />
            Créer la facture
          </button>
        </div>
      </div>
    </div>
  );
}
