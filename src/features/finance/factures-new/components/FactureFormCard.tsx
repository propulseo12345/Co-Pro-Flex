'use client';

import {
  FileText,
  Calendar,
  Building2,
  Hash,
  Euro,
  Upload,
  AlertCircle
} from 'lucide-react';
import type { FactureForm, StatutFacture, FactureFormErrors } from '../hooks';
import styles from '@/app/(dashboard)/finance/factures/new/new-facture.module.css';

interface FactureFormCardProps {
  formData: FactureForm;
  errors: FactureFormErrors;
  onFieldChange: (field: keyof FactureForm, value: string | StatutFacture | File | null) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FactureFormCard({ formData, errors, onFieldChange, onFileChange }: FactureFormCardProps) {
  return (
    <div className={styles.formCard}>
      <div className={styles.cardHeader}>
        <FileText size={20} aria-hidden="true" />
        <h2>Informations de la facture</h2>
      </div>

      <div className={styles.formGrid}>
        {/* Date */}
        <div className={styles.formGroup}>
          <label htmlFor="date">
            <Calendar size={16} aria-hidden="true" />
            Date de la facture
          </label>
          <input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => onFieldChange('date', e.target.value)}
            className={errors.date ? styles.inputError : ''}
          />
          {errors.date && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.date}
            </span>
          )}
        </div>

        {/* Fournisseur */}
        <div className={styles.formGroup}>
          <label htmlFor="fournisseur">
            <Building2 size={16} aria-hidden="true" />
            Fournisseur
          </label>
          <input
            id="fournisseur"
            type="text"
            placeholder="Nom du fournisseur"
            value={formData.fournisseur}
            onChange={(e) => onFieldChange('fournisseur', e.target.value)}
            className={errors.fournisseur ? styles.inputError : ''}
          />
          {errors.fournisseur && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.fournisseur}
            </span>
          )}
        </div>

        {/* Reference */}
        <div className={styles.formGroup}>
          <label htmlFor="reference">
            <Hash size={16} aria-hidden="true" />
            Reference
          </label>
          <input
            id="reference"
            type="text"
            placeholder="Numero de facture"
            value={formData.reference}
            onChange={(e) => onFieldChange('reference', e.target.value)}
            className={errors.reference ? styles.inputError : ''}
          />
          {errors.reference && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.reference}
            </span>
          )}
        </div>

        {/* Montant */}
        <div className={styles.formGroup}>
          <label htmlFor="montant">
            <Euro size={16} aria-hidden="true" />
            Montant (EUR)
          </label>
          <input
            id="montant"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.montant}
            onChange={(e) => onFieldChange('montant', e.target.value)}
            className={errors.montant ? styles.inputError : ''}
          />
          {errors.montant && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.montant}
            </span>
          )}
        </div>

        {/* Statut */}
        <div className={styles.formGroup}>
          <label htmlFor="statut">Statut</label>
          <select
            id="statut"
            value={formData.statut}
            onChange={(e) => onFieldChange('statut', e.target.value as StatutFacture)}
          >
            <option value="A_PAYER">A payer</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="PAYEE">Payee</option>
          </select>
        </div>

        {/* Upload fichier */}
        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="fichier">
            <Upload size={16} aria-hidden="true" />
            Piece justificative
          </label>
          <div className={styles.fileUpload}>
            <input
              id="fichier"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={onFileChange}
              className={styles.fileInput}
            />
            <label htmlFor="fichier" className={styles.fileLabel}>
              <Upload size={20} aria-hidden="true" />
              {formData.fichier ? formData.fichier.name : 'Choisir un fichier (PDF, image...)'}
            </label>
          </div>
          {!formData.fichier && (
            <span className={styles.warningMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              Recommande : joindre un justificatif (PDF, image...) pour cette facture
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
