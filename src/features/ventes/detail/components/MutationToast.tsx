'use client';

import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import styles from '@/app/(dashboard)/ventes-impayes/ventes/[id]/detail-vente.module.css';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

interface MutationToastProps {
  toast: Toast | null;
  onHide: () => void;
}

export function MutationToast({ toast, onHide }: MutationToastProps) {
  if (!toast) return null;

  return (
    <div
      className={`${styles.toast} ${
        toast.type === 'success' ? styles.toastSuccess : styles.toastError
      }`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 size={20} />
      ) : (
        <AlertTriangle size={20} />
      )}
      {toast.message}
      <button className={styles.toastClose} onClick={onHide}>
        <X size={16} />
      </button>
    </div>
  );
}
