'use client';

import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';
import styles from './agDashboard.shared.module.css';

interface ConfirmModalProps {
  open: boolean;
  icon?: ReactNode;
  title: string;
  description: ReactNode;
  warning?: string;
  confirmLabel: string;
  confirmIcon?: ReactNode;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmModal({
  open,
  icon,
  title,
  description,
  warning,
  confirmLabel,
  confirmIcon,
  cancelLabel = 'Annuler',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {icon && <div className={styles.modalIcon}>{icon}</div>}
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalText}>{description}</p>
        {warning && <p className={styles.modalWarning}>{warning}</p>}
        <div className={styles.modalActions}>
          <button
            onClick={onCancel}
            className={clsx(styles.modalBtn, styles.modalBtnCancel)}
            disabled={isLoading}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={clsx(styles.modalBtn, styles.modalBtnDanger)}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className={styles.spinning} aria-hidden="true" />
                {confirmLabel}...
              </>
            ) : (
              <>
                {confirmIcon}
                {confirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
