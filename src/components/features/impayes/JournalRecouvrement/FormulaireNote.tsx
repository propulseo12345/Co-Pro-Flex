'use client';

import { useState, useCallback, useRef } from 'react';
import { Plus, X, Paperclip, Star, Lock, Upload } from 'lucide-react';
import type { CategorieNote, NoteJournal } from '@/types/models/impaye';
import { CATEGORIES_NOTES } from '@/lib/constants/categories-notes-recouvrement';
import styles from './JournalRecouvrement.module.css';

interface FormulaireNoteProps {
  /** Note à éditer (undefined = nouvelle note) */
  noteAEditer?: NoteJournal;
  /** Callback lors de la soumission */
  onSubmit: (data: {
    categorie: CategorieNote;
    contenu: string;
    important: boolean;
    confidentiel: boolean;
    fichiers?: File[];
  }) => Promise<void>;
  /** Callback pour annuler */
  onCancel?: () => void;
  /** État de chargement */
  isLoading?: boolean;
}

/**
 * Formulaire d'ajout/édition de note dans le journal
 */
export function FormulaireNote({
  noteAEditer,
  onSubmit,
  onCancel,
  isLoading,
}: FormulaireNoteProps) {
  const [isOpen, setIsOpen] = useState(!!noteAEditer);
  const [categorie, setCategorie] = useState<CategorieNote>(
    noteAEditer?.categorie || 'autre'
  );
  const [contenu, setContenu] = useState(noteAEditer?.contenu || '');
  const [important, setImportant] = useState(noteAEditer?.important || false);
  const [confidentiel, setConfidentiel] = useState(
    noteAEditer?.confidentiel || false
  );
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setCategorie('autre');
    setContenu('');
    setImportant(false);
    setConfidentiel(false);
    setFichiers([]);
    setError(null);
    onCancel?.();
  }, [onCancel]);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles) return;

      const newFiles = Array.from(selectedFiles);
      // Limite à 5 Mo par fichier
      const validFiles = newFiles.filter((f) => f.size <= 5 * 1024 * 1024);

      if (validFiles.length !== newFiles.length) {
        setError('Certains fichiers dépassent la limite de 5 Mo');
      }

      setFichiers((prev) => [...prev, ...validFiles]);
    },
    []
  );

  const handleRemoveFile = useCallback((index: number) => {
    setFichiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (!contenu.trim()) {
        setError('Le contenu de la note est requis');
        return;
      }

      try {
        await onSubmit({
          categorie,
          contenu: contenu.trim(),
          important,
          confidentiel,
          fichiers: fichiers.length > 0 ? fichiers : undefined,
        });

        handleClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de l'enregistrement"
        );
      }
    },
    [categorie, contenu, important, confidentiel, fichiers, onSubmit, handleClose]
  );

  // Bouton pour ouvrir le formulaire
  if (!isOpen) {
    return (
      <button
        type="button"
        className={styles.addButton}
        onClick={handleOpen}
        disabled={isLoading}
      >
        <Plus size={16} aria-hidden="true" />
        Ajouter une note
      </button>
    );
  }

  return (
    <form className={styles.formContainer} onSubmit={handleSubmit}>
      {/* En-tête */}
      <div className={styles.formHeader}>
        <h4 className={styles.formTitle}>
          {noteAEditer ? 'Modifier la note' : 'Nouvelle note'}
        </h4>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={handleClose}
          aria-label="Fermer le formulaire"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      {/* Corps du formulaire */}
      <div className={styles.formBody}>
        {/* Catégorie */}
        <div className={styles.formGroup}>
          <label htmlFor="note-categorie" className={styles.formLabel}>
            Catégorie
          </label>
          <select
            id="note-categorie"
            className={styles.formSelect}
            value={categorie}
            onChange={(e) => setCategorie(e.target.value as CategorieNote)}
            required
          >
            {CATEGORIES_NOTES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Contenu */}
        <div className={styles.formGroup}>
          <label htmlFor="note-contenu" className={styles.formLabel}>
            Contenu
          </label>
          <textarea
            id="note-contenu"
            className={styles.formTextarea}
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            placeholder="Décrivez l'action, l'échange ou l'événement..."
            required
          />
        </div>

        {/* Options */}
        <div className={styles.formCheckboxes}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
            />
            <Star size={14} aria-hidden="true" />
            Marquer comme important
          </label>

          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={confidentiel}
              onChange={(e) => setConfidentiel(e.target.checked)}
            />
            <Lock size={14} aria-hidden="true" />
            Note confidentielle
          </label>
        </div>

        {/* Pièces jointes */}
        <div className={styles.formGroup}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          />

          <button
            type="button"
            className={styles.addButton}
            style={{ background: 'var(--border)', color: 'var(--text-main)' }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={14} aria-hidden="true" />
            Ajouter des pièces jointes
          </button>

          {fichiers.length > 0 && (
            <div className={styles.attachmentsList} style={{ marginTop: '0.5rem' }}>
              {fichiers.map((fichier, index) => (
                <span key={index} className={styles.attachmentItem}>
                  <Paperclip size={12} aria-hidden="true" />
                  {fichier.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      marginLeft: '0.25rem',
                    }}
                    aria-label={`Retirer ${fichier.name}`}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)', margin: 0 }}>
            {error}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className={styles.formActions}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleClose}
          disabled={isLoading}
        >
          Annuler
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isLoading || !contenu.trim()}
        >
          {isLoading
            ? 'Enregistrement...'
            : noteAEditer
            ? 'Modifier'
            : 'Ajouter la note'}
        </button>
      </div>
    </form>
  );
}

export default FormulaireNote;
