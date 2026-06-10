import type { Facture, StatutFacture, FacturesKPIData } from '@/components/features/finance/Factures/types';

export type { Facture, StatutFacture, FacturesKPIData };

export type FacturesViewMode = 'kanban' | 'table';

export type KanbanColumnId = 'overdue' | 'pending' | 'to_pay' | 'paid' | 'avoirs';

// Carte kanban : facture enrichie de l'effet des avoirs liés (le GL reste la source,
// ces champs sont dérivés pour l'affichage).
export type KanbanFacture = Facture & {
  /** Σ des avoirs rattachés à cette facture (0 si aucun, 0 pour un avoir). */
  avoirsDeduits: number;
  /** Montant − avoirs déduits (= ce qui reste dû sur la pièce, hors paiements). */
  montantNet: number;
};

export interface KanbanColumn {
  id: KanbanColumnId;
  label: string;
  color: string;
  dotColor: string;
  factures: KanbanFacture[];
  total: number;
}
