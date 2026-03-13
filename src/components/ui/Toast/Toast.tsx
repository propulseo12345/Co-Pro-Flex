'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  link?: { label: string; href: string };
}

interface ToastProps {
  toast: ToastItem;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <div className={`${styles.toast} ${styles[toast.type]}`}>
      <span className={styles.message}>{toast.message}</span>
      {toast.link && (
        <Link href={toast.link.href} className={styles.link}>{toast.link.label}</Link>
      )}
      <button className={styles.closeBtn} onClick={() => onClose(toast.id)}>
        <X size={14} />
      </button>
    </div>
  );
}
