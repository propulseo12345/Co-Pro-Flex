'use client';

import { Check, X, FileText } from 'lucide-react';
import clsx from 'clsx';
import styles from './Toast.module.css';

export interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
    return (
        <div className={clsx(styles.toast, styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`])}>
            {type === 'success' && <Check size={18} aria-hidden="true" />}
            {type === 'error' && <X size={18} aria-hidden="true" />}
            {type === 'info' && <FileText size={18} aria-hidden="true" />}
            <span>{message}</span>
            <button onClick={onClose} aria-label="Fermer"><X size={14} aria-hidden="true" /></button>
        </div>
    );
}
