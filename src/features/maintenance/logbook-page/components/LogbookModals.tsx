'use client';

import {
    EquipementModal,
    DocumentModal,
    InterventionFormModal,
    AssuranceModal,
    Intervention,
} from '@/components/features/maintenance/Logbook';
import type { ModalsState, ModalsHandlers } from '../hooks/useLogbookPage';

export interface LogbookModalsProps {
    modals: ModalsState;
    handlers: ModalsHandlers;
}

export function LogbookModals({ modals, handlers }: LogbookModalsProps) {
    return (
        <>
            {modals.selectedEquipement && (
                <EquipementModal
                    equipement={modals.selectedEquipement}
                    contrats={handlers.getContratsForEquipement(modals.selectedEquipement)}
                    interventions={handlers.getInterventionsForEquipement(modals.selectedEquipement) as Intervention[]}
                    documents={handlers.getDocumentsForEquipement(modals.selectedEquipement)}
                    onClose={() => handlers.setSelectedEquipement(null)}
                    onFilterByEquipement={handlers.handleFilterByEquipement}
                />
            )}

            {modals.selectedDocument && (
                <DocumentModal
                    document={modals.selectedDocument}
                    onClose={() => handlers.setSelectedDocument(null)}
                />
            )}

            <InterventionFormModal
                isOpen={modals.showNewInterventionModal}
                isEditing={false}
                formData={modals.newInterventionForm}
                equipementsPrincipaux={modals.coproprieteInfo.equipementsPrincipaux}
                prestataires={modals.prestatairesOptions || []}
                isSubmitting={modals.isSubmitting}
                onFormDataChange={handlers.setNewInterventionForm}
                onSubmit={handlers.handleCreateIntervention}
                onClose={() => handlers.setShowNewInterventionModal(false)}
            />

            <InterventionFormModal
                isOpen={!!modals.editingIntervention}
                isEditing={true}
                formData={modals.newInterventionForm}
                equipementsPrincipaux={modals.coproprieteInfo.equipementsPrincipaux}
                prestataires={modals.prestatairesOptions || []}
                isSubmitting={modals.isSubmitting}
                onFormDataChange={handlers.setNewInterventionForm}
                onSubmit={handlers.handleSaveIntervention}
                onClose={() => handlers.setEditingIntervention(null)}
            />

            {modals.selectedAssurance && (
                <AssuranceModal
                    assurance={modals.selectedAssurance}
                    onClose={() => handlers.setSelectedAssurance(null)}
                />
            )}
        </>
    );
}
