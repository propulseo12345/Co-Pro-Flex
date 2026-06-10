'use client';

import { useRouter } from 'next/navigation';
import { Download, Plus } from 'lucide-react';
import { useFacturesPageV2 } from '@/features/finance/factures';
import {
  FacturesViewToggle,
  FacturesKanbanView,
  FacturesTableView,
} from '@/features/finance/factures';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import { FinanceKpiStrip } from '@/components/layout/FinanceKpiStrip';
import type { FinanceKpi } from '@/components/layout/FinanceKpiStrip';
import { PaymentModal } from '@/components/features/finance/Factures/modals/PaymentModal';
import { AccountingModal } from '@/components/features/finance/Factures/modals/AccountingModal';
import { ViewModal } from '@/components/features/finance/Factures/modals/ViewModal';
import { EditModal } from '@/components/features/finance/Factures/modals/EditModal';
import { DeleteModal } from '@/components/features/finance/Factures/modals/DeleteModal';
import { AvoirModal } from '@/components/features/finance/Factures/modals/AvoirModal';
import { useBudget } from '@/hooks/modules/useBudget';
import styles from './factures.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

export default function FacturesPage() {
  const router = useRouter();
  const page = useFacturesPageV2();
  const { postesBudget } = useBudget();

  if (page.isLoading) {
    return (
      <div className={styles.page} style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
        Chargement des factures...
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <FinanceTopBar
        title="Factures fournisseurs"
        subtitle="Suivi et gestion des factures prestataires"
        actions={
          <>
            <FacturesViewToggle viewMode={page.viewMode} onViewModeChange={page.setViewMode} />
            <button className={topBarStyles.btnGhost} onClick={() => {/* TODO */}}>
              <Download size={14} /> Export
            </button>
            {/* Route de saisie UNIQUE : /finance/factures/new (vraie comptabilisation,
                création de fournisseur à la volée). L'ancien modal créait des brouillons
                sans lignes ni écriture — retiré. */}
            <button className={topBarStyles.btnPrimary} onClick={() => router.push('/finance/factures/new')}>
              <Plus size={14} /> Nouvelle facture
            </button>
          </>
        }
      />
      <FinanceKpiStrip
        items={[
          { label: 'Factures', value: String(page.kpiData.nombreFactures), color: 'var(--primary)' },
          { label: 'Total payé', value: formatCurrency(page.montantPaye), color: 'var(--success)' },
          { label: 'En retard', value: formatCurrency(page.kpiData.montantEchu), color: 'var(--danger)' },
          { label: 'Cette semaine', value: `${page.kpiData.echeancesSemaine} éch.` },
        ] satisfies FinanceKpi[]}
      />

      {page.viewMode === 'kanban' ? (
        <FacturesKanbanView
          columns={page.kanbanColumns}
          onCardClick={page.handleView}
        />
      ) : (
        <FacturesTableView page={page} postesBudget={postesBudget} />
      )}

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
        <EditModal facture={page.selectedFacture} editForm={page.editForm} postesBudget={postesBudget} onEditFormChange={page.setEditForm} onClose={page.closeEditModal} onSave={page.handleSaveEdit} />
      )}
      {page.showDeleteModal && page.selectedFacture && (
        <DeleteModal facture={page.selectedFacture} onClose={page.closeDeleteModal} onConfirm={page.handleConfirmDelete} />
      )}
      {page.showAvoirModal && page.selectedFacture && (
        <AvoirModal facture={page.selectedFacture} onClose={page.closeAvoirModal} onConfirm={page.handleConfirmAvoir} />
      )}
    </div>
  );
}
