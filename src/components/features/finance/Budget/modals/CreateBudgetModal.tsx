'use client';

import { X, FileText, Hammer, Copy, AlertCircle, Plus, Upload, Trash2 } from 'lucide-react';
import { useState, useId, useCallback, useRef } from 'react';
import { BudgetEditorModal } from './BudgetEditorModal';
import { POSTES_BUDGET_PREDEFINIS, TYPES_TRAVAUX } from '@/lib/constants/budget-postes';
import type { PosteEditorData } from '../PosteEditor';
import { NouveauBudgetForm, DevisDocument } from '../types';
import { BudgetStatut } from '@/types/enums/statuts';
import { PAYMENT_SCHEDULE_TEMPLATES } from '@/lib/constants/payment-schedule-templates';
import type { PaymentScheduleTemplate } from '@/lib/constants/payment-schedule-templates';
import { PaymentSchedulePreview } from '../PaymentSchedulePreview';
import styles from './CreateBudgetModal.module.css';

interface BudgetN1Data {
  year: number;
  postes: PosteEditorData[];
  total: number;
}

interface CreateBudgetModalProps {
  selectedYear: number;
  budgetN1?: BudgetN1Data;
  onCreateBudget: (form: NouveauBudgetForm) => void;
  onClose: () => void;
}

type Step = 'type' | 'creation-mode' | 'editor';

export function CreateBudgetModal({
  selectedYear,
  budgetN1,
  onCreateBudget,
  onClose,
}: CreateBudgetModalProps) {
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('type');
  const [budgetType, setBudgetType] = useState<'fonctionnement' | 'travaux' | null>(null);
  const [budgetYear, setBudgetYear] = useState(selectedYear + 1);
  const [budgetName, setBudgetName] = useState('');
  const [initialPostes, setInitialPostes] = useState<PosteEditorData[]>([]);
  const [showN1Warning, setShowN1Warning] = useState(false);

  // États spécifiques aux budgets travaux
  const [typeTravaux, setTypeTravaux] = useState<string>('');
  const [montantTotal, setMontantTotal] = useState<number>(0);
  const [description, setDescription] = useState<string>('');
  const [devisDocuments, setDevisDocuments] = useState<DevisDocument[]>([]);
  const [currentDevisMontant, setCurrentDevisMontant] = useState<number>(0);
  const [scheduleTemplate, setScheduleTemplate] = useState<PaymentScheduleTemplate>('classic');
  const [withRetention, setWithRetention] = useState(false);
  const [schedulePhases, setSchedulePhases] = useState<{ label: string; percentage: number; dueDate?: string }[]>([]);

  const hasN1Budget = !!budgetN1 && budgetN1.postes.length > 0;

  const handleSelectType = useCallback((type: 'fonctionnement' | 'travaux') => {
    setBudgetType(type);
    if (type === 'fonctionnement') {
      setStep('creation-mode');
    }
  }, []);

  const handleCreateEmpty = useCallback(() => {
    setInitialPostes([]);
    setStep('editor');
  }, []);

  const handleCreateFromN1 = useCallback(() => {
    if (!hasN1Budget) {
      setShowN1Warning(true);
      return;
    }

    const postesFromN1: PosteEditorData[] = budgetN1!.postes.map((p, index) => ({
      id: `poste-n1-${index}-${Date.now()}`,
      libelle: p.libelle,
      montant: p.montant,
      posteId: p.posteId,
    }));

    setInitialPostes(postesFromN1);
    setStep('editor');
  }, [hasN1Budget, budgetN1]);

  const handleSaveFromEditor = useCallback(
    (postes: PosteEditorData[], total: number) => {
      const form: NouveauBudgetForm = {
        annee: budgetYear,
        type: 'fonctionnement',
        nom: budgetName || undefined,
        montantTotal: total,
        statut: BudgetStatut.BROUILLON,
        lignesBudget: postes.map((p) => ({
          poste: p.libelle,
          montantN: p.montant,
          montantN1: 0,
          evolution: 0,
        })),
      };
      onCreateBudget(form);
      onClose();
    },
    [budgetYear, budgetName, onCreateBudget, onClose]
  );

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const newDevis: DevisDocument = {
      id: `devis-${Date.now()}`,
      nom: file.name,
      url: URL.createObjectURL(file),
      montant: currentDevisMontant,
      dateAjout: new Date().toISOString().split('T')[0],
      taille: `${(file.size / 1024).toFixed(0)} KB`,
      file,
    };

    setDevisDocuments(prev => [...prev, newDevis]);
    setCurrentDevisMontant(0);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [currentDevisMontant]);

  const handleRemoveDevis = useCallback((devisId: string) => {
    setDevisDocuments(prev => prev.filter(d => d.id !== devisId));
  }, []);

  const totalDevis = devisDocuments.reduce((sum, d) => sum + d.montant, 0);

  const handleSubmitTravaux = useCallback(() => {
    const form: NouveauBudgetForm = {
      annee: budgetYear,
      type: 'travaux',
      nom: budgetName || undefined,
      typeTravaux: typeTravaux || undefined,
      description: description || undefined,
      montantTotal: montantTotal,
      statut: BudgetStatut.BROUILLON,
      lignesBudget: [],
      devisDocuments: devisDocuments.length > 0 ? devisDocuments : undefined,
      paymentScheduleConfig: {
        templateId: scheduleTemplate,
        withRetention,
        phases: schedulePhases,
      },
    };
    onCreateBudget(form);
    onClose();
  }, [budgetYear, budgetName, typeTravaux, description, montantTotal, devisDocuments, scheduleTemplate, withRetention, schedulePhases, onCreateBudget, onClose]);

  const handleBack = useCallback(() => {
    if (step === 'creation-mode') {
      setStep('type');
      setBudgetType(null);
      setShowN1Warning(false);
    } else if (step === 'editor') {
      setStep('creation-mode');
      setShowN1Warning(false);
    }
  }, [step]);

  // Render BudgetEditorModal
  if (step === 'editor') {
    return (
      <BudgetEditorModal
        year={budgetYear}
        initialPostes={initialPostes}
        onSave={handleSaveFromEditor}
        onClose={onClose}
      />
    );
  }

  // Render creation mode choice for fonctionnement
  if (step === 'creation-mode') {
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
            <h2 id={titleId} className={styles.modalTitle}>
              Budget de fonctionnement {budgetYear}
            </h2>
            <button
              onClick={onClose}
              className={styles.closeButton}
              aria-label="Fermer"
            >
              <X size={24} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.modalBody}>
            <p className={styles.subtitle}>
              Comment souhaitez-vous créer ce budget ?
            </p>

            <div className={styles.optionsGrid}>
              <button
                type="button"
                className={styles.optionCard}
                onClick={handleCreateEmpty}
              >
                <div className={styles.optionIcon}>
                  <FileText size={32} aria-hidden="true" />
                </div>
                <div className={styles.optionContent}>
                  <h3 className={styles.optionTitle}>Créer à partir de zéro</h3>
                  <p className={styles.optionDescription}>
                    Budget vierge à configurer selon vos besoins
                  </p>
                </div>
              </button>

              <button
                type="button"
                className={`${styles.optionCard} ${!hasN1Budget ? styles.optionDisabled : ''}`}
                onClick={handleCreateFromN1}
              >
                <div className={styles.optionIcon}>
                  <Copy size={32} aria-hidden="true" />
                </div>
                <div className={styles.optionContent}>
                  <h3 className={styles.optionTitle}>
                    Reprendre le budget {selectedYear}
                  </h3>
                  <p className={styles.optionDescription}>
                    {hasN1Budget
                      ? `Tous les postes pré-remplis (${budgetN1!.postes.length} postes, ${budgetN1!.total.toLocaleString('fr-FR')} €)`
                      : 'Aucun budget disponible pour cette année'}
                  </p>
                </div>
                {!hasN1Budget && (
                  <div className={styles.optionBadge}>
                    <AlertCircle size={14} aria-hidden="true" />
                    Non disponible
                  </div>
                )}
              </button>
            </div>

            {showN1Warning && !hasN1Budget && (
              <div className={styles.warningBox}>
                <AlertCircle size={18} aria-hidden="true" />
                <div className={styles.warningContent}>
                  <p className={styles.warningTitle}>
                    Aucun budget {selectedYear} trouvé
                  </p>
                  <p className={styles.warningText}>
                    Il n&apos;existe pas de budget pour l&apos;année {selectedYear}.
                    Vous pouvez créer un budget vierge à la place.
                  </p>
                  <button
                    type="button"
                    className={styles.warningButton}
                    onClick={handleCreateEmpty}
                  >
                    Créer un budget vierge
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button onClick={handleBack} className="btn btn-secondary">
              Retour
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render type selection (initial step)
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
          <h2 id={titleId} className={styles.modalTitle}>Créer un budget</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.subtitle}>
            Sélectionnez le type de budget que vous souhaitez créer.
          </p>

          <div className={styles.typeCardsGrid}>
            <button
              type="button"
              onClick={() => handleSelectType('fonctionnement')}
              className={`${styles.typeCard} ${budgetType === 'fonctionnement' ? styles.typeCardActive : ''}`}
            >
              <div className={`${styles.typeCardIcon} ${styles.typeCardIconFonctionnement}`}>
                <FileText size={24} aria-hidden="true" />
              </div>
              <p className={styles.typeCardTitle}>Budget de fonctionnement</p>
              <p className={styles.typeCardDescription}>
                Charges courantes, entretien, assurances
              </p>
            </button>

            <button
              type="button"
              onClick={() => handleSelectType('travaux')}
              className={`${styles.typeCard} ${budgetType === 'travaux' ? styles.typeCardActive : ''}`}
            >
              <div className={`${styles.typeCardIcon} ${styles.typeCardIconTravaux}`}>
                <Hammer size={24} aria-hidden="true" />
              </div>
              <p className={styles.typeCardTitle}>Budget travaux</p>
              <p className={styles.typeCardDescription}>
                Gros travaux, rénovations, améliorations
              </p>
            </button>
          </div>

          {budgetType === 'travaux' && (
            <div className={styles.configSection}>
              <h4 className={styles.configTitle}>Configuration du budget travaux</h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* Ligne 1 : Type de travaux et Année */}
                <div className={styles.configGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="type-travaux">
                      Type de travaux *
                    </label>
                    <select
                      id="type-travaux"
                      className={styles.input}
                      value={typeTravaux}
                      onChange={(e) => setTypeTravaux(e.target.value)}
                    >
                      <option value="">Sélectionner un type</option>
                      {TYPES_TRAVAUX.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="budget-year">
                      Année budgétaire
                    </label>
                    <input
                      id="budget-year"
                      type="number"
                      className={styles.input}
                      value={budgetYear}
                      onChange={(e) => setBudgetYear(Number(e.target.value))}
                      min={selectedYear}
                      max={selectedYear + 5}
                    />
                  </div>
                </div>

                {/* Ligne 2 : Nom et Montant */}
                <div className={styles.configGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="budget-name">
                      Nom du budget *
                    </label>
                    <input
                      id="budget-name"
                      type="text"
                      className={styles.input}
                      value={budgetName}
                      onChange={(e) => setBudgetName(e.target.value)}
                      placeholder={`Ex: Ravalement façade ${budgetYear}`}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="montant-total">
                      Montant total du budget *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        id="montant-total"
                        type="number"
                        className={styles.input}
                        value={montantTotal || ''}
                        onChange={(e) => setMontantTotal(Number(e.target.value))}
                        min={0}
                        step={100}
                        placeholder="0"
                        style={{ paddingRight: '30px' }}
                      />
                      <span style={{
                        position: 'absolute',
                        right: 'var(--space-md)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                      }}>
                        €
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="description">
                    Description des travaux
                  </label>
                  <textarea
                    id="description"
                    className={styles.input}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez les travaux prévus..."
                    rows={3}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                {/* Section Devis */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-lg)' }}>
                  <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 var(--space-md) 0' }}>
                    Devis (optionnel)
                  </h5>

                  {/* Liste des devis ajoutés */}
                  {devisDocuments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
                      {devisDocuments.map((devis) => (
                        <div
                          key={devis.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-sm) var(--space-md)',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <FileText size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                            <span style={{ fontSize: 'var(--text-sm)' }}>{devis.nom}</span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                              ({devis.taille})
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>
                              {devis.montant.toLocaleString('fr-FR')} €
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveDevis(devis.id)}
                              style={{
                                padding: 'var(--space-xs)',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--danger)',
                              }}
                              aria-label={`Supprimer ${devis.nom}`}
                            >
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ))}
                      <div style={{ textAlign: 'right', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        Total devis : <strong>{totalDevis.toLocaleString('fr-FR')} €</strong>
                      </div>
                    </div>
                  )}

                  {/* Formulaire d'ajout de devis */}
                  <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
                    <div className={styles.formGroup} style={{ flex: 1 }}>
                      <label className={styles.label} htmlFor="devis-montant">
                        Montant du devis
                      </label>
                      <input
                        id="devis-montant"
                        type="number"
                        className={styles.input}
                        value={currentDevisMontant || ''}
                        onChange={(e) => setCurrentDevisMontant(Number(e.target.value))}
                        min={0}
                        step={100}
                        placeholder="0 €"
                      />
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        id="devis-file"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={currentDevisMontant <= 0}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <Upload size={16} aria-hidden="true" />
                        Ajouter un devis
                      </button>
                    </div>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', margin: 'var(--space-xs) 0 0 0' }}>
                    Formats acceptés : PDF, JPG, PNG
                  </p>
                </div>

                {/* Section Échéancier */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-lg)' }}>
                  <h5 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 var(--space-md) 0' }}>
                    Échéancier de paiement
                  </h5>

                  <div className={styles.configGrid}>
                    <div className={styles.formGroup}>
                      <label className={styles.label} htmlFor="schedule-template">
                        Modèle d&apos;échéancier
                      </label>
                      <select
                        id="schedule-template"
                        className={styles.input}
                        value={scheduleTemplate}
                        onChange={(e) => setScheduleTemplate(e.target.value as PaymentScheduleTemplate)}
                      >
                        {PAYMENT_SCHEDULE_TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} — {t.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.formGroup} style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={withRetention}
                          onChange={(e) => setWithRetention(e.target.checked)}
                        />
                        Retenue de garantie 5%
                      </label>
                    </div>
                  </div>

                  {montantTotal > 0 && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      <PaymentSchedulePreview
                        totalAmount={montantTotal}
                        templateId={scheduleTemplate}
                        withRetention={withRetention}
                        onPhasesChange={setSchedulePhases}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.infoBox} style={{ marginTop: 'var(--space-lg)' }}>
                <p className={styles.infoText}>
                  Le budget sera créé en <strong>brouillon</strong>. Vous pourrez ensuite le lier à une Assemblée Générale pour approbation, puis générer des appels de fonds.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          {budgetType === 'travaux' && (
            <button
              className="btn btn-primary"
              onClick={handleSubmitTravaux}
              disabled={!typeTravaux || !budgetName || montantTotal <= 0}
            >
              <Plus size={16} aria-hidden="true" />
              Créer le budget travaux
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Export de données mockées N-1 pour les tests
export function getMockBudgetN1(year: number): BudgetN1Data | undefined {
  if (year !== 2024) return undefined;

  return {
    year: 2024,
    postes: POSTES_BUDGET_PREDEFINIS.slice(0, 5).map((p, index) => ({
      id: `mock-${index}`,
      libelle: p.label,
      montant: [12000, 8500, 4200, 14400, 3600][index] || 0,
      posteId: p.id,
    })),
    total: 42700,
  };
}
