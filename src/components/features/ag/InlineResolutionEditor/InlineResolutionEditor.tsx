'use client';

import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, X, AlertCircle } from 'lucide-react';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import {
  resolutionInlineSchema,
  type ResolutionInlineInput,
  type ResolutionInlineOutput,
} from '@/lib/validation/ag/resolution-inline';
import styles from './InlineResolutionEditor.module.css';

export interface ResolutionEditData {
  id: string;
  titre: string;
  texte: string;
  majorite: MajorityType;
}

interface InlineResolutionEditorProps {
  resolution: ResolutionEditData;
  onSave: (data: ResolutionEditData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

export function InlineResolutionEditor({
  resolution,
  onSave,
  onCancel,
  isLoading = false,
  error = null,
}: InlineResolutionEditorProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResolutionInlineInput, unknown, ResolutionInlineOutput>({
    resolver: zodResolver(resolutionInlineSchema),
    mode: 'onTouched',
    defaultValues: {
      titre: resolution.titre,
      texte: resolution.texte,
      majorite: resolution.majorite,
    },
  });

  // Réinitialise le formulaire quand la résolution éditée change.
  useEffect(() => {
    reset({
      titre: resolution.titre,
      texte: resolution.texte,
      majorite: resolution.majorite,
    });
  }, [resolution, reset]);

  // Soumission inchangée : on reconstruit le ResolutionEditData (id préservé)
  // et on appelle onSave. titre/texte sont déjà trim()és par le schéma Zod.
  const onValid = useCallback(
    (data: ResolutionInlineOutput) => {
      onSave({
        id: resolution.id,
        titre: data.titre,
        texte: data.texte,
        majorite: data.majorite,
      });
    },
    [onSave, resolution.id]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      // Ctrl/Cmd + Enter pour enregistrer
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleSubmit(onValid)();
      }
    },
    [onCancel, handleSubmit, onValid]
  );

  // Une seule ligne d'erreur (comme avant), désormais pilotée par Zod/RHF :
  // priorité aux erreurs de champ, puis à l'erreur de soumission du parent.
  const displayError =
    errors.titre?.message || errors.texte?.message || errors.majorite?.message || error;

  return (
    <div className={styles.editor} onKeyDown={handleKeyDown}>
      <div className={styles.field}>
        <label htmlFor="edit-titre" className={styles.label}>
          Titre
        </label>
        <input
          id="edit-titre"
          type="text"
          className={`${styles.input} ${errors.titre ? styles.inputError : ''}`}
          placeholder="Titre de la résolution"
          autoFocus
          disabled={isLoading}
          {...register('titre')}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-texte" className={styles.label}>
          Texte de la résolution
        </label>
        <textarea
          id="edit-texte"
          className={`${styles.textarea} ${errors.texte ? styles.inputError : ''}`}
          placeholder="Texte complet de la résolution..."
          rows={6}
          disabled={isLoading}
          {...register('texte')}
        />
        <p className={styles.hint}>
          Utilisez {'{'}variable{'}'} pour les champs dynamiques (ex: {'{'}date_debut{'}'}, {'{'}montant{'}'})
        </p>
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-majorite" className={styles.label}>
          Majorité requise
        </label>
        <select
          id="edit-majorite"
          className={styles.select}
          disabled={isLoading}
          {...register('majorite')}
        >
          {Object.entries(MAJORITES).map(([key, maj]) => (
            <option key={key} value={key}>
              {maj.nom} - {maj.description}
            </option>
          ))}
        </select>
      </div>

      {displayError && (
        <div className={styles.error}>
          <AlertCircle size={14} />
          <span>{displayError}</span>
        </div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          onClick={onCancel}
          className={styles.cancelBtn}
          disabled={isLoading}
        >
          <X size={14} />
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSubmit(onValid)}
          className={styles.saveBtn}
          disabled={isLoading}
        >
          <Check size={14} />
          {isLoading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      <p className={styles.shortcuts}>
        <kbd>Esc</kbd> annuler &bull; <kbd>Ctrl</kbd>+<kbd>Enter</kbd> enregistrer
      </p>
    </div>
  );
}
