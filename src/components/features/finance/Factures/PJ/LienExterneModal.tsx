'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { validateUrl } from '../types';
import styles from './LienExterneModal.module.css';

interface LienExterneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, nom?: string) => void;
}

/**
 * Modal pour ajouter un lien externe comme pièce jointe
 */
export function LienExterneModal({ isOpen, onClose, onConfirm }: LienExterneModalProps) {
  const [url, setUrl] = useState('');
  const [nom, setNom] = useState('');
  const [error, setError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Focus sur l'input URL à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setNom('');
      setError(null);
      setTimeout(() => {
        urlInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Fermer avec Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      const trimmedUrl = url.trim();
      if (!trimmedUrl) {
        setError('L\'URL est requise');
        return;
      }

      const validation = validateUrl(trimmedUrl);
      if (!validation.valid) {
        setError(validation.error || 'URL invalide');
        return;
      }

      onConfirm(trimmedUrl, nom.trim() || undefined);
      onClose();
    },
    [url, nom, onConfirm, onClose]
  );

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lien-externe-modal-title"
      >
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <LinkIcon size={20} aria-hidden="true" />
          </div>
          <h2 id="lien-externe-modal-title" className={styles.title}>
            Ajouter un lien externe
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <div className={styles.formGroup}>
            <label htmlFor="lien-url" className={styles.label}>
              URL <span className={styles.required}>*</span>
            </label>
            <input
              ref={urlInputRef}
              id="lien-url"
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError(null);
              }}
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              placeholder="https://exemple.com/document.pdf"
            />
            {error && (
              <div className={styles.error}>
                <AlertCircle size={14} aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="lien-nom" className={styles.label}>
              Nom personnalisé <span className={styles.optional}>(optionnel)</span>
            </label>
            <input
              id="lien-nom"
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className={styles.input}
              placeholder="Ex: Facture fournisseur"
            />
            <p className={styles.hint}>
              Si vide, le nom sera extrait de l'URL
            </p>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className={styles.confirmButton}>
              <LinkIcon size={16} aria-hidden="true" />
              Ajouter le lien
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
