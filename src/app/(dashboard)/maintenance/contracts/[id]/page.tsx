'use client';

import { use, Suspense } from 'react';
import { DocumentContrat } from '@/types';
import { InterventionHistory, ResiliationModal } from '@/components/features/maintenance';
import { ContactProviderModal } from '@/components/features/maintenance/ContactProviderModal';
import { BlocCoordonneesPrestataire } from '@/components/features/maintenance/Contracts';
import {
    ContractDetailHeader,
    ContractAlertBox,
    ContractInfoGrid,
    ContractAttachmentsSection,
    ContractEditModal
} from '../../../../../features/maintenance/contracts/components';
import { useContractDetailPage } from '../../../../../features/maintenance/contracts/hooks';
import styles from './contract-detail.module.css';

function ContractDetailContent({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const {
        contrat,
        prestataire,
        allPrestataires,
        interventions,
        pieceJointes,
        joursRestants,
        alerteRenouvellement,
        alerteUrgente,
        typeLabel,
        fromLogbook,
        isEditing,
        editForm,
        showResiliationModal,
        showContactModal,
        showAddAttachment,
        newAttachment,
        formatMontant,
        setIsEditing,
        setEditForm,
        setShowResiliationModal,
        setShowContactModal,
        setShowAddAttachment,
        setNewAttachment,
        handleCancelEdit,
        handleSaveEdit,
        handleAddAttachment,
        handleDeleteAttachment
    } = useContractDetailPage(id);

    if (!contrat) return <div className="container"><p>Contrat non trouvé</p></div>;

    const handleDownloadPDF = () => {
        const content = `
================================================================================
                            CONTRAT DE MAINTENANCE
================================================================================

Référence : ${contrat.numeroContrat || 'Non renseigné'}
Libellé : ${contrat.nom}

--------------------------------------------------------------------------------
INFORMATIONS GÉNÉRALES
--------------------------------------------------------------------------------
Type de contrat : ${typeLabel}
Prestataire : ${contrat.fournisseur}
Statut : ${contrat.statut}
${contrat.estReglementaire ? '⚠️ Contrat réglementaire obligatoire' : ''}

--------------------------------------------------------------------------------
DURÉE ET CONDITIONS
--------------------------------------------------------------------------------
Date de début : ${contrat.dateDebut ? new Date(contrat.dateDebut).toLocaleDateString('fr-FR') : 'Non définie'}
Date de fin : ${contrat.dateFin ? new Date(contrat.dateFin).toLocaleDateString('fr-FR') : 'Non définie'}
Tacite reconduction : ${contrat.taciteReconduction ? 'Oui' : 'Non'}
Délai de résiliation : ${contrat.delaiResiliation || '-'} jours

--------------------------------------------------------------------------------
FINANCIER
--------------------------------------------------------------------------------
Coût annuel : ${formatMontant(contrat.coutAnnuel)}

================================================================================
Document généré le ${new Date().toLocaleDateString('fr-FR')}
CoProFlex - Gestion de copropriété
================================================================================
`.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = contrat.fichierPDF?.replace('.pdf', '.txt') || `contrat_${contrat.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadAttachment = (doc: DocumentContrat) => {
        const content = `
================================================================================
                          PIÈCE JOINTE - ${doc.nom}
================================================================================

Type de document : ${doc.type}
Date d'upload : ${new Date(doc.dateUpload).toLocaleDateString('fr-FR')}
Contrat associé : ${contrat.nom}
Prestataire : ${contrat.fournisseur}

================================================================================
Document simulé généré le ${new Date().toLocaleDateString('fr-FR')}
CoProFlex - Gestion de copropriété
================================================================================
`.trim();

        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.nom.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="container">
            <ContractDetailHeader
                contrat={contrat as unknown as import('@/types').ContratDetaille}
                fromLogbook={fromLogbook}
                typeLabel={typeLabel}
                onModifier={() => setIsEditing(true)}
                onDownloadPDF={handleDownloadPDF}
                onResiliation={() => setShowResiliationModal(true)}
                onContactProvider={() => setShowContactModal(true)}
            />

            {alerteRenouvellement && contrat.statut !== 'terminated' && (
                <ContractAlertBox
                    joursRestants={joursRestants}
                    alerteUrgente={alerteUrgente}
                    taciteReconduction={contrat.taciteReconduction ?? false}
                />
            )}

            {prestataire && (
                <BlocCoordonneesPrestataire
                    prestataire={prestataire as unknown as import('@/types').Prestataire}
                    typeContrat={(contrat.type ?? 'autre').toUpperCase() as import('@/types').TypeContrat}
                    numeroContrat={contrat.numeroContrat ?? undefined}
                    onCompleter={() => setIsEditing(true)}
                />
            )}

            <div className={styles.grid}>
                <ContractInfoGrid
                    contrat={contrat}
                    typeLabel={typeLabel}
                    joursRestants={joursRestants}
                    alerteRenouvellement={alerteRenouvellement}
                    alerteUrgente={alerteUrgente}
                    onContactProvider={() => setShowContactModal(true)}
                />

                <ContractAttachmentsSection
                    pieceJointes={pieceJointes}
                    showAddAttachment={showAddAttachment}
                    newAttachment={newAttachment}
                    onToggleAddAttachment={() => setShowAddAttachment(!showAddAttachment)}
                    onNewAttachmentChange={setNewAttachment}
                    onAddAttachment={handleAddAttachment}
                    onDeleteAttachment={handleDeleteAttachment}
                    onDownloadAttachment={handleDownloadAttachment}
                />
            </div>

            {interventions.length > 0 && (
                <div className={styles.section}>
                    <h2>Historique des interventions ({interventions.length})</h2>
                    <InterventionHistory interventions={interventions as unknown as import('@/types').InterventionDetaille[]} />
                </div>
            )}

            {showResiliationModal && (
                <ResiliationModal
                    contrat={contrat as unknown as import('@/types').ContratDetaille}
                    onClose={() => setShowResiliationModal(false)}
                    onConfirm={() => alert('Contrat résilié avec succès')}
                />
            )}

            {showContactModal && (
                <ContactProviderModal
                    isOpen={showContactModal}
                    prestataire={(allPrestataires.find(p => p.id === contrat.prestataireId) || null) as import('@/types').Prestataire | null}
                    contrat={{
                        nom: contrat.nom ?? 'Sans nom',
                        numeroContrat: contrat.numeroContrat ?? undefined,
                        type: typeLabel,
                        dateFin: contrat.dateFin ?? undefined
                    }}
                    onClose={() => setShowContactModal(false)}
                />
            )}

            {isEditing && (
                <ContractEditModal
                    editForm={editForm}
                    prestataires={allPrestataires as unknown as import('@/types').Prestataire[]}
                    onFormChange={setEditForm}
                    onSave={handleSaveEdit}
                    onCancel={handleCancelEdit}
                />
            )}
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

export default function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
    return (
        <Suspense fallback={<LoadingFallback />}>
            <ContractDetailContent params={params} />
        </Suspense>
    );
}
