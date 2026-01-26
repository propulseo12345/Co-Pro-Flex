'use client';

import { use, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
    AssuranceHeader,
    AssuranceMainInfoSection,
    AssuranceGarantiesSection,
    AssuranceComplementaryInfo,
    AssuranceDocumentsSection
} from '../../../../../../features/maintenance/logbook/components';
import { useAssuranceDetailPage } from '../../../../../../features/maintenance/logbook/hooks';
import styles from './assurance-edit.module.css';

function AssuranceEditContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const {
        assurance,
        isEditing,
        formData,
        documents,
        showAddDocument,
        newDocument,
        setIsEditing,
        setShowAddDocument,
        setNewDocument,
        handleSave,
        handleCancel,
        handleAddDocument,
        handleDeleteDocument,
        updateFormField
    } = useAssuranceDetailPage(id);

    if (!assurance) {
        return (
            <div className="container">
                <p>Assurance non trouvée</p>
                <Link href="/maintenance/logbook" className="btn btn-secondary">
                    <ArrowLeft size={16} aria-hidden="true" /> Retour au carnet d'entretien
                </Link>
            </div>
        );
    }

    return (
        <div className="container">
            <AssuranceHeader
                nom={assurance.nom}
                sousType={formData.sousType}
                assureur={formData.assureur}
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onSave={handleSave}
                onCancel={handleCancel}
            />

            <div className={styles.grid}>
                <AssuranceMainInfoSection
                    formData={formData}
                    isEditing={isEditing}
                    onFieldChange={updateFormField}
                />

                <AssuranceGarantiesSection
                    garanties={formData.garanties}
                    isEditing={isEditing}
                    onChange={(garanties) => updateFormField('garanties', garanties)}
                />

                <AssuranceComplementaryInfo
                    formData={formData}
                    isEditing={isEditing}
                    onFieldChange={updateFormField}
                />

                <AssuranceDocumentsSection
                    documents={documents}
                    formData={formData}
                    assurance={assurance}
                    isEditing={isEditing}
                    showAddDocument={showAddDocument}
                    newDocument={newDocument}
                    onToggleAddDocument={() => setShowAddDocument(!showAddDocument)}
                    onNewDocumentChange={setNewDocument}
                    onAddDocument={handleAddDocument}
                    onDeleteDocument={handleDeleteDocument}
                />
            </div>
        </div>
    );
}

function LoadingFallback() {
    return (
        <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#10B981', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
    );
}

export default function AssuranceEditPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <AssuranceEditContent params={params} />
        </Suspense>
    );
}
