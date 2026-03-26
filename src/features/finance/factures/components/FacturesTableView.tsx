'use client';

import { useState, useMemo } from 'react';
import { FacturesFilters } from '@/components/features/finance/Factures/FacturesFilters';
import { FacturesTable } from '@/components/features/finance/Factures/FacturesTable';
import { isFactureEnRetard } from '@/components/features/finance/Factures/types';
import type { Facture } from '@/components/features/finance/Factures/types';
import type { PosteBudgetData } from '@/components/features/finance/Budget/types';
import type { useFacturesPageV2 } from '@/features/finance/factures';
import { FacturesStatusSidebar } from './FacturesStatusSidebar';
import type { SidebarFilter } from './FacturesStatusSidebar';
import styles from './FacturesTableView.module.css';

interface FacturesTableViewProps {
  page: ReturnType<typeof useFacturesPageV2>;
  postesBudget: PosteBudgetData[];
}

function applySidebarFilter(factures: Facture[], filter: SidebarFilter): Facture[] {
  if (filter === 'all') return factures;
  if (filter === 'overdue') return factures.filter(f => isFactureEnRetard(f));
  if (filter === 'paid') return factures.filter(f => f.statut === 'PAYEE');
  // pending = not overdue and not paid
  return factures.filter(f => !isFactureEnRetard(f) && f.statut !== 'PAYEE');
}

export function FacturesTableView({ page, postesBudget }: FacturesTableViewProps) {
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>('all');

  const displayedFactures = useMemo(
    () => applySidebarFilter(page.filteredFactures, sidebarFilter),
    [page.filteredFactures, sidebarFilter]
  );

  return (
    <div>
      <FacturesFilters
        searchTerm={page.searchTerm}
        onSearchChange={page.setSearchTerm}
        statutFilter={page.statutFilter}
        onStatutFilterChange={page.handleStatutFilterChange}
        sortOrder={page.sortOrder}
        onSortOrderChange={() => page.setSortOrder((prev: string) => prev === 'DESC' ? 'ASC' : 'DESC')}
        fournisseurFilter={page.fournisseurFilter}
        onFournisseurFilterChange={page.setFournisseurFilter}
        fournisseurs={page.fournisseurs}
        periodeFilter={page.periodeFilter}
        onPeriodeFilterChange={page.setPeriodeFilter}
      />
      <div className={styles.layout}>
        <FacturesStatusSidebar
          factures={page.factures}
          activeFilter={sidebarFilter}
          onFilterChange={setSidebarFilter}
        />
        <div className={styles.main}>
          <FacturesTable
            factures={displayedFactures}
            postesBudget={postesBudget}
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
        </div>
      </div>
    </div>
  );
}
