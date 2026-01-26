'use client';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import styles from './mail-components.module.css';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  isVisible: boolean;
  message: string;
  type?: ToastType;
  onClose?: () => void;
}

const iconMap = {
  success: <CheckCircle2 size={20} aria-hidden="true" />,
  error: <AlertCircle size={20} aria-hidden="true" />,
  info: <Info size={20} aria-hidden="true" />,
};

export function Toast({ isVisible, message, type = 'success', onClose }: ToastProps) {
  if (!isVisible) return null;

  return (
    <div className={`${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
      {iconMap[type]}
      <span>{message}</span>
      {onClose && (
        <button className={styles.toastClose} onClick={onClose} aria-label="Fermer">
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
