'use client';

import { useState, useMemo } from 'react';
import { X, Plus, Edit, Lock, Eye, ArrowLeft, ChevronRight, Users } from 'lucide-react';
import { DatePicker } from '@/components/ui/DatePicker';
import { isValid, parseISO, format } from 'date-fns';
import type { NewAppelForm, TypeAppel, AppelFonds, CoproprietaireAppel } from '../types';
import { BandeauVerrouillage } from '../BandeauVerrouillage';
import { FormAlerteDelai } from '../CalendrierAppel';
import { useReglesModificationAppel } from '@/hooks/useReglesModificationAppel';
import { formatCurrency } from '../utils';
import { MOCK_COPROPRIETAIRES_APPEL } from '../mock-data';
import styles from '../appels-fonds.module.css';

// Mock des clés de répartition
const MOCK_CLES_REPARTITION = [
  { id: 'cle-generale', nom: 'Clé générale', description: 'Tantièmes généraux' },
  { id: 'cle-toiture', nom: 'Clé toiture', description: 'Tantièmes toiture/terrasse' },
  { id: 'cle-facade', nom: 'Clé façade', description: 'Tantièmes façade' },
  { id: 'cle-ascenseur', nom: 'Clé ascenseur', description: 'Tantièmes ascenseur' },
];

type FormStep = 'form' | 'preview';

interface AppelFormModalProps {
  mode: 'new' | 'edit';
  form: NewAppelForm;
  appel?: AppelFonds | null;
  onFormChange: (form: NewAppelForm) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export function AppelFormModal({
  mode,
  form,
  appel,
  onFormChange,
  onSubmit,
  onClose,
}: AppelFormModalProps) {
  const [step, setStep] = useState<FormStep>('form');
  const isEdit = mode === 'edit';

  const { estModifiable, messageVerrouillage } = useReglesModificationAppel(appel ?? null);
  const isReadOnly = isEdit && !estModifiable;

  // Calculer la répartition par copropriétaire
  const repartitionPreview = useMemo(() => {
    const montantTotal = parseFloat(form.montantTotal) || 0;
    if (montantTotal <= 0) return [];

    const totalTantiemes = MOCK_COPROPRIETAIRES_APPEL.reduce((sum, c) => sum + c.tantiemes, 0);

    return MOCK_COPROPRIETAIRES_APPEL.map(copro => ({
      ...copro,
      montantCalcule: (copro.tantiemes / totalTantiemes) * montantTotal
    }));
  }, [form.montantTotal]);

  const totalTantiemes = MOCK_COPROPRIETAIRES_APPEL.reduce((sum, c) => sum + c.tantiemes, 0);

  // Validation du formulaire
  const isFormValid = useMemo(() => {
    return (
      form.description.trim() !== '' &&
      form.periode.trim() !== '' &&
      form.dateExigibilite !== '' &&
      form.dateEmission !== '' &&
      form.dateLimiteReglement !== '' &&
      parseFloat(form.montantTotal) > 0
    );
  }, [form]);

  const title = isReadOnly
    ? "Consulter l'appel de fonds"
    : step === 'preview'
      ? 'Prévisualisation de la répartition'
      : isEdit
        ? "Modifier l'appel de fonds"
        : 'Nouvel appel de fonds';

  const subtitle = isReadOnly
    ? "Cet appel est en lecture seule"
    : step === 'preview'
      ? 'Vérifiez les montants par copropriétaire avant validation'
      : isEdit
        ? "Modifier les informations de l'appel"
        : 'Créer un nouvel appel de fonds';

  const handlePreview = () => {
    if (isFormValid) {
      setStep('preview');
    }
  };

  const handleBackToForm = () => {
    setStep('form');
  };

  const handleConfirmSubmit = () => {
    onSubmit();
  };

  const idPrefix = isEdit ? 'edit-' : '';

  return (
    <div className={styles.modalOverlay} aria-hidden="true" onClick={onClose}>
      <div
        className={step === 'preview' ? styles.modalContentLarge : styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            <p className={styles.modalSubtitle}>{subtitle}</p>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          {isReadOnly && messageVerrouillage && (
            <BandeauVerrouillage
              message={messageVerrouillage}
              dateGeneration={appel?.dateEmission}
            />
          )}

          {step === 'form' ? (
            <form className={styles.form}>
              {/* Type d'appel */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Type d&apos;appel {!isReadOnly && <span className={styles.required}>*</span>}
                </label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name={`${idPrefix}type`}
                      value="fonctionnement"
                      checked={form.type === 'fonctionnement'}
                      onChange={(e) => onFormChange({ ...form, type: e.target.value as TypeAppel })}
                      disabled={isReadOnly}
                    />
                    <span>Fonctionnement</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name={`${idPrefix}type`}
                      value="travaux"
                      checked={form.type === 'travaux'}
                      onChange={(e) => onFormChange({ ...form, type: e.target.value as TypeAppel })}
                      disabled={isReadOnly}
                    />
                    <span>Travaux</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`${idPrefix}description`}>
                  Description {!isReadOnly && <span className={styles.required}>*</span>}
                </label>
                <input
                  id={`${idPrefix}description`}
                  type="text"
                  className={`${styles.formInput} ${isReadOnly ? styles.formInputReadonly : ''}`}
                  placeholder="Ex: Appel de fonds - Charges T1 2025"
                  value={form.description}
                  onChange={(e) => onFormChange({ ...form, description: e.target.value })}
                  readOnly={isReadOnly}
                />
              </div>

              {/* Période */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`${idPrefix}periode`}>
                  Période {!isReadOnly && <span className={styles.required}>*</span>}
                </label>
                <input
                  id={`${idPrefix}periode`}
                  type="text"
                  className={`${styles.formInput} ${isReadOnly ? styles.formInputReadonly : ''}`}
                  placeholder="Ex: T1 2025"
                  value={form.periode}
                  onChange={(e) => onFormChange({ ...form, periode: e.target.value })}
                  readOnly={isReadOnly}
                />
              </div>

              {/* Date d'émission */}
              <div className={styles.formGroup}>
                <DatePicker
                  id={`${idPrefix}dateEmission`}
                  label="Date d'émission"
                  value={form.dateEmission ? parseISO(form.dateEmission) : null}
                  onChange={(date) => {
                    if (date && isValid(date)) {
                      onFormChange({ ...form, dateEmission: format(date, 'yyyy-MM-dd') });
                    } else {
                      onFormChange({ ...form, dateEmission: '' });
                    }
                  }}
                  required={!isReadOnly}
                  disabled={isReadOnly}
                />
              </div>

              {/* Date limite de règlement - OBLIGATOIRE */}
              <div className={styles.formGroup}>
                <DatePicker
                  id={`${idPrefix}dateLimiteReglement`}
                  label="Date limite de règlement"
                  value={form.dateLimiteReglement ? parseISO(form.dateLimiteReglement) : null}
                  onChange={(date) => {
                    if (date && isValid(date)) {
                      onFormChange({ ...form, dateLimiteReglement: format(date, 'yyyy-MM-dd') });
                    } else {
                      onFormChange({ ...form, dateLimiteReglement: '' });
                    }
                  }}
                  required={!isReadOnly}
                  disabled={isReadOnly}
                  minDate={form.dateEmission ? parseISO(form.dateEmission) : undefined}
                  hint={isReadOnly ? undefined : "Date à laquelle les copropriétaires doivent avoir réglé leur appel."}
                />
              </div>

              {/* Date d'exigibilité */}
              <div className={styles.formGroup}>
                <DatePicker
                  id={`${idPrefix}dateExigibilite`}
                  label="Date d'exigibilité"
                  value={form.dateExigibilite ? parseISO(form.dateExigibilite) : null}
                  onChange={(date) => {
                    if (date && isValid(date)) {
                      onFormChange({ ...form, dateExigibilite: format(date, 'yyyy-MM-dd') });
                    } else {
                      onFormChange({ ...form, dateExigibilite: '' });
                    }
                  }}
                  required={!isReadOnly}
                  disabled={isReadOnly}
                  minDate={form.dateLimiteReglement ? parseISO(form.dateLimiteReglement) : (form.dateEmission ? parseISO(form.dateEmission) : undefined)}
                  hint={isReadOnly ? undefined : "Date légale d'exigibilité de l'appel. Délai recommandé : 45 jours après émission."}
                />
                {!isReadOnly && form.dateExigibilite && (
                  <FormAlerteDelai
                    dateEcheance={form.dateExigibilite}
                    dateEmission={form.dateEmission}
                  />
                )}
              </div>

              {/* Clé de répartition */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`${idPrefix}cleRepartition`}>
                  Clé de répartition {!isReadOnly && <span className={styles.required}>*</span>}
                </label>
                <select
                  id={`${idPrefix}cleRepartition`}
                  className={`${styles.formInput} ${isReadOnly ? styles.formInputReadonly : ''}`}
                  value={form.cleRepartitionId}
                  onChange={(e) => onFormChange({ ...form, cleRepartitionId: e.target.value })}
                  disabled={isReadOnly}
                >
                  <option value="">Sélectionner une clé</option>
                  {MOCK_CLES_REPARTITION.map(cle => (
                    <option key={cle.id} value={cle.id}>{cle.nom} - {cle.description}</option>
                  ))}
                </select>
              </div>

              {/* Montant total */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor={`${idPrefix}montantTotal`}>
                  Montant total {!isReadOnly && <span className={styles.required}>*</span>}
                </label>
                <div className={styles.inputWithSuffix}>
                  <input
                    id={`${idPrefix}montantTotal`}
                    type="number"
                    step="0.01"
                    className={`${styles.formInput} ${isReadOnly ? styles.formInputReadonly : ''}`}
                    placeholder="Ex: 12500.00"
                    value={form.montantTotal}
                    onChange={(e) => onFormChange({ ...form, montantTotal: e.target.value })}
                    readOnly={isReadOnly}
                  />
                  <span className={styles.inputSuffix}>€</span>
                </div>
              </div>

              {/* Champs spécifiques aux travaux */}
              {form.type === 'travaux' && (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor={`${idPrefix}projetNom`}>
                      Nom du projet
                    </label>
                    <input
                      id={`${idPrefix}projetNom`}
                      type="text"
                      className={`${styles.formInput} ${isReadOnly ? styles.formInputReadonly : ''}`}
                      placeholder="Ex: Rénovation toiture"
                      value={form.projetNom}
                      onChange={(e) => onFormChange({ ...form, projetNom: e.target.value })}
                      readOnly={isReadOnly}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor={`${idPrefix}budgetTravauxId`}>
                      ID Budget travaux
                    </label>
                    <input
                      id={`${idPrefix}budgetTravauxId`}
                      type="text"
                      className={`${styles.formInput} ${isReadOnly ? styles.formInputReadonly : ''}`}
                      placeholder="Ex: BT-2025-001"
                      value={form.budgetTravauxId}
                      onChange={(e) => onFormChange({ ...form, budgetTravauxId: e.target.value })}
                      readOnly={isReadOnly}
                    />
                  </div>
                </>
              )}

              {/* Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                >
                  {isReadOnly ? 'Fermer' : 'Annuler'}
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    className={styles.submitButton}
                    onClick={handlePreview}
                    disabled={!isFormValid}
                  >
                    <Eye size={16} aria-hidden="true" />
                    Prévisualiser la répartition
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </form>
          ) : (
            /* Step Preview */
            <div className={styles.previewContainer}>
              {/* Résumé de l'appel */}
              <div className={styles.previewSummary}>
                <div className={styles.previewSummaryItem}>
                  <span className={styles.previewSummaryLabel}>Description</span>
                  <span className={styles.previewSummaryValue}>{form.description}</span>
                </div>
                <div className={styles.previewSummaryItem}>
                  <span className={styles.previewSummaryLabel}>Période</span>
                  <span className={styles.previewSummaryValue}>{form.periode}</span>
                </div>
                <div className={styles.previewSummaryItem}>
                  <span className={styles.previewSummaryLabel}>Date limite de règlement</span>
                  <span className={styles.previewSummaryValue}>
                    {form.dateLimiteReglement ? new Date(form.dateLimiteReglement).toLocaleDateString('fr-FR') : '-'}
                  </span>
                </div>
                <div className={styles.previewSummaryItem}>
                  <span className={styles.previewSummaryLabel}>Montant total</span>
                  <span className={styles.previewSummaryValueHighlight}>
                    {formatCurrency(parseFloat(form.montantTotal) || 0)}
                  </span>
                </div>
              </div>

              {/* Tableau de répartition */}
              <div className={styles.previewTableHeader}>
                <h3 className={styles.previewTableTitle}>
                  <Users size={18} aria-hidden="true" />
                  Répartition par copropriétaire
                </h3>
                <span className={styles.previewTableCount}>
                  {repartitionPreview.length} copropriétaires
                </span>
              </div>

              <div className={styles.coproTableContainer}>
                <table className={styles.coproTable}>
                  <thead>
                    <tr>
                      <th>Copropriétaire</th>
                      <th>Lot</th>
                      <th className={styles.textRight}>Tantièmes</th>
                      <th className={styles.textRight}>Quote-part</th>
                      <th className={styles.textRight}>Montant appelé</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repartitionPreview.map((copro) => (
                      <tr key={copro.id}>
                        <td className={styles.coproNom}>{copro.nom}</td>
                        <td>{copro.lot}</td>
                        <td className={styles.textRight}>{copro.tantiemes}</td>
                        <td className={styles.textRight}>
                          {((copro.tantiemes / totalTantiemes) * 100).toFixed(2)}%
                        </td>
                        <td className={styles.textRight}>
                          <span className={styles.montant}>
                            {formatCurrency(copro.montantCalcule)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}><strong>TOTAL</strong></td>
                      <td className={styles.textRight}><strong>{totalTantiemes}</strong></td>
                      <td className={styles.textRight}><strong>100%</strong></td>
                      <td className={styles.textRight}>
                        <strong className={styles.montant}>
                          {formatCurrency(parseFloat(form.montantTotal) || 0)}
                        </strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Actions */}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={handleBackToForm}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Retour au formulaire
                </button>
                <button
                  type="button"
                  className={styles.submitButton}
                  onClick={handleConfirmSubmit}
                >
                  {isEdit ? <Edit size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
                  {isEdit ? 'Enregistrer les modifications' : "Créer l'appel de fonds"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
