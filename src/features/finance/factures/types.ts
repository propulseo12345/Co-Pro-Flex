import type { Facture, StatutFacture, FacturesKPIData } from '@/components/features/finance/Factures/types';

export type { Facture, StatutFacture, FacturesKPIData };

export type FacturesViewMode = 'kanban' | 'table';

export type KanbanColumnId = 'overdue' | 'pending' | 'to_pay' | 'paid';

export interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  color: string;
  dotColor: string;
  factures: Facture[];
  total: number;
}
