import type { CallForFundsOverview } from '@/lib/finance/api';

export type AppelTab = 'all' | 'courant' | 'travaux';

export type TrimesterStatus = 'draft' | 'active' | 'paid';

export interface TrimesterCard {
  trimester: number;
  label: string;
  calls: CallForFundsOverview[];
  totalAmount: number;
  totalPaid: number;
  recoveryRate: number;
  keys: { name: string; amount: number }[];
  status: TrimesterStatus;
}

export interface TravauxProject {
  budgetId: string;
  budgetLabel: string;
  agId: string | null;
  agDate: string | null;
  resolutionTitle: string;
  article: string;
  repartitionKeyName: string;
  totalAmount: number;
  totalPaid: number;
  recoveryRate: number;
  calls: CallForFundsOverview[];
}

export interface AppelStats {
  totalCalled: number;
  totalPaid: number;
  totalUnpaid: number;
  recoveryRate: number;
}

export interface TravauxStats extends AppelStats {
  projectCount: number;
}

export interface DetailStats {
  called: number;
  paid: number;
  remaining: number;
  paidCount: number;
  totalCount: number;
}
