'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { useAgDrafts } from '@/hooks/modules/useAgDrafts';
import styles from './select-ag.module.css';

export default function SelectAGForResolutionPage() {
    const router = useRouter();
    const [selectedAgId, setSelectedAgId] = useState<string>('');
    const { drafts, isLoading } = useAgDrafts();

    // Mapper les brouillons Supabase vers le format attendu
    const availableAGs = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        return drafts
            .filter(draft => {
                // Inclure les AG avec une date future ou sans date
                if (!draft.meeting_date) return true;
                const draftDate = draft.meeting_date.split('T')[0];
                return draftDate >= today;
            })
            .map(draft => ({
                id: draft.id,
                type: draft.meeting_type === 'ordinary' ? 'ORDINAIRE' as const : 'EXTRAORDINAIRE' as const,
                date: draft.meeting_date || '',
                statut: 'PLANIFIEE' as const,
                resolutionsCount: draft.resolutionsCount,
            }));
    }, [drafts]);

    const handleContinue = () => {
        if (!selectedAgId) {
            alert('Veuillez sélectionner une assemblée générale');
            return;
        }
        router.push(`/ag/${selectedAgId}/resolutions/new`);
    };

    if (isLoading) {
        return (
            <div className="container">
                <div className={styles.header}>
                    <button onClick={() => router.push('/ag/dashboard')} className={styles.backButton}>
                        <ArrowLeft size={20} aria-hidden="true" />
                        Retour au dashboard AG
                    </button>
                </div>
                <div className={styles.content}>
                    <div className={styles.emptyState}>
                        <Loader2 size={48} className={styles.spinner} aria-hidden="true" />
                        <p>Chargement des assemblées générales...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                                {ag.date ? new Date(ag.date).toLocaleDateString('fr-FR', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                }) : 'Date non définie'}
                                            </p>
                                        </div>
                                        <div className={styles.agBadge}>
                                            En préparation
                                        </div>
                                    </div>
                                    {ag.resolutionsCount > 0 && (
                                        <div className={styles.agResolutions}>
                                            <FileText size={14} aria-hidden="true" />
                                            <span>{ag.resolutionsCount} résolution(s) déjà ajoutée(s)</span>
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

