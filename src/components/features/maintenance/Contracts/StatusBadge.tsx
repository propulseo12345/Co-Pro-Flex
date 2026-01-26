'use client';

import { StatutContrat } from '@/types';
import { getNiveauEscalade, SEUILS_ESCALADE_EXPIRATION, type NiveauEscalade } from '@/lib/utils/alerts';
import clsx from 'clsx';
import styles from './Contracts.module.css';

interface StatusBadgeProps {
    statut: StatutContrat | 'ACTIF' | 'A_RENOUVELER' | 'RESILIE' | 'EXPIRE';
    joursDepasses?: number; // Nombre de jours depuis expiration (pour escalade)
}

const CONFIG: Record<string, { label: string; className: string }> = {
    'ACTIF': { label: 'Actif', className: styles.badgeActif },
    'A_RENOUVELER': { label: 'À renouveler', className: styles.badgeRenouveler },
    'RESILIE': { label: 'Résilié', className: styles.badgeResilie },
    'ARCHIVE': { label: 'Archivé', className: styles.badgeArchive },
    'BROUILLON': { label: 'Brouillon', className: styles.badgeBrouillon },
    'EXPIRE': { label: 'Expiré', className: styles.badgeExpire }
};

// Labels selon le niveau d'escalade pour les contrats expirés
const ESCALADE_CONFIG: Record<NiveauEscalade, { label: string; className: string }> = {
    'standard': { label: 'Expiré', className: styles.badgeExpire },
    'relance': { label: 'Expiré J+7', className: styles.badgeExpire },
    'urgence': { label: 'Expiré URGENT', className: styles.badgeExpireUrgent },
    'critique': { label: 'CRITIQUE', className: styles.badgeCritique },
    'tres_critique': { label: 'TRÈS CRITIQUE', className: styles.badgeTresCritique }
};

export default function StatusBadge({ statut, joursDepasses }: StatusBadgeProps) {
    // Pour les contrats expirés, afficher le niveau d'escalade si disponible
    if (statut === 'EXPIRE' && joursDepasses !== undefined && joursDepasses > 0) {
        const niveau = getNiveauEscalade(joursDepasses);
        const { label, className } = ESCALADE_CONFIG[niveau];

        // Afficher le nombre de jours pour les niveaux critiques
        const displayLabel = niveau === 'critique' || niveau === 'tres_critique'
            ? `${label} (J+${joursDepasses})`
            : niveau === 'urgence'
                ? `${label} (J+${joursDepasses})`
                : label;

        return <span className={clsx(styles.badge, className)}>{displayLabel}</span>;
    }

    const { label, className } = CONFIG[statut] || { label: statut, className: '' };
    return <span className={clsx(styles.badge, className)}>{label}</span>;
}

// Export pour utilisation externe
export { getNiveauEscalade, SEUILS_ESCALADE_EXPIRATION };
