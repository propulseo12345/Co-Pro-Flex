'use client';

import { useState, useCallback, useId } from 'react';
import { X, Wallet, Calendar, CreditCard, FileText, AlertCircle } from 'lucide-react';
import type { CoproprietaireAppel } from '../types';
import { formatCurrency } from '../utils';
import styles from '../appels-fonds.module.css';

export type ModePaiement = 'VIREMENT' | 'CHEQUE' | 'PRELEVEMENT' | 'ESPECES' | 'CB';

export interface NouveauPaiement {
  montant: number;
  datePaiement: string;
  modePaiement: ModePaiement;
  reference?: string;
  commentaire?: string;
}

interface EnregistrerPaiementModalProps {
  coproprietaire: CoproprietaireAppel;
  onClose: () => void;
  onSubmit: (coproId: string, paiement: NouveauPaiement) => void;
}

export function EnregistrerPaiementModal({
  coproprietaire,
  onClose,
  onSubmit,
}: EnregistrerPaiementModalProps) {
  const titleId = useId();
  const resteADu = coproprietaire.montantIndividuel - (coproprietaire.paiement?.montantPaye || 0);

  const [formData, setFormData] = useState<NouveauPaiement>({
    montant: resteADu,
    datePaiement: new Date().toISOString().split('T')[0],
    modePaiement: 'VIREMENT',
    reference: '',
    commentaire: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.montant || formData.montant <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    } else if (formData.montant > resteADu) {
      newErrors.montant = `Le montant ne peut pas dépasser ${formatCurrency(resteADu)}`;
    }

    if (!formData.datePaiement) {
      newErrors.datePaiement = 'La date de paiement est requise';
    }

    if (!formData.modePaiement) {
      newErrors.modePaiement = 'Le mode de paiement est requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, resteADu]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(coproprietaire.id, formData);
    }
  }, [validate, onSubmit, coproprietaire.id, formData]);

  const handleChange = useCallback((field: keyof NouveauPaiement, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error on change
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 id={titleId} className={styles.modalTitle}>Enregistrer un paiement</h2>
            <p className={styles.modalSubtitle}>{coproprietaire.nom} - Lot {coproprietaire.lot}</p>
          </div>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Récapitulatif */}
          <div className={styles.paiementRecap}>
            <div className={styles.paiementRecapItem}>
              <span className={styles.paiementRecapLabel}>Montant appelé</span>
              <span className={styles.paiementRecapValue}>
                {formatCurrency(coproprietaire.montantIndividuel)}
              </span>
            </div>
            <div className={styles.paiementRecapItem}>
              <span className={styles.paiementRecapLabel}>Déjà payé</span>
              <span className={styles.paiementRecapValue} style={{ color: 'var(--success)' }}>
                {formatCurrency(coproprietaire.paiement?.montantPaye || 0)}
              </span>
            </div>
            <div className={styles.paiementRecapItem}>
              <span className={styles.paiementRecapLabel}>Reste à payer</span>
              <span className={styles.paiementRecapValue} style={{ color: 'var(--warning)' }}>
                {formatCurrency(resteADu)}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Montant */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Wallet size={16} aria-hidden="true" />
                Montant du paiement <span className={styles.required}>*</span>
              </label>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={resteADu}
                  value={formData.montant}
                  onChange={(e) => handleChange('montant', parseFloat(e.target.value) || 0)}
                  className={`${styles.formInput} ${errors.montant ? styles.formInputError : ''}`}
                  placeholder="0,00"
                />
                <span className={styles.inputSuffix}>€</span>
              </div>
              {errors.montant && (
                <span className={styles.formError}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.montant}
                </span>
              )}
              <button
                type="button"
                className={styles.quickFillButton}
                onClick={() => handleChange('montant', resteADu)}
              >
                Solder le reste ({formatCurrency(resteADu)})
              </button>
            </div>

            {/* Date de paiement */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Calendar size={16} aria-hidden="true" />
                Date de paiement <span className={styles.required}>*</span>
              </label>
              <input
                type="date"
                value={formData.datePaiement}
                onChange={(e) => handleChange('datePaiement', e.target.value)}
                className={`${styles.formInput} ${errors.datePaiement ? styles.formInputError : ''}`}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.datePaiement && (
                <span className={styles.formError}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.datePaiement}
                </span>
              )}
            </div>

            {/* Mode de paiement */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <CreditCard size={16} aria-hidden="true" />
                Mode de paiement <span className={styles.required}>*</span>
              </label>
              <select
                value={formData.modePaiement}
                onChange={(e) => handleChange('modePaiement', e.target.value)}
                className={`${styles.formInput} ${errors.modePaiement ? styles.formInputError : ''}`}
              >
                <option value="VIREMENT">Virement bancaire</option>
                <option value="CHEQUE">Chèque</option>
                <option value="PRELEVEMENT">Prélèvement automatique</option>
                <option value="CB">Carte bancaire</option>
                <option value="ESPECES">Espèces</option>
              </select>
              {errors.modePaiement && (
                <span className={styles.formError}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.modePaiement}
                </span>
              )}
            </div>

            {/* Référence */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <FileText size={16} aria-hidden="true" />
                Référence (optionnel)
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => handleChange('reference', e.target.value)}
                className={styles.formInput}
                placeholder="N° de chèque, référence virement..."
              />
            </div>

            {/* Commentaire */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Commentaire (optionnel)</label>
              <textarea
                value={formData.commentaire}
                onChange={(e) => handleChange('commentaire', e.target.value)}
                className={styles.formInput}
                rows={2}
                placeholder="Notes additionnelles..."
              />
            </div>

            {/* Actions */}
            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={onClose}
              >
                Annuler
              </button>
              <button
                type="submit"
                className={styles.submitButton}
              >
                <Wallet size={16} aria-hidden="true" />
                Enregistrer le paiement
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
