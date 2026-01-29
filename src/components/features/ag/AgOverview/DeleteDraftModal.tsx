'use client';

import { useState } from 'react';
import { X, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import styles from './DeleteDraftModal.module.css';

interface DeleteDraftModalProps {
  isOpen: boolean;
  draftTitle: string;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
}

/**
 * Modale de confirmation pour la suppression d'un brouillon d'AG
 * Affiche un état de chargement pendant la suppression et gère les erreurs
 */
export function DeleteDraftModal({
  isOpen,
  draftTitle,
  onClose,
  onConfirm,
}: DeleteDraftModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const success = await onConfirm();
      if (success) {
        onClose();
      } else {
        setError('La suppression a échoué. Veuillez réessayer.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Une erreur est survenue lors de la suppression.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        aria-describedby="delete-modal-description"
      >
        <button
          className={styles.closeBtn}
          onClick={handleClose}
          disabled={isDeleting}
          aria-label="Fermer"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div className={styles.iconWrapper}>
          <AlertTriangle size={48} aria-hidden="true" />
        </div>

        <h2 id="delete-modal-title" className={styles.title}>
          Supprimer ce brouillon ?
        </h2>

        <p id="delete-modal-description" className={styles.description}>
          Vous êtes sur le point de supprimer le brouillon{' '}
          <strong>&quot;{draftTitle}&quot;</strong>.
        </p>

        <p className={styles.warning}>
          Cette action supprimera définitivement l'AG et toutes ses données
          associées (résolutions, présences, votes, convocations...).
        </p>

        {error && (
          <div className={styles.error} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={handleClose}
            disabled={isDeleting}
          >
            Annuler
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className={styles.spinner} aria-hidden="true" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 size={16} aria-hidden="true" />
                Supprimer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
