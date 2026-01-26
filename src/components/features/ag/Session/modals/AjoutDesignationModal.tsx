'use client';

import { useId } from 'react';
import { UserPlus, CheckCircle, X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './AjoutDesignationModal.module.css';

type CategorieDesignation = 'scrutateur' | 'conseil_syndical';

interface AjoutDesignationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  categorie: CategorieDesignation;
  question: string;
  nombreActuel: number;
  nombreMinimum: number;
  nombreMaximum?: number;
}

export function AjoutDesignationModal({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  categorie,
  question,
  nombreActuel,
  nombreMinimum,
  nombreMaximum,
}: AjoutDesignationModalProps) {
  const titleId = useId();
  const descId = useId();
  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onCancel,
  });

  if (!isOpen) return null;

  const isMinimumAtteint = nombreActuel >= nombreMinimum;
  const isMaximumProche = nombreMaximum && nombreActuel >= nombreMaximum - 1;

  return (
    <div
      className={styles.overlay}
      onClick={onCancel}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.icon}>
          <UserPlus size={32} aria-hidden="true" />
        </div>

        <h2 id={titleId} className={styles.title}>
          {question}
        </h2>

        <p id={descId} className={styles.description}>
          {nombreActuel}{' '}
          {categorie === 'scrutateur' ? 'scrutateur(s)' : 'membre(s)'} désigné(s).
          {!isMinimumAtteint && (
            <span className={styles.warning}>
              {' '}
              (minimum requis : {nombreMinimum})
            </span>
          )}
          {nombreMaximum && (
            <span className={styles.info}> (maximum : {nombreMaximum})</span>
          )}
        </p>

        {isMaximumProche && (
          <p className={styles.maxWarning}>
            Vous atteignez bientôt le nombre maximum autorisé.
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onCancel}>
            <X size={18} aria-hidden="true" />
            Non, terminer
            {isMinimumAtteint && (
              <span className={styles.btnHint}>({nombreActuel} désignés)</span>
            )}
          </button>

          <button
            type="button"
            className={styles.confirmBtn}
            onClick={onConfirm}
            autoFocus
          >
            <UserPlus size={18} aria-hidden="true" />
            Oui, ajouter
          </button>
        </div>

        {!isMinimumAtteint && (
          <p className={styles.minimumWarning}>
            <CheckCircle size={14} aria-hidden="true" />
            Il est recommandé de désigner au moins {nombreMinimum}{' '}
            {categorie === 'scrutateur' ? 'scrutateurs' : 'membres'}.
          </p>
        )}
      </div>
    </div>
  );
}

export type { AjoutDesignationModalProps };
