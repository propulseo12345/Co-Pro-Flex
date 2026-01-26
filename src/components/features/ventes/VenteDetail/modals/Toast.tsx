'use client';

import { useEffect } from 'react';
import { CheckCircle2, X, FileText } from 'lucide-react';
import clsx from 'clsx';
import type { ToastType } from '../types';
import styles from '../VenteDetail.module.css';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={clsx(styles.toast, styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`])}>
      {type === 'success' && <CheckCircle2 size={18} aria-hidden="true" />}
      {type === 'error' && <X size={18} aria-hidden="true" />}
      {type === 'info' && <FileText size={18} aria-hidden="true" />}
      <span>{message}</span>
      <button onClick={onClose} className={styles.toastClose} aria-label="Fermer"><X size={14} aria-hidden="true" /></button>
    </div>
  );
}
