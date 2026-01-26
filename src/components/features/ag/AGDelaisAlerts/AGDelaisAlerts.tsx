'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle,
    X,
    ChevronRight,
    Bell,
    ShieldAlert,
} from 'lucide-react';
import type { AlerteDelai } from '@/hooks/modules/useAGDelais';
import styles from './AGDelaisAlerts.module.css';

interface AGDelaisAlertsProps {
    alertes: AlerteDelai[];
    onDismiss?: (alerteId: string) => void;
    variant?: 'default' | 'compact' | 'banner';
    maxVisible?: number;
    showDismissAll?: boolean;
}

export default function AGDelaisAlerts({
    alertes,
    onDismiss,
    variant = 'default',
    maxVisible = 5,
    showDismissAll = false,
}: AGDelaisAlertsProps) {
    const [showAll, setShowAll] = useState(false);

    // Filtrer et limiter les alertes
    const alertesVisibles = showAll ? alertes : alertes.slice(0, maxVisible);
    const alertesCachees = alertes.length - alertesVisibles.length;

    // Obtenir l'icône selon le type
    const getIcon = (type: AlerteDelai['type']) => {
        switch (type) {
            case 'error':
                return <AlertCircle size={18} />;
            case 'blocked':
                return <ShieldAlert size={18} />;
            case 'warning':
                return <AlertTriangle size={18} />;
            case 'success':
                return <CheckCircle size={18} />;
            default:
                return <Info size={18} />;
        }
    };

    // Dismiss toutes les alertes dismissibles
    const handleDismissAll = () => {
        alertes
            .filter(a => a.dismissible)
            .forEach(a => onDismiss?.(a.id));
    };

    // Aucune alerte
    if (alertes.length === 0) {
        return null;
    }

    // Mode banner (une seule alerte prioritaire)
    if (variant === 'banner') {
        const alertePrioritaire = alertes[0];
        return (
            <div className={`${styles.banner} ${styles[`banner${alertePrioritaire.type.charAt(0).toUpperCase() + alertePrioritaire.type.slice(1)}`]}`}>
                <div className={styles.bannerIcon}>
                    {getIcon(alertePrioritaire.type)}
                </div>
                <div className={styles.bannerContent}>
                    <strong className={styles.bannerTitle}>{alertePrioritaire.titre}</strong>
                    <span className={styles.bannerMessage}>{alertePrioritaire.message}</span>
                </div>
                {alertePrioritaire.action && (
                    <Link href={alertePrioritaire.action.href} className={styles.bannerAction}>
                        {alertePrioritaire.action.label}
                        <ChevronRight size={16} />
                    </Link>
                )}
                {alertePrioritaire.dismissible && onDismiss && (
                    <button
                        className={styles.bannerDismiss}
                        onClick={() => onDismiss(alertePrioritaire.id)}
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
        );
    }

    // Mode compact
    if (variant === 'compact') {
        const critiques = alertes.filter(a => a.type === 'error' || a.type === 'blocked').length;
        const warnings = alertes.filter(a => a.type === 'warning').length;

        return (
            <div className={styles.compact}>
                <Bell size={16} className={styles.compactIcon} />
                <span className={styles.compactText}>
                    {critiques > 0 && (
                        <span className={styles.compactError}>{critiques} critique(s)</span>
                    )}
                    {critiques > 0 && warnings > 0 && ' · '}
                    {warnings > 0 && (
                        <span className={styles.compactWarning}>{warnings} avertissement(s)</span>
                    )}
                </span>
            </div>
        );
    }

    // Mode par défaut (liste)
    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <Bell size={16} />
                    <span>Alertes délais ({alertes.length})</span>
                </div>
                {showDismissAll && alertes.some(a => a.dismissible) && (
                    <button
                        className={styles.dismissAll}
                        onClick={handleDismissAll}
                    >
                        Tout masquer
                    </button>
                )}
            </div>

            {/* Liste des alertes */}
            <div className={styles.list}>
                {alertesVisibles.map(alerte => (
                    <div
                        key={alerte.id}
                        className={`${styles.alert} ${styles[`alert${alerte.type.charAt(0).toUpperCase() + alerte.type.slice(1)}`]}`}
                    >
                        <div className={styles.alertIcon}>
                            {getIcon(alerte.type)}
                        </div>
                        <div className={styles.alertContent}>
                            <div className={styles.alertHeader}>
                                <strong className={styles.alertTitle}>{alerte.titre}</strong>
                                {alerte.dismissible && onDismiss && (
                                    <button
                                        className={styles.alertDismiss}
                                        onClick={() => onDismiss(alerte.id)}
                                        aria-label="Fermer"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                            <p className={styles.alertMessage}>{alerte.message}</p>
                            {alerte.action && (
                                <Link href={alerte.action.href} className={styles.alertAction}>
                                    {alerte.action.label}
                                    <ChevronRight size={14} />
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Afficher plus */}
            {alertesCachees > 0 && (
                <button
                    className={styles.showMore}
                    onClick={() => setShowAll(!showAll)}
                >
                    {showAll ? 'Voir moins' : `Voir ${alertesCachees} alerte(s) supplémentaire(s)`}
                </button>
            )}
        </div>
    );
}
