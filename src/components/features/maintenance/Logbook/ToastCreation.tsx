'use client';

import { CheckCircle, AlertTriangle, X, Filter, XCircle } from 'lucide-react';
import type { ToastCreationProps } from './types';
import styles from '@/app/(dashboard)/maintenance/logbook/logbook.module.css';

/**
 * Toast affiché après création/modification d'une intervention
 * Alerte si le filtre actuel masque l'intervention créée
 */
export function ToastCreation({
    visible,
    type,
    titre,
    message,
    estVisibleAvecFiltre,
    labelFiltre,
    onClose,
    onAfficherTout,
}: ToastCreationProps) {
    if (!visible) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={20} className={styles.toastIconSuccess} aria-hidden="true" />;
            case 'warning':
                return <AlertTriangle size={20} className={styles.toastIconWarning} aria-hidden="true" />;
            case 'error':
                return <XCircle size={20} className={styles.toastIconError} aria-hidden="true" />;
        }
    };

    return (
        <div
            className={`${styles.toastCreation} ${styles[`toastCreation${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}
            role="alert"
            aria-live="polite"
        >
            <div className={styles.toastCreationHeader}>
                {getIcon()}
                <span className={styles.toastCreationTitre}>{titre}</span>
                <button
                    className={styles.toastCreationClose}
                    onClick={onClose}
                    aria-label="Fermer"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>

            <p className={styles.toastCreationMessage}>{message}</p>

            {/* Alerte si le filtre masque l'intervention */}
            {!estVisibleAvecFiltre && labelFiltre && (
                <div className={styles.toastCreationAlerte}>
                    <p className={styles.toastCreationAlerteTexte}>
                        Le filtre <strong>"{labelFiltre}"</strong> masque cette intervention.
                    </p>
                    {onAfficherTout && (
                        <button
                            className={styles.toastCreationBtnFiltre}
                            onClick={onAfficherTout}
                        >
                            <Filter size={14} aria-hidden="true" />
                            Afficher tout
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
