'use client';

import { Check } from 'lucide-react';
import type { StepItemModel } from './types';
import styles from './Stepper.module.css';

interface StepItemProps {
    step: StepItemModel;
    showConnector?: boolean;
    connectorActive?: boolean;
}

/**
 * Composant unifié pour afficher une étape du workflow
 * Utilise un <button> natif pour garantir la gestion des clics
 */
export function StepItem({ step, showConnector = false, connectorActive = false }: StepItemProps) {
    const { numero, titre, icon: Icon, status, optional, isClickable, onClick } = step;

    // Classe CSS basée uniquement sur le status
    const statusClass = styles[`stepItem${status.charAt(0).toUpperCase() + status.slice(1)}`];

    const handleClick = () => {
        // DEBUG LOG - à retirer en prod
        console.info('[STEP_CLICK]', {
            stepNumber: numero,
            status,
            isClickable,
            hasOnClick: !!onClick
        });

        if (isClickable && onClick) {
            onClick();
        }
    };

    return (
        <div className={styles.stepItemWrapper}>
            {/* Connecteur entre les étapes */}
            {showConnector && (
                <div className={`${styles.stepItemConnector} ${connectorActive ? styles.stepItemConnectorActive : ''}`} />
            )}

            {/*
             * IMPORTANT: Utiliser <button> au lieu de <div> pour garantir:
             * - Clics natifs (pas de propagation bloquée)
             * - Accessibilité native
             * - Gestion disabled native
             */}
            <button
                type="button"
                className={`${styles.stepItem} ${statusClass} ${isClickable ? styles.stepItemClickable : ''}`}
                onClick={handleClick}
                disabled={!isClickable}
                aria-disabled={!isClickable}
            >
                {/* Cercle avec icône */}
                <div className={styles.stepItemCircle}>
                    {status === 'completed' ? (
                        <Check size={14} strokeWidth={3} />
                    ) : (
                        <Icon size={16} />
                    )}
                </div>

                {/* Contenu textuel */}
                <div className={styles.stepItemContent}>
                    <span className={styles.stepItemNumber}>
                        Étape {numero}
                        {optional && (
                            <span className={styles.stepItemOptionalBadge}>Optionnel</span>
                        )}
                    </span>
                    <span className={styles.stepItemTitle}>{titre}</span>
                </div>
            </button>
        </div>
    );
}
