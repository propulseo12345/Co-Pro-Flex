'use client';

import { useCallback, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import type { DepenseEtendue } from '@/types/models/finance';
import { depenseSchema } from '@/lib/validation/finance/depense';
import type { DepenseFormInput, DepenseFormOutput } from '@/lib/validation/finance/depense';
import { FormField, FormSelect } from '@/components/ui/FormField';
import type { PosteBudgetData, PieceJointeDepense } from '../types';
import { InvoiceUploadSection } from '../InvoiceUploadSection';
import { DepenseValidationPanel } from '../DepenseValidationPanel';
import { DepenseStatusBadge } from '../DepenseStatusBadge';
import styles from './DepenseEditorModal.module.css';

interface DepenseEditorModalProps {
  mode: 'create' | 'edit';
  depense?: DepenseEtendue;
  postesBudget: PosteBudgetData[];
  onSave: (depense: DepenseEtendue) => void;
  onClose: () => void;
  onSubmitForValidation: (depenseId: string) => void;
  onOpenInvoicePicker: () => void;
}

/** Comptes de charge pré-définis par poste (affichage dérivé, pas de saisie libre si poste sélectionné). */
const COMPTES_CHARGE: Record<string, string> = {
  eau: '602001 - Eau',
  electricite: '602002 - Électricité',
  assurance: '616 - Assurance',
  menage: '614001 - Ménage',
  ascenseur: '615001 - Ascenseur',
  espaces_verts: '614003 - Espaces verts',
  divers: '606 - Divers',
};

/** Date du jour au format YYYY-MM-DD en fuseau local. */
function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function DepenseEditorModal({
  mode,
  depense,
  postesBudget,
  onSave,
  onClose,
  onSubmitForValidation,
  onOpenInvoicePicker,
}: DepenseEditorModalProps) {
  const isEditable = !depense?.statut || depense.statut === 'BROUILLON' || depense.statut === 'REJETEE';

  const [pieceJointe, setPieceJointe] = useState<PieceJointeDepense | undefined>(
    depense?.pieceJointeDetails
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<DepenseFormInput, unknown, DepenseFormOutput>({
    resolver: zodResolver(depenseSchema),
    mode: 'onTouched',
    defaultValues: {
      date: depense?.date ?? todayISO(),
      libelle: depense?.libelle ?? '',
      fournisseur: depense?.fournisseur ?? '',
      montant: depense?.montant ?? '',
      poste: (depense?.poste as DepenseFormInput['poste']) ?? '',
      compteId: depense?.compteId ?? '',
      recuperable: depense?.recuperable ?? 0,
      deductible: depense?.deductible ?? 0,
    },
  });

  // Poste courant surveillé pour savoir si le champ compteId doit être verrouillé.
  // useWatch (pas watch()) pour respecter la règle react-hooks/* gelée.
  const watchedPoste = useWatch({ control, name: 'poste' });

  const handlePosteChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const poste = e.target.value as DepenseFormInput['poste'];
      // RHF est la source unique pour compteId : on synchronise via setValue.
      if (poste) {
        const compte = COMPTES_CHARGE[poste];
        setValue('compteId', compte ? compte.split(' - ')[0] : '', { shouldValidate: false });
      } else {
        // Retour à « -- Sélectionner -- » : vider compteId (identique à l'original ligne 83-87).
        setValue('compteId', '', { shouldValidate: false });
      }
    },
    [setValue]
  );

  const handlePieceJointeUpload = useCallback((pj: PieceJointeDepense) => {
    setPieceJointe(pj);
  }, []);

  const handlePieceJointeRemove = useCallback(() => {
    setPieceJointe(undefined);
  }, []);

  // onValid est appelé par handleSubmit APRÈS validation Zod.
  // La logique de construction du payload et l'appel onSave sont STRICTEMENT identiques
  // à l'original — seule la source des données change (data validé vs formData state).
  const onValid = useCallback(
    (data: DepenseFormOutput) => {
      const depenseToSave: DepenseEtendue = {
        id: depense?.id ?? `dep-${Date.now()}`,
        date: data.date,
        libelle: data.libelle,
        fournisseur: data.fournisseur,
        montant: data.montant,
        compteId: data.compteId ?? '',
        recuperable: data.recuperable ?? 0,
        deductible: data.deductible ?? 0,
        poste: data.poste !== '' ? data.poste : undefined,
        pieceJointe: pieceJointe?.fichierNom,
        pieceJointeDetails: pieceJointe,
        statut: depense?.statut ?? 'BROUILLON',
        budgetId: depense?.budgetId,
        dateCreation: depense?.dateCreation ?? new Date().toISOString(),
        dateDerniereModification: new Date().toISOString(),
      };

      onSave(depenseToSave);
    },
    [depense, pieceJointe, onSave]
  );

  // Soumission pour validation : onSubmitForValidation n'est appelée QUE SI
  // la validation Zod passe et que onValid s'est exécutée — la race condition
  // du blueprint initial est corrigée en imbriquant l'appel dans le callback.
  const handleSubmitForValidation = useCallback(() => {
    if (!depense?.id) return;
    const depenseId = depense.id;
    void handleSubmit((data) => {
      onValid(data);
      onSubmitForValidation(depenseId);
    })();
  }, [depense, handleSubmit, onValid, onSubmitForValidation]);

  return (
    <div className={styles.modalOverlay} onClick={onClose} aria-hidden="true">
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <h2 id="modal-title" className={styles.modalTitle}>
              {mode === 'create' ? 'Nouvelle dépense' : 'Modifier la dépense'}
            </h2>
            {depense?.statut && (
              <DepenseStatusBadge statut={depense.statut} size="sm" />
            )}
          </div>
          <button
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Fermer"
          >
            <X size={24} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onValid)}>
          <div className={styles.modalBody}>
            <div className={styles.formGrid}>
              {/* Colonne gauche — champs du formulaire */}
              <div className={styles.formColumn}>
                <FormField
                  label="Date"
                  required
                  type="date"
                  error={errors.date?.message}
                  disabled={!isEditable}
                  {...register('date')}
                />

                <FormField
                  label="Libellé"
                  required
                  type="text"
                  placeholder="Ex: Facture eau T1"
                  error={errors.libelle?.message}
                  disabled={!isEditable}
                  {...register('libelle')}
                />

                <FormField
                  label="Fournisseur"
                  required
                  type="text"
                  placeholder="Ex: Veolia Eau"
                  error={errors.fournisseur?.message}
                  disabled={!isEditable}
                  {...register('fournisseur')}
                />

                <div className={styles.formRow}>
                  <FormField
                    label="Montant (€)"
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.montant?.message}
                    disabled={!isEditable}
                    {...register('montant')}
                  />

                  <FormSelect
                    label="Poste budgétaire"
                    error={errors.poste?.message}
                    disabled={!isEditable}
                    {...register('poste', { onChange: handlePosteChange })}
                  >
                    <option value="">-- Sélectionner --</option>
                    {postesBudget.map((p) => (
                      <option key={p.poste} value={p.poste}>
                        {p.label}
                      </option>
                    ))}
                  </FormSelect>
                </div>

                {/* compteId : RHF est la source unique (pas de prop value= externe).
                    disabled quand un poste est actif (valeur dérivée via setValue). */}
                <FormField
                  label="Compte de charge"
                  type="text"
                  placeholder="Ex: 602001"
                  error={errors.compteId?.message}
                  disabled={!isEditable || !!watchedPoste}
                  {...register('compteId')}
                />

                <div className={styles.formRow}>
                  <FormField
                    label="Récupérable (€)"
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.recuperable?.message}
                    disabled={!isEditable}
                    {...register('recuperable')}
                  />

                  <FormField
                    label="Déductible (€)"
                    type="number"
                    min="0"
                    step="0.01"
                    error={errors.deductible?.message}
                    disabled={!isEditable}
                    {...register('deductible')}
                  />
                </div>
              </div>

              {/* Colonne droite — pièce justificative & validation */}
              <div className={styles.sideColumn}>
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Pièce justificative</h3>
                  <InvoiceUploadSection
                    pieceJointe={pieceJointe}
                    onUpload={handlePieceJointeUpload}
                    onRemove={handlePieceJointeRemove}
                    onLinkExisting={onOpenInvoicePicker}
                    required={true}
                    disabled={!isEditable}
                  />
                </div>

                {mode === 'edit' && (
                  <DepenseValidationPanel
                    depense={{ ...(depense ?? {}), pieceJointeDetails: pieceJointe }}
                    onSubmitForValidation={handleSubmitForValidation}
                    disabled={!isEditable}
                  />
                )}
              </div>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Annuler
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isEditable}
            >
              {mode === 'create' ? 'Créer la dépense' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
