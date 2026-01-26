'use client';

import { InterventionDetaille } from '@/types';
import { Calendar, Euro, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import styles from './InterventionHistory.module.css';
import clsx from 'clsx';

interface InterventionHistoryProps {
    interventions: InterventionDetaille[];
    showPrestataire?: boolean; // Afficher colonne prestataire
    clickable?: boolean; // Clic pour voir détails
    onInterventionClick?: (intervention: InterventionDetaille) => void;
}

export default function InterventionHistory({
    interventions,
    showPrestataire = false,
    clickable = false,
    onInterventionClick
}: InterventionHistoryProps) {
    const getStatutIcon = (statut: string) => {
        switch (statut) {
            case 'TERMINEE':
                return <CheckCircle size={16} className={styles.iconTerminee} aria-hidden="true" />;
            case 'EN_COURS':
                return <Clock size={16} className={styles.iconEnCours} aria-hidden="true" />;
            case 'PLANIFIEE':
                return <Calendar size={16} className={styles.iconPlanifiee} aria-hidden="true" />;
            default:
                return <AlertCircle size={16} className={styles.iconAnnulee} aria-hidden="true" />;
        }
    };

    const getStatutLabel = (statut: string) => {
        switch (statut) {
            case 'TERMINEE':
                return 'Terminée';
            case 'EN_COURS':
                return 'En cours';
            case 'PLANIFIEE':
                return 'Planifiée';
            default:
                return 'Annulée';
        }
    };

    const getStatutClass = (statut: string) => {
        switch (statut) {
            case 'TERMINEE':
                return styles.statutTerminee;
            case 'EN_COURS':
                return styles.statutEnCours;
            case 'PLANIFIEE':
                return styles.statutPlanifiee;
            default:
                return styles.statutAnnulee;
        }
    };

    const handleRowClick = (intervention: InterventionDetaille) => {
        if (clickable && onInterventionClick) {
            onInterventionClick(intervention);
        }
    };

    if (interventions.length === 0) {
        return (
            <div className={styles.emptyState}>
                <Calendar size={48} aria-hidden="true" />
                <p>Aucune intervention enregistrée</p>
            </div>
        );
    }

    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Titre</th>
                        {showPrestataire && <th>Prestataire</th>}
                        <th>Montant</th>
                        <th>Statut</th>
                    </tr>
                </thead>
                <tbody>
                    {interventions.map((intervention) => (
                        <tr
                            key={intervention.id}
                            className={clsx(
                                styles.row,
                                clickable && styles.clickable
                            )}
                            onClick={() => handleRowClick(intervention)}
                        >
                            <td className={styles.dateCell}>
                                {new Date(intervention.date).toLocaleDateString('fr-FR')}
                            </td>
                            <td className={styles.titreCell}>
                                <div className={styles.titreWrapper}>
                                    <span className={styles.titre}>{intervention.titre}</span>
                                    {intervention.description && (
                                        <span className={styles.description}>
                                            {intervention.description}
                                        </span>
                                    )}
                                </div>
                            </td>
                            {showPrestataire && (
                                <td className={styles.prestataireCell}>
                                    {intervention.intervenant}
                                </td>
                            )}
                            <td className={styles.montantCell}>
                                {intervention.montant !== undefined && intervention.montant > 0 ? (
                                    <span className={styles.montant}>
                                        <Euro size={14} aria-hidden="true" />
                                        {intervention.montant.toLocaleString('fr-FR', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2
                                        })}
                                    </span>
                                ) : (
                                    <span className={styles.montantInclus}>Inclus</span>
                                )}
                            </td>
                            <td className={styles.statutCell}>
                                <span className={clsx(styles.statutBadge, getStatutClass(intervention.statut))}>
                                    {getStatutIcon(intervention.statut)}
                                    {getStatutLabel(intervention.statut)}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
