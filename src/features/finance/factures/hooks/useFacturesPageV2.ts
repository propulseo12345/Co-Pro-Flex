'use client';

import { useState, useMemo } from 'react';
import { useFacturesPage } from '@/features/finance/invoices/useFacturesPage';
import { isFactureEnRetard } from '@/components/features/finance/Factures/types';
import type { Facture } from '@/components/features/finance/Factures/types';
import type { FacturesViewMode, KanbanColumn, KanbanColumnId } from '../types';

const KANBAN_COLUMNS_CONFIG: { id: KanbanColumnId; label: string; color: string; dotColor: string }[] = [
  { id: 'overdue', label: 'En retard', color: '#ef4444', dotColor: '#ef4444' },
  { id: 'pending', label: 'En attente', color: '#3b82f6', dotColor: '#3b82f6' },
  { id: 'to_pay', label: 'À payer', color: '#f59e0b', dotColor: '#f59e0b' },
  { id: 'paid', label: 'Payées', color: '#22c55e', dotColor: '#22c55e' },
];

function classifyFacture(facture: Facture): KanbanColumnId {
  if (isFactureEnRetard(facture)) return 'overdue';
  if (facture.statut === 'PAYEE') return 'paid';
  if (facture.statut === 'A_PAYER') return 'to_pay';
  return 'pending'; // BROUILLON, A_VALIDER, VALIDEE
}

export function useFacturesPageV2() {
  const page = useFacturesPage();
  const [viewMode, setViewMode] = useState<FacturesViewMode>('kanban');

  const kanbanColumns: KanbanColumn[] = useMemo(() => {
    const facturesOnly = (page.factures as Facture[]).filter(
      (f) => f.typeDocument === 'FACTURE'
    );

    const filtered = facturesOnly.filter((f) => {
      const matchesSearch = !page.searchTerm ||
        f.fournisseur.toLowerCase().includes(page.searchTerm.toLowerCase()) ||
        f.reference.toLowerCase().includes(page.searchTerm.toLowerCase()) ||
        f.montant.toString().includes(page.searchTerm);
      const matchesFournisseur = !page.fournisseurFilter || f.fournisseur === page.fournisseurFilter;
      return matchesSearch && matchesFournisseur;
    });

    const groups: Record<KanbanColumnId, Facture[]> = {
      overdue: [],
      pending: [],
      to_pay: [],
      paid: [],
    };

    for (const f of filtered) {
      groups[classifyFacture(f)].push(f);
    }

    return KANBAN_COLUMNS_CONFIG.map(col => ({
      ...col,
      factures: groups[col.id],
      total: groups[col.id].reduce((sum, f) => sum + f.montant, 0),
    }));
  }, [page.factures, page.searchTerm, page.fournisseurFilter]);

  const montantPaye = useMemo(() => {
    const payees = (page.factures as Facture[]).filter(
      (f) => f.typeDocument === 'FACTURE' && f.statut === 'PAYEE'
    );
    return payees.reduce((sum: number, f) => sum + f.montant, 0);
  }, [page.factures]);

  return {
    ...page,
    viewMode,
    setViewMode,
    kanbanColumns,
    montantPaye,
  };
}
