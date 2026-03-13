'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
    AddInterventionModal,
    EditProviderModal,
    ProviderDetailHeader,
    CoordonneesSection,
    CertificationsSection,
    StatsSection,
    ContratsSection,
    InterventionsList,
    AvisList,
    NotesSection
} from '../../../../../features/maintenance/providers/components';
import { useProviderDetailPage } from '../../../../../features/maintenance/providers/hooks';
import styles from './provider-detail.module.css';

function ProviderDetailContent({ id }: { id: string }) {
    const {
        prestataire,
        showAddIntervention,
        setShowAddIntervention,
        showEditModal,
        setShowEditModal,
        prestataireInterventions,
        contrats,
        avis,
        backLink,
        handleDelete,
        handleAddIntervention,
        handleEditSave
    } = useProviderDetailPage(id);

    if (!prestataire) {
        return (
            <div className="container">
                <Link href="/maintenance/providers" className={styles.backLink}>
                    <ArrowLeft size={16} aria-hidden="true" /> Retour aux prestataires
                </Link>
                <div className={styles.notFound}>
                    <h2>Prestataire introuvable</h2>
                    <p>Le prestataire demandé n'existe pas ou a été supprimé.</p>
                    <Link href="/maintenance/providers" className="btn btn-primary">
                        Voir tous les prestataires
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <Link href={backLink} className={styles.backLink}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour aux prestataires
            </Link>

            <ProviderDetailHeader
                prestataire={prestataire}
                onEdit={() => setShowEditModal(true)}
                onDelete={handleDelete}
                onAddIntervention={() => setShowAddIntervention(true)}
            />

            <div className={styles.grid}>
                <div className={styles.column}>
                    <CoordonneesSection prestataire={prestataire} />
                    <CertificationsSection certifications={prestataire.certifications || []} />
                </div>
                <div className={styles.column}>
                    <StatsSection prestataire={prestataire} />
                    <ContratsSection contrats={contrats} />
                </div>
            </div>

            <InterventionsList
                interventions={prestataireInterventions}
                onAddIntervention={() => setShowAddIntervention(true)}
            />

            <AvisList avis={avis} />

            <NotesSection notes={prestataire.notesInternes || ''} />

            {showAddIntervention && (
                <AddInterventionModal
                    prestataire={prestataire}
                    onClose={() => setShowAddIntervention(false)}
                    onAdd={handleAddIntervention}
                />
            )}

            {showEditModal && (
                <EditProviderModal
                    prestataire={prestataire}
                    onClose={() => setShowEditModal(false)}
                    onSave={handleEditSave}
                />
            )}
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{
                display: 'inline-block',
                width: '24px',
                height: '24px',
                border: '3px solid var(--color-border)',
                borderTopColor: 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
            }} />
        </div>
    );
}

export default function ProviderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);

    return (
        <Suspense fallback={<LoadingFallback />}>
            <ProviderDetailContent id={id} />
        </Suspense>
    );
}
