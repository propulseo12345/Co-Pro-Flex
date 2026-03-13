'use client';

import { Toast } from '@/components/features/maintenance/Contracts';
import { PlannedOrdersSection } from '@/components/features/maintenance/Contracts';
import {
  ContractsPageHeader,
  ContractsModals,
  ContractsKpiBar,
  ContractsSyndicBanner,
  ContractsCostBar,
  ContractsTimelineSection,
} from '@/features/maintenance/contracts/components';
import { useContractsPage } from '@/features/maintenance/contracts/hooks';

export default function ContractsPage() {
  const {
    // Data
    contrats,
    filteredContrats,
    contratSyndic,
    prestataires,
    uniquePrestataires,
    toast,

    // Filters
    searchTerm,
    setSearchTerm,
    statutFilter,
    setStatutFilter,
    categorieFilter,
    setCategorieFilter,
    typeFilter,
    setTypeFilter,
    prestataireFilter,
    setPrestataireFilter,

    // Modals
    isAddModalOpen,
    setIsAddModalOpen,
    isEditSyndicModalOpen,
    setIsEditSyndicModalOpen,
    contratToResiliate,
    setContratToResiliate,
    contratToEdit,
    setContratToEdit,
    contratExpireDecision,
    setContratExpireDecision,

    // Actions
    setToast,
    handleAddContrat,
    handleSaveContrat,
    handleTelecharger,
    handleSaveSyndic,
    handleSyndicAction,
    handleExport,
    handleVoirDetails,
    handleOpenDecisionModal,
    handleRenouvelerContrat,
    handleResilierContratExpire,
    handleResiliationConfirm,
    handleGenerateOrder,
  } = useContractsPage();

  return (
    <div className="container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <ContractsPageHeader
        onExport={handleExport}
        onAddContract={() => setIsAddModalOpen(true)}
      />

      <ContractsKpiBar
        contrats={contrats}
        contratSyndic={contratSyndic}
      />

      <ContractsSyndicBanner
        contratSyndic={contratSyndic}
        onEditSyndic={() => setIsEditSyndicModalOpen(true)}
        onSyndicAction={handleSyndicAction}
      />

      <ContractsCostBar
        contrats={contrats}
        contratSyndic={contratSyndic}
      />

      <ContractsTimelineSection
        filteredContrats={filteredContrats}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statutFilter={statutFilter}
        onStatutChange={setStatutFilter}
        categorieFilter={categorieFilter}
        onCategorieChange={setCategorieFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
        prestataireFilter={prestataireFilter}
        onPrestataireChange={setPrestataireFilter}
        uniquePrestataires={uniquePrestataires}
        onVoirDetails={handleVoirDetails}
        onModifier={setContratToEdit}
        onResilier={setContratToResiliate}
        onTelecharger={handleTelecharger}
      />

      <PlannedOrdersSection
        contrats={contrats}
        onGenerateOrder={handleGenerateOrder}
      />

      <ContractsModals
        isAddModalOpen={isAddModalOpen}
        onCloseAddModal={() => setIsAddModalOpen(false)}
        prestataires={prestataires}
        onAddContrat={handleAddContrat}
        contratToEdit={contratToEdit}
        onCloseEditModal={() => setContratToEdit(null)}
        onSaveContrat={handleSaveContrat}
        isEditSyndicModalOpen={isEditSyndicModalOpen}
        contratSyndic={contratSyndic}
        onSaveSyndic={handleSaveSyndic}
        onCloseEditSyndicModal={() => setIsEditSyndicModalOpen(false)}
        contratToResiliate={contratToResiliate}
        onCloseResiliationModal={() => setContratToResiliate(null)}
        onConfirmResiliation={handleResiliationConfirm}
        contratExpireDecision={contratExpireDecision}
        onCloseDecisionModal={() => setContratExpireDecision(null)}
        onRenouveler={handleRenouvelerContrat}
        onResilier={handleResilierContratExpire}
      />
    </div>
  );
}
