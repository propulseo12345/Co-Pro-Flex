import type { CallForFundsOverview } from '@/lib/finance/api';
import type { BudgetOverview } from '@/lib/budget/api';
import type { TrimesterCard, TravauxProject, TrimesterStatus, AppelStats } from './types';

/** Calcule le taux de recouvrement en pourcentage */
export function recoveryRate(totalAmount: number, totalPaid: number): number {
  return totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 1000) / 10 : 0;
}

/** Label trimestre : "T1 — Janvier → Mars 2026" */
export function trimesterLabel(trimester: number, periodStart: string): string {
  const year = new Date(periodStart).getFullYear();
  const months: Record<number, [string, string]> = {
    1: ['Janvier', 'Mars'],
    2: ['Avril', 'Juin'],
    3: ['Juillet', 'Septembre'],
    4: ['Octobre', 'Décembre'],
  };
  const [start, end] = months[trimester] ?? ['?', '?'];
  return `T${trimester} — ${start} → ${end} ${year + (trimester === 4 ? 1 : 0)}`;
}

/** Dérive le statut d'un trimestre depuis ses appels */
function deriveTrimesterStatus(calls: CallForFundsOverview[]): TrimesterStatus {
  if (calls.length === 0) return 'draft';
  if (calls.every(c => c.status === 'paid')) return 'paid';
  if (calls.some(c => c.status !== 'draft')) return 'active';
  return 'draft';
}

/** Construit les cartes trimestres depuis les appels budget courant */
export function buildTrimesterCards(
  calls: CallForFundsOverview[],
  periodStart: string
): TrimesterCard[] {
  const byTrimester = new Map<number, CallForFundsOverview[]>();

  for (const call of calls) {
    const t = call.trimester ?? 1;
    const existing = byTrimester.get(t) ?? [];
    existing.push(call);
    byTrimester.set(t, existing);
  }

  const cards: TrimesterCard[] = [];
  for (const [trimester, trimCalls] of byTrimester) {
    const totalAmount = trimCalls.reduce((sum, c) => sum + c.total_amount, 0);
    const totalPaid = trimCalls.reduce((sum, c) => sum + c.total_paid, 0);

    const keysMap = new Map<string, number>();
    for (const c of trimCalls) {
      keysMap.set(c.repartition_key_name, (keysMap.get(c.repartition_key_name) ?? 0) + c.total_amount);
    }

    cards.push({
      trimester,
      label: trimesterLabel(trimester, periodStart),
      calls: trimCalls,
      totalAmount,
      totalPaid,
      recoveryRate: recoveryRate(totalAmount, totalPaid),
      keys: Array.from(keysMap, ([name, amount]) => ({ name, amount })),
      status: deriveTrimesterStatus(trimCalls),
    });
  }

  return cards.sort((a, b) => a.trimester - b.trimester);
}

/** Construit les projets travaux depuis appels + budgets */
export function buildTravauxProjects(
  calls: CallForFundsOverview[],
  budgets: BudgetOverview[]
): TravauxProject[] {
  const budgetMap = new Map(budgets.map(b => [b.id, b]));
  const byBudget = new Map<string, CallForFundsOverview[]>();

  for (const call of calls) {
    if (!call.budget_id) continue;
    const existing = byBudget.get(call.budget_id) ?? [];
    existing.push(call);
    byBudget.set(call.budget_id, existing);
  }

  const projects: TravauxProject[] = [];
  for (const [budgetId, budgetCalls] of byBudget) {
    const budget = budgetMap.get(budgetId);
    if (!budget) continue;

    const sortedCalls = [...budgetCalls].sort(
      (a, b) => new Date(a.issue_date).getTime() - new Date(b.issue_date).getTime()
    );
    const totalAmount = sortedCalls.reduce((sum, c) => sum + c.total_amount, 0);
    const totalPaid = sortedCalls.reduce((sum, c) => sum + c.total_paid, 0);

    projects.push({
      budgetId,
      budgetLabel: budget.name,
      agId: null,
      agDate: null,
      resolutionTitle: budget.name,
      article: '',
      repartitionKeyName: sortedCalls[0]?.repartition_key_name ?? '',
      totalAmount,
      totalPaid,
      recoveryRate: recoveryRate(totalAmount, totalPaid),
      calls: sortedCalls,
    });
  }

  return projects;
}

/** Calcule les stats agrégées pour un ensemble d'appels */
export function computeStats(calls: CallForFundsOverview[]): AppelStats {
  const totalCalled = calls.reduce((sum, c) => sum + c.total_amount, 0);
  const totalPaid = calls.reduce((sum, c) => sum + c.total_paid, 0);
  return {
    totalCalled,
    totalPaid,
    totalUnpaid: totalCalled - totalPaid,
    recoveryRate: recoveryRate(totalCalled, totalPaid),
  };
}

/** Formatte un montant en euros */
export function formatEuros(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}
