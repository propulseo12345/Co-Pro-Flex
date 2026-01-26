'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Users, FileText, ArrowRight } from 'lucide-react';
import { MOCK_ASSEMBLEES } from '@/data/mock';
import styles from './select-ag.module.css';

export default function SelectAGForResolutionPage() {
    const router = useRouter();
    const [selectedAgId, setSelectedAgId] = useState<string>('');

    // Filtrer les AG qui peuvent recevoir des résolutions (planifiées, convoquées, ou en cours)
    const availableAGs = MOCK_ASSEMBLEES.filter(
        ag => ag.statut === 'PLANIFIEE' || ag.statut === 'CONVOQUEE' || ag.statut === 'EN_COURS'
    );

    const handleContinue = () => {
        if (!selectedAgId) {
            alert('Veuillez sélectionner une assemblée générale');
            return;
        }
        router.push(`/ag/${selectedAgId}/resolutions/new`);
    };

    return (
        <div className="container">
            <div className={styles.header}>
                <button onClick={() => router.push('/ag/dashboard')} className={styles.backButton}>
                    <ArrowLeft size={20} aria-hidden="true" />
                    Retour au dashboard AG
                </button>
                <div>
                    <h1 className={styles.title}>Nouvelle résolution</h1>
                    <p className={styles.subtitle}>
                        Sélectionnez l'assemblée générale pour laquelle vous souhaitez créer une résolution
                    </p>
                </div>
            </div>

            <div className={styles.content}>
                {availableAGs.length === 0 ? (
                    <div className={styles.emptyState}>
                        <FileText size={48} className={styles.emptyIcon} aria-hidden="true" />
                        <h2>Aucune assemblée générale disponible</h2>
                        <p>
                            Pour créer une résolution, vous devez d'abord planifier une assemblée générale.
                        </p>
                        <button
                            onClick={() => router.push('/ag/new')}
                            className="btn btn-primary"
                        >
                            Planifier une AG
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={styles.agList}>
                            {availableAGs.map((ag) => (
                                <div
                                    key={ag.id}
                                    className={`${styles.agCard} ${selectedAgId === ag.id ? styles.selected : ''}`}
                                    onClick={() => setSelectedAgId(ag.id)}
                                >
                                    <div className={styles.agCardHeader}>
                                        <div>
                                            <h3 className={styles.agTitle}>
                                                AG {ag.type === 'ORDINAIRE' ? 'Ordinaire' : 'Extraordinaire'}
                                            </h3>
                                            <p className={styles.agDate}>
                                                <Calendar size={16} aria-hidden="true" />
                                                {new Date(ag.date).toLocaleDateString('fr-FR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className={styles.agBadge}>
                                            {ag.statut === 'PLANIFIEE' ? 'Planifiée' :
                                             ag.statut === 'CONVOQUEE' ? 'Convoquée' :
                                             ag.statut === 'EN_COURS' ? 'En cours' : ag.statut}
                                        </div>
                                    </div>
                                    {ag.ordreDuJour && ag.ordreDuJour.length > 0 && (
                                        <div className={styles.agResolutions}>
                                            <FileText size={14} aria-hidden="true" />
                                            <span>{ag.ordreDuJour.length} résolution(s) déjà ajoutée(s)</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className={styles.actions}>
                            <button
                                onClick={() => router.push('/ag/dashboard')}
                                className="btn btn-secondary"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleContinue}
                                className="btn btn-primary"
                                disabled={!selectedAgId}
                            >
                                Continuer <ArrowRight size={16} style={{ marginLeft: 8 }} aria-hidden="true" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

