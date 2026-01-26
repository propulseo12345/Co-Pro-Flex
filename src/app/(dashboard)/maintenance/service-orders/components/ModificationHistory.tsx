'use client';

import { ModificationHistoriqueOS } from '@/types';
import { Clock, User, Edit, FileText } from 'lucide-react';
import styles from './ModificationHistory.module.css';

interface ModificationHistoryProps {
    historique: ModificationHistoriqueOS[];
}

export default function ModificationHistory({ historique }: ModificationHistoryProps) {
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionIcon = (action: string) => {
        if (action.toLowerCase().includes('création')) {
            return <FileText size={16} aria-hidden="true" />;
        } else if (action.toLowerCase().includes('modification')) {
            return <Edit size={16} aria-hidden="true" />;
        } else if (action.toLowerCase().includes('archivage')) {
            return <FileText size={16} aria-hidden="true" />;
        }
        return <Clock size={16} aria-hidden="true" />;
    };

    const getActionClass = (action: string): string => {
        if (action.toLowerCase().includes('création')) {
            return styles.actionCreate;
        } else if (action.toLowerCase().includes('modification')) {
            return styles.actionEdit;
        } else if (action.toLowerCase().includes('archivage')) {
            return styles.actionArchive;
        }
        return styles.actionDefault;
    };

    if (historique.length === 0) {
        return (
            <div className={styles.emptyState}>
                <Clock size={32} aria-hidden="true" />
                <p>Aucun historique disponible</p>
            </div>
        );
    }

    // Trier par date décroissante (plus récent en premier)
    const sortedHistorique = [...historique].sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return (
        <div className={styles.container}>
            <div className={styles.timeline}>
                {sortedHistorique.map((entry, index) => (
                    <div key={entry.id} className={styles.timelineItem}>
                        <div className={styles.timelineMarker}>
                            <div className={`${styles.markerIcon} ${getActionClass(entry.action)}`}>
                                {getActionIcon(entry.action)}
                            </div>
                            {index < sortedHistorique.length - 1 && (
                                <div className={styles.timelineLine} />
                            )}
                        </div>

                        <div className={styles.timelineContent}>
                            <div className={styles.contentHeader}>
                                <h4 className={styles.actionTitle}>{entry.action}</h4>
                                <span className={styles.dateTime}>
                                    <Clock size={14} aria-hidden="true" />
                                    {formatDate(entry.date)}
                                </span>
                            </div>

                            {entry.auteur && (
                                <div className={styles.author}>
                                    <User size={14} aria-hidden="true" />
                                    {entry.auteur}
                                </div>
                            )}

                            {entry.champModifie && (
                                <div className={styles.details}>
                                    <strong>Champ modifié :</strong> {entry.champModifie}
                                </div>
                            )}

                            {(entry.ancienneValeur || entry.nouvelleValeur) && (
                                <div className={styles.changes}>
                                    {entry.ancienneValeur && (
                                        <div className={styles.changeItem}>
                                            <span className={styles.changeLabel}>Avant :</span>
                                            <span className={styles.oldValue}>{entry.ancienneValeur}</span>
                                        </div>
                                    )}
                                    {entry.nouvelleValeur && (
                                        <div className={styles.changeItem}>
                                            <span className={styles.changeLabel}>Après :</span>
                                            <span className={styles.newValue}>{entry.nouvelleValeur}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
