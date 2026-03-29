'use client';

import {
  ContractsModals,
} from '@/features/maintenance/contracts/components';
import { ContractsFinanceView } from '@/features/maintenance/contracts/components/ContractsFinanceView';
import { useContractsPage } from '@/features/maintenance/contracts/hooks';

export default function ContractsPage() {
  const pageData = useContractsPage();

  return (
    <div className="container">
      <ContractsFinanceView
        contrats={pageData.contrats}
        filteredContrats={pageData.filteredContrats}
        contratSyndic={pageData.contratSyndic}
        searchTerm={pageData.searchTerm}
        setSearchTerm={pageData.setSearchTerm}
        statutFilter={pageData.statutFilter}
        setStatutFilter={pageData.setStatutFilter}
        onExport={pageData.handleExport}
        onAddContract={() => pageData.setIsAddModalOpen(true)}
        onEditSyndic={() => pageData.setIsEditSyndicModalOpen(true)}
        onVoirDetails={pageData.handleVoirDetails}
        onOpenDecisionModal={pageData.handleOpenDecisionModal}
        pendingRenewals={pageData.pendingRenewals}
        onConfirmerRenouvellement={pageData.handleConfirmerRenouvellement}
        onAnnulerRenouvellement={pageData.handleAnnulerRenouvellement}
      />

      {/* Modals conservées telles quelles */}
      <ContractsModals
        isAddModalOpen={pageData.isAddModalOpen}
        onCloseAddModal={() => pageData.setIsAddModalOpen(false)}
        prestataires={pageData.prestataires}
        onAddContrat={pageData.handleAddContrat}
        contratToEdit={pageData.contratToEdit}
        onCloseEditModal={() => pageData.setContratToEdit(null)}
        onSaveContrat={pageData.handleSaveContrat}
        isEditSyndicModalOpen={pageData.isEditSyndicModalOpen}
        contratSyndic={pageData.contratSyndic}
        onSaveSyndic={pageData.handleSaveSyndic}
        onCloseEditSyndicModal={() => pageData.setIsEditSyndicModalOpen(false)}
        contratToResiliate={pageData.contratToResiliate}
        onCloseResiliationModal={() => pageData.setContratToResiliate(null)}
        onConfirmResiliation={pageData.handleResiliationConfirm}
        contratExpireDecision={pageData.contratExpireDecision}
        onCloseDecisionModal={() => pageData.setContratExpireDecision(null)}
        onRenouveler={pageData.handleRenouvelerContrat}
        onResilier={pageData.handleResilierContratExpire}
        prestataireEmail={
          pageData.contratExpireDecision
            ? pageData.prestataires.find(p => p.id === pageData.contratExpireDecision?.contrat.prestataireId)?.email
            : undefined
        }
      />
    </div>
  );
}
