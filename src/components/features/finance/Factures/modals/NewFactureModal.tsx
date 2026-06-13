'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';
import { X, Plus, AlertCircle } from 'lucide-react';
import { NewFactureForm, PJFacture, calculerDateEcheanceDefaut, PosteBudget } from '../types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import { detectPosteBudgetaire, getResteDisponible, formatCurrency, POSTE_BUDGET_LABELS } from '../utils';
import { PosteBudgetSelector } from '../PosteBudgetSelector';
import { FacturePJSection } from '../PJ';
import { FormField } from '@/components/ui/FormField';
import { factureSchema } from '@/lib/validation/finance/facture';
import styles from '../Factures.module.css';

type FactureInput = z.input<typeof factureSchema>;
type FactureOutput = z.output<typeof factureSchema>;

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

/** Date du jour au format YYYY-MM-DD en fuseau local. */
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function NewFactureModal({
  form,
  postesBudget,
  suppliers = [],
  createError,
  isCreating,
  onFormChange,
  onClose,
  onCreate,
}: NewFactureModalProps) {
  const [pjError, setPjError] = useState<string | null>(null);
  const [suggestedPoste, setSuggestedPoste] = useState<PosteBudget | null>(null);

  const initialDate = form.date || todayISO();
  const initialEcheance = form.dateEcheance || calculerDateEcheanceDefaut(initialDate);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<FactureInput, unknown, FactureOutput>({
    resolver: zodResolver(factureSchema),
    mode: 'onTouched',
    defaultValues: {
      date: initialDate,
      dateEcheance: initialEcheance,
      fournisseur: form.fournisseur ?? '',
      reference: form.reference ?? '',
      montant: form.montant ?? '',
      posteBudgetaire: (form.posteBudgetaire as FactureInput['posteBudgetaire']) ?? undefined,
    },
  });

  // Observer le montant pour le passer à PosteBudgetSelector (warning dépassement).
  // useWatch évite de réveiller la règle lint react-hooks/exhaustive-deps sur watch().
  const watchedMontantStr = useWatch({ control, name: 'montant' });
  const watchedFournisseur = useWatch({ control, name: 'fournisseur' });
  const numericMontant = Number(watchedMontantStr) || 0;

  // Ref pour éviter les closures stale dans handlePJChange
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  // Détection automatique du poste budgétaire quand le fournisseur change.
  // On synchronise aussi vers le parent via onFormChange.
  useEffect(() => {
    if (watchedFournisseur) {
      const detected = detectPosteBudgetaire({ fournisseur: watchedFournisseur });
      setSuggestedPoste(detected);
      if (!formRef.current.posteBudgetaire && detected) {
        onFormChange({ ...formRef.current, fournisseur: watchedFournisseur, posteBudgetaire: detected });
        setValue('posteBudgetaire', detected as FactureInput['posteBudgetaire'], { shouldValidate: true });
      } else {
        onFormChange({ ...formRef.current, fournisseur: watchedFournisseur });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedFournisseur]);

  const handlePJChange = useCallback(
    (piecesJointes: PJFacture[]) => {
      onFormChange({ ...formRef.current, piecesJointes });
      setPjError(null);
    },
    [onFormChange]
  );

  // Appelé par RHF après validation Zod réussie.
  // submissionLogicTouched: false — on construit le NewFactureForm validé,
  // on l'envoie au parent via onFormChange, puis on appelle onCreate().
  const onValid = (data: FactureOutput) => {
    setPjError(null);

    // Vérification dépassement budgétaire : warning d'UI, jamais bloquant.
    const resteDisponible = getResteDisponible(data.posteBudgetaire as PosteBudget, postesBudget);
    if (resteDisponible !== null && data.montant > resteDisponible) {
      const confirmDepassement = window.confirm(
        `Attention : Cette facture de ${formatCurrency(data.montant)} dépasse le budget restant ` +
          `de ${formatCurrency(resteDisponible)} pour le poste "${POSTE_BUDGET_LABELS[data.posteBudgetaire as PosteBudget]}".\n\n` +
          `Cette action nécessite une validation du syndic. Continuer ?`
      );
      if (!confirmDepassement) return;
    }

    // Synchroniser le parent avec les données validées/coercées.
    onFormChange({
      ...formRef.current,
      date: data.date,
      dateEcheance: data.dateEcheance,
      fournisseur: data.fournisseur,
      reference: data.reference,
      montant: String(data.montant),
      posteBudgetaire: data.posteBudgetaire as PosteBudget,
    });

    // Appel de soumission identique à l'original — payload/RPC inchangés.
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
          <h2 id="new-facture-modal-title" className={styles.modalTitle}>
            Nouvelle facture
          </h2>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)}>
          <div className={styles.modalBody}>
            <div className={styles.formRow}>
              <FormField
                label="Date facture"
                required
                type="date"
                error={errors.date?.message}
                {...register('date', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    const newDate = e.target.value;
                    const echeance = newDate ? calculerDateEcheanceDefaut(newDate) : '';
                    setValue('dateEcheance', echeance, { shouldValidate: true });
                    onFormChange({ ...formRef.current, date: newDate, dateEcheance: echeance });
                  },
                })}
              />

              <FormField
                label="Date d'échéance"
                required
                type="date"
                hint="30 jours fin de mois par défaut"
                error={errors.dateEcheance?.message}
                {...register('dateEcheance', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    onFormChange({ ...formRef.current, dateEcheance: e.target.value });
                  },
                })}
              />
            </div>

            <FormField
              label="Fournisseur"
              required
              type="text"
              list="fournisseurs-list"
              placeholder="Saisir ou sélectionner un fournisseur..."
              autoComplete="off"
              error={errors.fournisseur?.message}
              {...register('fournisseur')}
            />
            <datalist id="fournisseurs-list">
              {suppliers.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>

            <FormField
              label="Référence"
              required
              type="text"
              placeholder="Ex: FAC-2025-001"
              error={errors.reference?.message}
              {...register('reference')}
            />

            <FormField
              label="Montant (EUR)"
              required
              type="number"
              step="0.01"
              placeholder="Ex: 1250.00"
              error={errors.montant?.message}
              {...register('montant')}
            />

            {/* PosteBudgetSelector : composant custom non natif → Controller */}
            <div className={styles.formGroup}>
              <label>
                Poste budgétaire <span className={styles.required}>*</span>
              </label>
              <Controller
                control={control}
                name="posteBudgetaire"
                render={({ field }) => (
                  <PosteBudgetSelector
                    value={field.value as PosteBudget | undefined}
                    onChange={(poste) => {
                      field.onChange(poste);
                      onFormChange({ ...formRef.current, posteBudgetaire: poste });
                    }}
                    montantFacture={numericMontant}
                    postesBudget={postesBudget}
                    suggestedPoste={suggestedPoste}
                    required
                  />
                )}
              />
              {errors.posteBudgetaire?.message && (
                <p className={styles.errorMessage} role="alert">
                  {errors.posteBudgetaire.message}
                </p>
              )}
            </div>

            {/* Section Pièces Jointes — hors périmètre RHF, géré par FacturePJSection */}
            <div className={styles.formGroup}>
              <FacturePJSection
                initialPJ={form.piecesJointes || []}
                onChange={handlePJChange}
                required={false}
              />
              {(!form.piecesJointes || form.piecesJointes.length === 0) && (
                <div className={styles.warningMessage}>
                  <AlertCircle size={14} aria-hidden="true" />
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
                <span className={styles.errorMessage}>
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{createError}</span>
                </span>
              </div>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isCreating}
            >
              Annuler
            </button>
            <button type="submit" className={styles.payButton} disabled={isCreating}>
              <Plus size={20} aria-hidden="true" />
              {isCreating ? 'Création en cours...' : 'Créer la facture'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
