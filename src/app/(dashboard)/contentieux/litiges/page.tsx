'use client';

import { AlertCircle, MessageSquare, FileText, Plus } from 'lucide-react';
import styles from './disputes.module.css';
import { MOCK_LITIGES } from '@/data/mock';
import Link from 'next/link';

export default function DisputesPage() {
    const getStatusBadge = (statut: string) => {
        switch (statut) {
            case 'OUVERT':
                return <span className="badge badge-error">Ouvert</span>;
            case 'EN_COURS':
                return <span className="badge badge-warning">En cours</span>;
            case 'RESOLU':
                return <span className="badge badge-success">Résolu</span>;
            case 'CLOS':
                return <span className="badge">Clos</span>;
            default:
                return null;
        }
    };

    const getPriorityBadge = (priorite: string) => {
        switch (priorite) {
            case 'HAUTE':
                return <span className={styles.priorityHigh}>Haute</span>;
            case 'MOYENNE':
                return <span className={styles.priorityMedium}>Moyenne</span>;
            case 'BASSE':
                return <span className={styles.priorityLow}>Basse</span>;
            default:
                return null;
        }
    };

    const getTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            'VOISINAGE': 'Voisinage',
            'TRAVAUX': 'Travaux',
            'CHARGES': 'Charges',
            'AUTRE': 'Autre'
        };
        return labels[type] || type;
    };

    const openCount = MOCK_LITIGES.filter(l => l.statut === 'OUVERT' || l.statut === 'EN_COURS').length;

    return (
        <div className="container">
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Litiges</h1>
                    <p className={styles.subtitle}>
                        Suivi et gestion des litiges de la copropriété
                    </p>
                </div>
                <button className="btn btn-primary">
                    <Plus size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                    Nouveau litige
                </button>
            </div>

            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <AlertCircle size={24} aria-hidden="true" />
                    </div>
                    <div>
                        <div className={styles.statLabel}>Litiges actifs</div>
                        <div className={styles.statValue}>{openCount}</div>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon}>
                        <FileText size={24} aria-hidden="true" />
                    </div>
                    <div>
                        <div className={styles.statLabel}>Total litiges</div>
                        <div className={styles.statValue}>{MOCK_LITIGES.length}</div>
                    </div>
                </div>
            </div>

            <div className={styles.litigesGrid}>
                {MOCK_LITIGES.map((litige) => (
                    <div key={litige.id} className={styles.litigeCard}>
                        <div className={styles.litigeHeader}>
                            <div className={styles.litigeTitle}>{litige.titre}</div>
                            <div className={styles.litigeBadges}>
                                {getStatusBadge(litige.statut)}
                                {getPriorityBadge(litige.priorite)}
                            </div>
                        </div>

                        <div className={styles.litigeMeta}>
                            <span className={styles.litigeType}>{getTypeLabel(litige.type)}</span>
                            <span className={styles.litigeDate}>
                                Ouvert le {new Date(litige.dateOuverture).toLocaleDateString('fr-FR')}
                            </span>
                        </div>

                        <div className={styles.litigeDescription}>
                            {litige.description}
                        </div>

                        <div className={styles.litigeParties}>
                            <span className={styles.partiesLabel}>Parties concernées:</span>
                            <div className={styles.partiesList}>
                                {litige.parties.map((partie, idx) => (
                                    <span key={idx} className={styles.partie}>{partie}</span>
                                ))}
                            </div>
                        </div>

                        <div className={styles.litigeActions}>
                            <button className="btn btn-secondary btn-sm">
                                <MessageSquare size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                                Ajouter note
                            </button>
                            <button className="btn btn-secondary btn-sm">
                                <FileText size={14} style={{ marginRight: 4 }} aria-hidden="true" />
                                Voir détails
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
