'use client';

import { use } from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { downloadPieceJointe, previewPieceJointe } from '@/lib/utils/service-order';
import { ListePiecesJointesOS } from '../components/ListePiecesJointesOS';
import StatusUpdateModal from '../components/StatusUpdateModal';
import EmailPreviewModal from '../components/EmailPreviewModal';
import {
    ServiceOrderDetailHeader,
    ServiceOrderInfoCard,
    ServiceOrderDatesCard,
    ServiceOrderMontantsCard,
    ServiceOrderEmailCard,
    ServiceOrderArchiveCard,
    ServiceOrderWorkflowProgress,
    ServiceOrderHistoryCard,
    ServiceOrderFactureSection,
    ServiceOrderTimeline
} from '../../../../../features/maintenance/serviceOrders/components';
import { useServiceOrderDetailPage } from '../../../../../features/maintenance/serviceOrders/hooks';
import styles from './os-detail.module.css';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ServiceOrderDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const {
        ordreService,
        currentData,
        editMode,
        showStatusModal,
        showEmailModal,
        factureLiee,
        setEditMode,
        setShowStatusModal,
        setShowEmailModal,
        handleSaveEdit,
        handleCancelEdit,
        handleStatusUpdate,
        handleUploadPJ,
        handleSupprimerPJ,
        handleDescriptionChange,
        editedData
    } = useServiceOrderDetailPage(id);

    if (!ordreService || !currentData) {
        return (
            <div className={styles.container}>
                <div className={styles.notFound}>
                    <FileText size={48} aria-hidden="true" />
                    <h2>Ordre de service introuvable</h2>
                    <Link href="/maintenance/service-orders" className="btn btn-secondary">
                        <ArrowLeft size={16} aria-hidden="true" />
                        Retour à la liste
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <ServiceOrderDetailHeader
                ordreService={ordreService}
                editMode={editMode}
                onEdit={() => setEditMode(true)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={handleSaveEdit}
                onShowStatusModal={() => setShowStatusModal(true)}
                onShowEmailModal={() => setShowEmailModal(true)}
            />

            <div className={styles.contentGrid}>
                <div className={styles.leftColumn}>
                    <ServiceOrderInfoCard
                        currentData={currentData}
                        editMode={editMode}
                        editedDescription={editedData.description}
                        onDescriptionChange={handleDescriptionChange}
                    />
                    <ServiceOrderDatesCard currentData={currentData} />
                    <ServiceOrderMontantsCard currentData={currentData} />
                </div>

                <div className={styles.rightColumn}>
                    <ServiceOrderEmailCard currentData={currentData} />
                    <div className={styles.card}>
                        <ListePiecesJointesOS
                            piecesJointes={currentData.piecesJointes}
                            onTelecharger={downloadPieceJointe}
                            onPrevisualiser={previewPieceJointe}
                            onSupprimer={editMode ? handleSupprimerPJ : undefined}
                            onUpload={editMode ? handleUploadPJ : undefined}
                            lectureSeule={!editMode}
                        />
                    </div>
                    <ServiceOrderArchiveCard currentData={currentData} />
                </div>
            </div>

            <ServiceOrderHistoryCard currentData={currentData} />
            <ServiceOrderWorkflowProgress currentData={currentData} />
            <ServiceOrderFactureSection
                ordreServiceId={ordreService.id}
                currentData={currentData}
                facture={factureLiee}
            />
            <ServiceOrderTimeline currentData={currentData} facture={factureLiee} />

            {showStatusModal && (
                <StatusUpdateModal
                    ordreService={ordreService}
                    onClose={() => setShowStatusModal(false)}
                    onStatusUpdate={handleStatusUpdate}
                />
            )}

            {showEmailModal && (
                <EmailPreviewModal
                    ordreService={ordreService}
                    onClose={() => setShowEmailModal(false)}
                    onSend={() => {
                        alert('Email renvoyé (mockup)');
                        setShowEmailModal(false);
                    }}
                />
            )}
        </div>
    );
}
