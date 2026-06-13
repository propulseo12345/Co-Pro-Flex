'use client';

import React from 'react';
import Link from 'next/link';
import {
    Calendar,
    Wrench,
    CheckCircle,
    XCircle,
    User,
    Euro,
    File,
    ExternalLink,
    Edit3
} from 'lucide-react';
import type { InterventionCardProps } from '../types';
import { MenuActionsRapides } from '../MenuActionsRapides';
import { STATUTS_INTERVENTION, COULEURS_STATUT, ACTIONS_PAR_STATUT } from '@/lib/constants/statuts-intervention';
import styles from './InterventionCard.module.css';

const ICONES_STATUT = {
    Calendar,
    Wrench,
    CheckCircle,
    XCircle,
} as const;

/**
 * Carte d'intervention avec statut visuel, métadonnées et actions rapides
 * Design moderne avec indicateur de statut coloré
 */
export function InterventionCard({
    intervention,
    onEdit,
    onActionRapide,
}: InterventionCardProps) {
    // Utiliser le statut pour déterminer la config visuelle
    const statut = intervention.statut as keyof typeof STATUTS_INTERVENTION;
    const statutConfig = STATUTS_INTERVENTION[statut] || STATUTS_INTERVENTION.PLANIFIEE;
    const couleurs = COULEURS_STATUT[statutConfig.couleur];
    const IconeStatut = ICONES_STATUT[statutConfig.icone];
    const actions = ACTIONS_PAR_STATUT[statut] || [];

    // Formatage de la date
    const dateFormatee = new Date(intervention.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (
        <div className={styles.carte}>
            {/* Indicateur statut (barre verticale colorée) */}
            <div
                className={styles.indicateurStatut}
                style={{ backgroundColor: couleurs.dot }}
            />

            {/* Contenu principal */}
            <div className={styles.contenu}>
                {/* En-tête: titre + badge statut */}
                <div className={styles.entete}>
                    <h3 className={styles.titre}>{intervention.titre}</h3>
                    <span
                        className={styles.badgeStatut}
                        style={{
                            backgroundColor: couleurs.bg,
                            color: couleurs.text,
                        }}
                    >
                        {IconeStatut && <IconeStatut size={12} aria-hidden="true" />}
                        {statutConfig.labelCourt}
                    </span>
                </div>

                {/* Métadonnées */}
                <div className={styles.meta}>
                    {/* Dates */}
                    <div className={styles.dates}>
                        <span className={styles.date}>
                            <Calendar size={14} aria-hidden="true" />
                            {dateFormatee}
                        </span>
                        {intervention.statut === 'TERMINEE' && (
                            <span className={`${styles.date} ${styles.dateRealisation}`}>
                                <CheckCircle size={14} aria-hidden="true" />
                                Terminée
                            </span>
                        )}
                    </div>

                    {/* Équipement & Prestataire */}
                    <div className={styles.infos}>
                        {intervention.equipementConcerne && (
                            <span className={styles.tag}>
                                <Wrench size={12} aria-hidden="true" />
                                {intervention.equipementConcerne}
                            </span>
                        )}
                        {intervention.intervenant && (
                            <Link
                                href={`/maintenance/providers/${intervention.prestataireId || ''}`}
                                className={styles.tagLink}
                            >
                                <User size={12} aria-hidden="true" />
                                {intervention.intervenant}
                                <ExternalLink size={10} aria-hidden="true" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Description (tronquée à 2 lignes) */}
                {intervention.description && (
                    <p className={styles.description}>{intervention.description}</p>
                )}

                {/* Pied de carte: coût, documents, actions */}
                <div className={styles.footer}>
                    <div className={styles.footerInfos}>
                        {intervention.cout !== undefined && intervention.cout > 0 && (
                            <span className={styles.cout}>
                                <Euro size={14} aria-hidden="true" />
                                {intervention.cout.toLocaleString('fr-FR')} €
                            </span>
                        )}
                        {intervention.documentsAssocies && intervention.documentsAssocies.length > 0 && (
                            <span className={styles.documents}>
                                <File size={14} aria-hidden="true" />
                                {intervention.documentsAssocies.length} document(s)
                            </span>
                        )}
                        {intervention.categorie === 'TRAVAUX_IMPORTANTS' && (
                            <span className={styles.badgeTravaux}>Travaux importants</span>
                        )}
                    </div>

                    <div className={styles.actions}>
                        <button
                            className={styles.btnEdit}
                            onClick={() => onEdit(intervention)}
                            aria-label="Modifier l'intervention"
                        >
                            <Edit3 size={14} aria-hidden="true" />
                            Modifier
                        </button>
                        <MenuActionsRapides
                            actions={actions}
                            onAction={(action) => onActionRapide(intervention, action)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InterventionCard;
