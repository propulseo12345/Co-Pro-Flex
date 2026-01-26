'use client';

import { FacturesHeader } from '@/components/features/finance/Factures/FacturesHeader';
import { FacturesKPI } from '@/components/features/finance/Factures/FacturesKPI';
import { FacturesFilters } from '@/components/features/finance/Factures/FacturesFilters';
import { FacturesTable } from '@/components/features/finance/Factures/FacturesTable';
import { PaymentModal } from '@/components/features/finance/Factures/modals/PaymentModal';
import { AccountingModal } from '@/components/features/finance/Factures/modals/AccountingModal';
import { ViewModal } from '@/components/features/finance/Factures/modals/ViewModal';
import { EditModal } from '@/components/features/finance/Factures/modals/EditModal';
import { DeleteModal } from '@/components/features/finance/Factures/modals/DeleteModal';
import { NewFactureModal } from '@/components/features/finance/Factures/modals/NewFactureModal';
import { AvoirModal } from '@/components/features/finance/Factures/modals/AvoirModal';
import { MOCK_POSTES_BUDGET } from '@/components/features/finance/Budget';
import { useFacturesPage } from '@/features/finance';
import styles from './factures.module.css';

export default function FacturesPage() {
  const page = useFacturesPage();

  return (
    <div className={styles.container}>
      <FacturesHeader onNewFacture={page.handleNewFacture} />
      <FacturesKPI kpiData={page.kpiData} onKPIClick={page.handleKPIClick} activeFilter={page.kpiFilter || undefined} />
      <FacturesFilters
        searchTerm={page.searchTerm}
        onSearchChange={page.setSearchTerm}
        statutFilter={page.statutFilter}
        onStatutFilterChange={page.handleStatutFilterChange}
        sortOrder={page.sortOrder}
        onSortOrderChange={() => page.setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
        fournisseurFilter={page.fournisseurFilter}
        onFournisseurFilterChange={page.setFournisseurFilter}
        fournisseurs={page.fournisseurs}
        periodeFilter={page.periodeFilter}
        onPeriodeFilterChange={page.setPeriodeFilter}
      />
      <FacturesTable
        factures={page.filteredFactures}
        postesBudget={MOCK_POSTES_BUDGET}
        onStatutClick={page.handleStatutClick}
        onCategorize={page.handleCategorize}
        onView={page.handleView}
        onEdit={page.handleEdit}
        onDelete={page.handleDelete}
        onCreateAvoir={page.handleCreateAvoir}
        onViewPJ={page.handleView}
        sortColumn={page.sortColumn}
        sortDirection={page.sortDirection}
        onSort={page.handleSort}
      />

      {page.showPaymentModal && page.selectedFacture && (
        <PaymentModal facture={page.selectedFacture} onClose={page.closePaymentModal} onPaymentComplete={page.handlePaymentComplete} />
      )}
      {page.showAccountingModal && page.selectedFacture && (
        <AccountingModal facture={page.selectedFacture} selectedTypeDepense={page.selectedTypeDepense} onTypeDepenseChange={page.setSelectedTypeDepense} onClose={page.closeAccountingModal} onSend={page.handleSendToAccounting} />
      )}
      {page.showViewModal && page.selectedFacture && (
        <ViewModal facture={page.selectedFacture} onClose={page.closeViewModal} />
      )}
      {page.showEditModal && page.selectedFacture && (
        <EditModal facture={page.selectedFacture} editForm={page.editForm} postesBudget={MOCK_POSTES_BUDGET} onEditFormChange={page.setEditForm} onClose={page.closeEditModal} onSave={page.handleSaveEdit} />
      )}
      {page.showDeleteModal && page.selectedFacture && (
        <DeleteModal facture={page.selectedFacture} onClose={page.closeDeleteModal} onConfirm={page.handleConfirmDelete} />
      )}
      {page.showNewModal && (
        <NewFactureModal form={page.newFactureForm} postesBudget={MOCK_POSTES_BUDGET} onFormChange={page.setNewFactureForm} onClose={page.closeNewModal} onCreate={page.handleCreateFacture} />
      )}
      {page.showAvoirModal && page.selectedFacture && (
        <AvoirModal facture={page.selectedFacture} onClose={page.closeAvoirModal} onConfirm={page.handleConfirmAvoir} />
      )}
    </div>
  );
}
