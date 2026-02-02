'use client';

import { Toast } from '@/components/features/maintenance/Contracts';
import {
  ContractsPageHeader,
  ContractsListSection,
  ContractsModals,
  ContractsPageSections,
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

      <ContractsPageSections
        contrats={contrats}
        contratSyndic={contratSyndic}
        onSyndicAction={handleSyndicAction}
        onEditSyndic={() => setIsEditSyndicModalOpen(true)}
        onOpenDecisionModal={handleOpenDecisionModal}
        onGenerateOrder={handleGenerateOrder}
      />

      <ContractsListSection
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
