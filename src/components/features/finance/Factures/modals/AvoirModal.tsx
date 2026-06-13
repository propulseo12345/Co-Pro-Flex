'use client';

import { useState } from 'react';
import { X, ReceiptText, Link2, AlertCircle } from 'lucide-react';
import { Facture, MotifAvoir, MOTIFS_AVOIR } from '../types';
import { formatCurrency, formatDate } from '../utils';
import styles from '../Factures.module.css';

interface AvoirModalProps {
  facture: Facture;
  onClose: () => void;
  onConfirm: (montant: number, motif: MotifAvoir, reference: string) => void;
}

export function AvoirModal({ facture, onClose, onConfirm }: AvoirModalProps) {
  const [montant, setMontant] = useState<string>(facture.montant.toString());
  const [motif, setMotif] = useState<MotifAvoir>('ERREUR_FACTURATION');
  const [reference, setReference] = useState<string>(`AVO-${facture.reference}`);
  const [error, setError] = useState<string | null>(null);

  const montantNumber = parseFloat(montant) || 0;
  const isPartiel = montantNumber < facture.montant && montantNumber > 0;
  const isInvalid = montantNumber <= 0 || montantNumber > facture.montant;

  const handleSubmit = () => {
    if (isInvalid) {
      setError(`Le montant doit être compris entre 0,01€ et ${formatCurrency(facture.montant)}`);
      return;
    }
    if (!reference.trim()) {
      setError('La référence est obligatoire');
      return;
    }
    onConfirm(montantNumber, motif, reference);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="avoir-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 id="avoir-modal-title" className={styles.modalTitle}>
            <ReceiptText size={20} aria-hidden="true" />
            Créer un avoir
          </h2>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Facture d'origine */}
          <div className={styles.avoirOrigineSection}>
            <div className={styles.avoirOrigineHeader}>
              <Link2 size={16} aria-hidden="true" />
              <span>Facture d&apos;origine</span>
            </div>
            <div className={styles.avoirOrigineDetails}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Référence</span>
                <span className={styles.infoValue}>{facture.reference}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Fournisseur</span>
                <span className={styles.infoValue}>{facture.fournisseur}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Date</span>
                <span className={styles.infoValue}>{formatDate(facture.date)}</span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Montant facture</span>
                <span className={styles.infoValue}>{formatCurrency(facture.montant)}</span>
              </div>
            </div>
          </div>

          {/* Formulaire avoir */}
          <div className={styles.formGroup}>
            <label htmlFor="avoir-reference">Référence de l&apos;avoir *</label>
            <input
              id="avoir-reference"
              type="text"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setError(null);
              }}
              placeholder="Ex: AVO-2025-001"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="avoir-motif">Motif de l&apos;avoir *</label>
            <select
              id="avoir-motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value as MotifAvoir)}
            >
              {(Object.keys(MOTIFS_AVOIR) as MotifAvoir[]).map((key) => (
                <option key={key} value={key}>
                  {MOTIFS_AVOIR[key]}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="avoir-montant">Montant de l&apos;avoir *</label>
            <div className={styles.inputWithHint}>
              <input
                id="avoir-montant"
                type="number"
                step="0.01"
                min="0.01"
                max={facture.montant}
                value={montant}
                onChange={(e) => {
                  setMontant(e.target.value);
                  setError(null);
                }}
                className={isInvalid && montant !== '' ? styles.inputError : ''}
              />
              <span className={styles.inputHint}>
                Maximum: {formatCurrency(facture.montant)}
              </span>
            </div>
          </div>

          {isPartiel && (
            <div className={styles.avoirPartielInfo}>
              <AlertCircle size={16} aria-hidden="true" />
              <span>
                Avoir partiel : le solde restant à payer sera de{' '}
                <strong>{formatCurrency(facture.montant - montantNumber)}</strong>
              </span>
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <AlertCircle size={16} aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Récapitulatif */}
          <div className={styles.avoirRecap}>
            <div className={styles.avoirRecapRow}>
              <span>Montant facture d&apos;origine</span>
              <span>{formatCurrency(facture.montant)}</span>
            </div>
            <div className={styles.avoirRecapRow}>
              <span>Montant de l&apos;avoir</span>
              <span className={styles.montantAvoir}>-{formatCurrency(montantNumber)}</span>
            </div>
            <div className={`${styles.avoirRecapRow} ${styles.avoirRecapTotal}`}>
              <span>Solde net à payer</span>
              <span>{formatCurrency(Math.max(0, facture.montant - montantNumber))}</span>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={onClose}>
            Annuler
          </button>
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isInvalid || !reference.trim()}
          >
            <ReceiptText size={18} aria-hidden="true" />
            Créer l&apos;avoir
          </button>
        </div>
      </div>
    </div>
  );
}
