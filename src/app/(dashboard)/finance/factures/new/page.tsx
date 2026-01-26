'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Upload,
  Building2,
  Calendar,
  Euro,
  Hash,
  Save,
  AlertCircle
} from 'lucide-react';
import styles from './new-facture.module.css';

type StatutFacture = 'A_PAYER' | 'EN_ATTENTE' | 'PAYEE';

interface FactureForm {
  date: string;
  fournisseur: string;
  reference: string;
  montant: string;
  statut: StatutFacture;
  fichier?: File | null;
}

export default function NewFacturePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FactureForm>({
    date: new Date().toISOString().split('T')[0],
    fournisseur: '',
    reference: '',
    montant: '',
    statut: 'A_PAYER',
    fichier: null
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FactureForm, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FactureForm, value: string | StatutFacture | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleChange('fichier', file);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FactureForm, string>> = {};

    if (!formData.date) newErrors.date = 'La date est requise';
    if (!formData.fournisseur.trim()) newErrors.fournisseur = 'Le fournisseur est requis';
    if (!formData.reference.trim()) newErrors.reference = 'La référence est requise';
    if (!formData.montant || parseFloat(formData.montant) <= 0) {
      newErrors.montant = 'Le montant doit être supérieur à 0';
    }
    if (!formData.fichier) {
      newErrors.fichier = 'Une facture doit être accompagnée d\'un justificatif (PDF, image…) pour être enregistrée';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    // Simuler l'envoi au serveur
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/finance/factures');
    }, 1000);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => router.back()}>
          <ArrowLeft size={20} aria-hidden="true" />
          Retour
        </button>
        <div>
          <h1 className={styles.title}>Nouvelle Facture</h1>
          <p className={styles.subtitle}>Ajouter une nouvelle facture fournisseur</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
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
              <input id="date" type="date" value={formData.date} onChange={(e) => handleChange('date', e.target.value)}
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
                onChange={(e) => handleChange('fournisseur', e.target.value)}
                className={errors.fournisseur ? styles.inputError : ''}
              />
              {errors.fournisseur && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.fournisseur}
                </span>
              )}
            </div>

            {/* Référence */}
            <div className={styles.formGroup}>
              <label htmlFor="reference">
                <Hash size={16} aria-hidden="true" />
                Référence
              </label>
              <input
                id="reference"
                type="text"
                placeholder="Numéro de facture"
                value={formData.reference}
                onChange={(e) => handleChange('reference', e.target.value)}
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
                Montant (€)
              </label>
              <input
                id="montant"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.montant}
                onChange={(e) => handleChange('montant', e.target.value)}
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
                onChange={(e) => handleChange('statut', e.target.value as StatutFacture)}
              >
                <option value="A_PAYER">À payer</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="PAYEE">Payée</option>
              </select>
            </div>

            {/* Upload fichier */}
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label htmlFor="fichier">
                <Upload size={16} aria-hidden="true" />
                Pièce justificative <span className={styles.required}>*</span>
              </label>
              <div className={styles.fileUpload}>
                <input
                  id="fichier"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className={`${styles.fileInput} ${errors.fichier ? styles.inputError : ''}`}
                />
                <label htmlFor="fichier" className={styles.fileLabel}>
                  <Upload size={20} aria-hidden="true" />
                  {formData.fichier ? formData.fichier.name : 'Choisir un fichier (PDF, image…)'}
                </label>
              </div>
              {errors.fichier && (
                <span className={styles.errorMessage}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {errors.fichier}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className={styles.spinner} />
                Enregistrement...
              </>
            ) : (
              <>
                <Save size={20} aria-hidden="true" />
                Enregistrer la facture
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
