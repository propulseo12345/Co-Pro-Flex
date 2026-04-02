'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Plus, AlertCircle, Calendar } from 'lucide-react';
import { NewFactureForm, PJFacture, calculerDateEcheanceDefaut, PosteBudget } from '../types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { detectPosteBudgetaire, getResteDisponible, formatCurrency, POSTE_BUDGET_LABELS } from '../utils';
import { PosteBudgetSelector } from '../PosteBudgetSelector';
import { FacturePJSection } from '../PJ';
import styles from '../Factures.module.css';

interface Supplier {
  id: string;
  name: string;
}

interface NewFactureModalProps {
  form: NewFactureForm;
  postesBudget: PosteBudgetData[];
  suppliers?: Supplier[];
  createError?: string | null;
  isCreating?: boolean;
  onFormChange: (form: NewFactureForm) => void;
  onClose: () => void;
  onCreate: () => void;
}

export function NewFactureModal({ form, postesBudget, suppliers = [], createError, isCreating, onFormChange, onClose, onCreate }: NewFactureModalProps) {
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

  // Ref pour éviter les closures stale
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const handlePJChange = useCallback((piecesJointes: PJFacture[]) => {
    // Utilise la ref pour avoir la valeur courante du form
    onFormChange({ ...formRef.current, piecesJointes });
    setPjError(null);
  }, [onFormChange]);

  // Quand la date de facture change, recalculer l'échéance par défaut
  const handleDateChange = useCallback((newDate: string) => {
    const dateEcheance = newDate ? calculerDateEcheanceDefaut(newDate) : '';
    onFormChange({ ...form, date: newDate, dateEcheance });
  }, [form, onFormChange]);

  const handleCreate = () => {
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
            <input
              id="new-fournisseur"
              type="text"
              list="fournisseurs-list"
              value={form.fournisseur}
              onChange={(e) => onFormChange({ ...form, fournisseur: e.target.value })}
              className={styles.formInput}
              placeholder="Saisir ou sélectionner un fournisseur..."
              autoComplete="off"
            />
            <datalist id="fournisseurs-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>
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
              required={false}
            />
            {/* Avertissement non-bloquant si pas de PJ */}
            {(!form.piecesJointes || form.piecesJointes.length === 0) && (
              <div className={styles.warningMessage} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--badge-warning-bg)', borderRadius: '0.375rem', color: 'var(--color-warning-text, #92400e)', fontSize: '0.875rem' }}>
                <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>Recommandé : joindre un justificatif (PDF, image…) pour cette facture</span>
              </div>
            )}
            {pjError && (
              <span className={styles.errorMessage}>
                <AlertCircle size={14} aria-hidden="true" />
                {pjError}
              </span>
            )}
          </div>

          {/* Erreur de création Supabase */}
          {createError && (
            <div className={styles.formGroup}>
              <span className={styles.errorMessage} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--color-error-bg, #fef2f2)', borderRadius: '0.375rem' }}>
                <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
                <span>{createError}</span>
              </span>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose} disabled={isCreating}>
            Annuler
          </button>
          <button className={styles.payButton} onClick={handleCreate} disabled={isCreating}>
            <Plus size={20} aria-hidden="true" />
            {isCreating ? 'Création en cours...' : 'Créer la facture'}
          </button>
        </div>
      </div>
    </div>
  );
}
