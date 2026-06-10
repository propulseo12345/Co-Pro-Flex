'use client';

import {
  FileText,
  Calendar,
  Building2,
  Hash,
  Euro,
  BookOpen,
  Tag,
  Info,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import type { FactureForm, FactureFormErrors } from '../hooks';
import styles from '@/app/(dashboard)/finance/factures/new/new-facture.module.css';

interface SupplierOption {
  id: string;
  name: string;
}

interface ChargeAccountOption {
  id: string;
  code: string;
  name: string;
}

interface FactureFormCardProps {
  formData: FactureForm;
  errors: FactureFormErrors;
  suppliers: SupplierOption[];
  chargeAccounts: ChargeAccountOption[];
  isNewSupplierOpen: boolean;
  newSupplierName: string;
  newSupplierError: string | null;
  isCreatingSupplier: boolean;
  onNewSupplierNameChange: (value: string) => void;
  onToggleNewSupplier: () => void;
  onCreateSupplier: () => void;
  onFieldChange: (field: keyof FactureForm, value: string) => void;
}

export function FactureFormCard({
  formData,
  errors,
  suppliers,
  chargeAccounts,
  isNewSupplierOpen,
  newSupplierName,
  newSupplierError,
  isCreatingSupplier,
  onNewSupplierNameChange,
  onToggleNewSupplier,
  onCreateSupplier,
  onFieldChange
}: FactureFormCardProps) {
  return (
    <div className={styles.formCard}>
      <div className={styles.cardHeader}>
        <FileText size={20} aria-hidden="true" />
        <h2>Informations de la facture</h2>
      </div>

      <div className={styles.formGrid}>
        {/* Fournisseur */}
        <div className={styles.formGroup}>
          <label htmlFor="fournisseur">
            <Building2 size={16} aria-hidden="true" />
            Fournisseur
          </label>
          <select
            id="fournisseur"
            value={formData.supplierId}
            onChange={(e) => onFieldChange('supplierId', e.target.value)}
            className={errors.supplierId ? styles.inputError : ''}
          >
            <option value="">— Sélectionner un fournisseur —</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
          {errors.supplierId && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.supplierId}
            </span>
          )}
          <button type="button" className={styles.inlineLink} onClick={onToggleNewSupplier}>
            {isNewSupplierOpen ? <X size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
            {isNewSupplierOpen ? 'Annuler la création' : 'Créer un nouveau fournisseur'}
          </button>
          {isNewSupplierOpen && (
            <div className={styles.inlineCreateRow}>
              <input
                type="text"
                placeholder="Nom du fournisseur (ex. Veolia)"
                value={newSupplierName}
                onChange={(e) => onNewSupplierNameChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCreateSupplier();
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                className={styles.inlineCreateButton}
                onClick={onCreateSupplier}
                disabled={isCreatingSupplier}
              >
                {isCreatingSupplier ? 'Création…' : 'Créer'}
              </button>
            </div>
          )}
          {newSupplierError && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {newSupplierError}
            </span>
          )}
        </div>

        {/* Compte de charge (mono-poste) */}
        <div className={styles.formGroup}>
          <label htmlFor="compte">
            <BookOpen size={16} aria-hidden="true" />
            Compte de charge
          </label>
          <select
            id="compte"
            value={formData.accountId}
            onChange={(e) => onFieldChange('accountId', e.target.value)}
            className={errors.accountId ? styles.inputError : ''}
          >
            <option value="">— Sélectionner un compte (6xx) —</option>
            {chargeAccounts.map((account) => (
              <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
            ))}
          </select>
          {errors.accountId && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.accountId}
            </span>
          )}
        </div>

        {/* Date facture */}
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

        {/* Échéance */}
        <div className={styles.formGroup}>
          <label htmlFor="dateEcheance">
            <Calendar size={16} aria-hidden="true" />
            Date d&apos;échéance (optionnel)
          </label>
          <input
            id="dateEcheance"
            type="date"
            value={formData.dateEcheance}
            onChange={(e) => onFieldChange('dateEcheance', e.target.value)}
            className={errors.dateEcheance ? styles.inputError : ''}
          />
          {errors.dateEcheance && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.dateEcheance}
            </span>
          )}
        </div>

        {/* Référence */}
        <div className={styles.formGroup}>
          <label htmlFor="reference">
            <Hash size={16} aria-hidden="true" />
            Référence (optionnel)
          </label>
          <input
            id="reference"
            type="text"
            placeholder="Numéro de facture du fournisseur"
            value={formData.reference}
            onChange={(e) => onFieldChange('reference', e.target.value)}
            className={errors.reference ? styles.inputError : ''}
          />
        </div>

        {/* Montant */}
        <div className={styles.formGroup}>
          <label htmlFor="montant">
            <Euro size={16} aria-hidden="true" />
            Montant TTC (EUR)
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

        {/* Libellé */}
        <div className={styles.formGroup}>
          <label htmlFor="libelle">
            <Tag size={16} aria-hidden="true" />
            Libellé
          </label>
          <input
            id="libelle"
            type="text"
            placeholder="Ex. Entretien ascenseur T2"
            value={formData.libelle}
            onChange={(e) => onFieldChange('libelle', e.target.value)}
            className={errors.libelle ? styles.inputError : ''}
          />
          {errors.libelle && (
            <span className={styles.errorMessage}>
              <AlertCircle size={14} aria-hidden="true" />
              {errors.libelle}
            </span>
          )}
        </div>
      </div>

      <span className={styles.warningMessage}>
        <Info size={14} aria-hidden="true" />
        En enregistrant, la facture est comptabilisée immédiatement au grand livre
        (débit {formData.accountId ? 'du compte de charge choisi' : '6xx'} / crédit 401) sur la période ouverte.
        Montants TTC (TVA non récupérable en copropriété).
      </span>
    </div>
  );
}
