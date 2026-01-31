'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
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
  const [titre, setTitre] = useState(resolution.titre);
  const [texte, setTexte] = useState(resolution.texte);
  const [majorite, setMajorite] = useState<MajorityType>(resolution.majorite);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset form when resolution changes
  useEffect(() => {
    setTitre(resolution.titre);
    setTexte(resolution.texte);
    setMajorite(resolution.majorite);
    setValidationError(null);
  }, [resolution]);

  const handleSave = useCallback(() => {
    if (!titre.trim()) {
      setValidationError('Le titre est obligatoire');
      return;
    }
    if (!texte.trim()) {
      setValidationError('Le texte est obligatoire');
      return;
    }
    setValidationError(null);
    onSave({
      id: resolution.id,
      titre: titre.trim(),
      texte: texte.trim(),
      majorite,
    });
  }, [titre, texte, majorite, resolution.id, onSave]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      // Ctrl/Cmd + Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    },
    [onCancel, handleSave]
  );

  const displayError = validationError || error;

  return (
    <div className={styles.editor} onKeyDown={handleKeyDown}>
      <div className={styles.field}>
        <label htmlFor="edit-titre" className={styles.label}>
          Titre
        </label>
        <input
          id="edit-titre"
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className={`${styles.input} ${!titre.trim() && validationError ? styles.inputError : ''}`}
          placeholder="Titre de la résolution"
          autoFocus
          disabled={isLoading}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="edit-texte" className={styles.label}>
          Texte de la résolution
        </label>
        <textarea
          id="edit-texte"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          className={`${styles.textarea} ${!texte.trim() && validationError ? styles.inputError : ''}`}
          placeholder="Texte complet de la résolution..."
          rows={6}
          disabled={isLoading}
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
          value={majorite}
          onChange={(e) => setMajorite(e.target.value as MajorityType)}
          className={styles.select}
          disabled={isLoading}
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
          onClick={handleSave}
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
