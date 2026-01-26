'use client';

import { Users, MousePointer } from 'lucide-react';
import styles from './VotesCorrespondance.module.css';

interface EmptyStateProps {
    hasResolutions: boolean;
}

export function EmptyState({ hasResolutions }: EmptyStateProps) {
    if (!hasResolutions) {
        return (
            <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>
                    <Users size={48} aria-hidden="true" />
                </div>
                <h3 className={styles.emptyStateTitle}>Aucune résolution</h3>
                <p className={styles.emptyStateText}>
                    Il n&apos;y a pas encore de résolutions définies pour cette AG.
                    Veuillez d&apos;abord créer l&apos;ordre du jour à l&apos;étape 2.
                </p>
            </div>
        );
    }

    return (
        <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>
                <MousePointer size={48} aria-hidden="true" />
            </div>
            <h3 className={styles.emptyStateTitle}>Sélectionnez un copropriétaire</h3>
            <p className={styles.emptyStateText}>
                Cliquez sur un copropriétaire dans la liste de gauche pour saisir ses votes par correspondance.
            </p>
        </div>
    );
}

export default EmptyState;
