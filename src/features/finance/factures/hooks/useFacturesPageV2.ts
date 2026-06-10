'use client';

import { useState, useMemo } from 'react';
import { useFacturesPage } from '@/features/finance/invoices/useFacturesPage';
import { isFactureEnRetard } from '@/components/features/finance/Factures/types';
import type { Facture } from '@/components/features/finance/Factures/types';
import type { FacturesViewMode, KanbanColumn, KanbanColumnId, KanbanFacture } from '../types';

const KANBAN_COLUMNS_CONFIG: { id: KanbanColumnId; label: string; color: string; dotColor: string }[] = [
  { id: 'overdue', label: 'En retard', color: '#ef4444', dotColor: '#ef4444' },
  { id: 'pending', label: 'En attente', color: '#3b82f6', dotColor: '#3b82f6' },
  { id: 'to_pay', label: 'À payer', color: '#f59e0b', dotColor: '#f59e0b' },
  { id: 'paid', label: 'Payées', color: '#22c55e', dotColor: '#22c55e' },
  { id: 'avoirs', label: 'Avoirs', color: '#a78bfa', dotColor: '#a78bfa' },
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
    const all = page.factures as Facture[];
    const avoirs = all.filter((f) => f.typeDocument === 'AVOIR');
    const facturesOnly = all.filter((f) => f.typeDocument === 'FACTURE');

    const matchesFilters = (f: Facture) => {
      const matchesSearch = !page.searchTerm ||
        f.fournisseur.toLowerCase().includes(page.searchTerm.toLowerCase()) ||
        f.reference.toLowerCase().includes(page.searchTerm.toLowerCase()) ||
        f.montant.toString().includes(page.searchTerm);
      const matchesFournisseur = !page.fournisseurFilter || f.fournisseur === page.fournisseurFilter;
      return matchesSearch && matchesFournisseur;
    };

    // Effet des avoirs : déduits du montant affiché de leur facture d'origine,
    // ET visibles dans une colonne dédiée (pièces non payables).
    const enrich = (f: Facture): KanbanFacture => {
      const deduits = avoirs
        .filter(a => a.factureOrigineId === f.id)
        .reduce((sum, a) => sum + a.montant, 0);
      return { ...f, avoirsDeduits: deduits, montantNet: f.montant - deduits };
    };

    const groups: Record<KanbanColumnId, KanbanFacture[]> = {
      overdue: [],
      pending: [],
      to_pay: [],
      paid: [],
      avoirs: [],
    };

    for (const f of facturesOnly.filter(matchesFilters)) {
      groups[classifyFacture(f)].push(enrich(f));
    }
    for (const a of avoirs.filter(matchesFilters)) {
      groups.avoirs.push({ ...a, avoirsDeduits: 0, montantNet: a.montant });
    }

    return KANBAN_COLUMNS_CONFIG.map(col => ({
      ...col,
      factures: groups[col.id],
      // Colonnes payables : total NET (ce qui reste réellement dû) ; avoirs : total en négatif.
      total: col.id === 'avoirs'
        ? -groups.avoirs.reduce((sum, f) => sum + f.montant, 0)
        : groups[col.id].reduce((sum, f) => sum + f.montantNet, 0),
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
