'use client';

import { X, AlertTriangle, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from './mail-components.module.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  icon?: ReactNode;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmer',
  confirmVariant = 'danger',
  icon,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">
          <X size={20} aria-hidden="true" />
        </button>
        <div className={styles.modalIcon}>
          {icon || <AlertTriangle size={48} aria-hidden="true" />}
        </div>
        <h2 id="modal-title" className={styles.modalTitle}>
          {title}
        </h2>
        <p className={styles.modalText}>{message}</p>
        <div className={styles.modalActions}>
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className={`btn btn-${confirmVariant}`}
            onClick={onConfirm}
          >
            <Trash2 size={16} style={{ marginRight: 8 }} aria-hidden="true" />
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
