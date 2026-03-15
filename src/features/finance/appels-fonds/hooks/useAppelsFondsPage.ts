'use client';

import { useState, useMemo } from 'react';
import { useCalls, useCallCampaigns, useAccountingPeriods, useUnpaid } from '@/hooks/modules/useFinanceData';
import { useBudgetData } from '@/hooks/modules/useBudgetData';
import type { CallForFundsOverview, AccountingPeriod, CallCampaign } from '@/lib/finance/api';
import type { AppelTab, TrimesterCard, TravauxProject, AppelStats, TravauxStats, CallGroup, CallCategory } from '../types';
import { buildTrimesterCards, buildTravauxProjects, computeStats } from '../utils';

// ============================================================================
// Return type
// ============================================================================

export interface UseAppelsFondsPageReturn {
  calls: CallForFundsOverview[];
  trimesterCards: TrimesterCard[];
  travauxProjects: TravauxProject[];
  campaign: CallCampaign | null;
  globalStats: AppelStats;
  courantStats: AppelStats;
  travauxStats: TravauxStats;
  activeTab: AppelTab;
  setActiveTab: (tab: AppelTab) => void;
  impayesCount: number;
  periods: AccountingPeriod[];
  selectedPeriod: AccountingPeriod | null;
  navigatePeriod: (direction: 'prev' | 'next') => void;
  selectPeriod: (periodId: string) => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  isLoading: boolean;
  wizardBudgets: { id: string; label: string; total_amount: number; budget_type: string }[];
  refreshCalls: () => Promise<void>;
  groupedCalls: CallCategory[];
}

// ============================================================================
// Empty stats
// ============================================================================

const EMPTY_STATS: AppelStats = { totalCalled: 0, totalPaid: 0, totalUnpaid: 0, recoveryRate: 0 };
const EMPTY_TRAVAUX_STATS: TravauxStats = { ...EMPTY_STATS, projectCount: 0 };

// ============================================================================
// Hook
// ============================================================================

export function useAppelsFondsPage(): UseAppelsFondsPageReturn {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<AppelTab>('all');

  // ── Period navigation ──
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);

  // ── Data fetching ──
  const { data: allCalls, isLoading: callsLoading, refresh: refreshCalls } = useCalls();
  const { data: allCampaigns, isLoading: campaignsLoading } = useCallCampaigns();
  const { data: allPeriods, isLoading: periodsLoading } = useAccountingPeriods();
  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaid();

  // ── Sort periods by start_date descending (most recent first) ──
  const periods = useMemo(() => {
    if (!allPeriods) return [];
    return [...allPeriods].sort(
      (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
  }, [allPeriods]);

  // ── Selected period ──
  const selectedPeriod = periods[selectedPeriodIndex] ?? null;

  const canGoPrev = selectedPeriodIndex < periods.length - 1;
  const canGoNext = selectedPeriodIndex > 0;

  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && canGoPrev) {
      setSelectedPeriodIndex(i => i + 1);
    } else if (direction === 'next' && canGoNext) {
      setSelectedPeriodIndex(i => i - 1);
    }
  };

  const selectPeriod = (periodId: string) => {
    const idx = periods.findIndex(p => p.id === periodId);
    if (idx >= 0) setSelectedPeriodIndex(idx);
  };

  // ── Load budgets for selected period year ──
  const periodYear = selectedPeriod
    ? new Date(selectedPeriod.start_date).getFullYear()
    : undefined;

  const { budgets, isLoading: budgetsLoading } = useBudgetData({
    periodYear,
  });

  // ── Filter calls for selected period ──
  const periodCalls = useMemo(() => {
    if (!allCalls || !selectedPeriod) return [];
    return allCalls.filter(c => c.period_id === selectedPeriod.id);
  }, [allCalls, selectedPeriod]);

  // ── Campaign for selected period ──
  const campaign = useMemo(() => {
    if (!allCampaigns || !selectedPeriod) return null;
    return allCampaigns.find(c => c.period_id === selectedPeriod.id) ?? null;
  }, [allCampaigns, selectedPeriod]);

  // ── Budget ID sets by type ──
  const worksBudgetIds = useMemo(() => {
    return new Set(budgets.filter(b => b.budget_type === 'works').map(b => b.id));
  }, [budgets]);

  const currentBudgetIds = useMemo(() => {
    return new Set(budgets.filter(b => b.budget_type === 'current').map(b => b.id));
  }, [budgets]);

  // ── Split calls: courant vs travaux ──
  const courantCalls = useMemo(() => {
    return periodCalls.filter(c => {
      if (!c.budget_id) return true; // No budget = courant
      if (currentBudgetIds.has(c.budget_id)) return true;
      if (worksBudgetIds.has(c.budget_id)) return false;
      return true; // Unknown budget = default courant
    });
  }, [periodCalls, currentBudgetIds, worksBudgetIds]);

  const travauxCalls = useMemo(() => {
    return periodCalls.filter(c => c.budget_id && worksBudgetIds.has(c.budget_id));
  }, [periodCalls, worksBudgetIds]);

  // ── Build trimester cards (courant) ──
  const trimesterCards = useMemo(() => {
    if (!selectedPeriod || courantCalls.length === 0) return [];
    return buildTrimesterCards(courantCalls, selectedPeriod.start_date);
  }, [courantCalls, selectedPeriod]);

  // ── Build travaux projects ──
  const travauxProjects = useMemo(() => {
    if (travauxCalls.length === 0) return [];
    const worksBudgets = budgets.filter(b => b.budget_type === 'works');
    return buildTravauxProjects(travauxCalls, worksBudgets);
  }, [travauxCalls, budgets]);

  // ── Compute stats ──
  const globalStats = useMemo(() => {
    if (periodCalls.length === 0) return EMPTY_STATS;
    return computeStats(periodCalls);
  }, [periodCalls]);

  const courantStats = useMemo(() => {
    if (courantCalls.length === 0) return EMPTY_STATS;
    return computeStats(courantCalls);
  }, [courantCalls]);

  const travauxStats: TravauxStats = useMemo(() => {
    if (travauxCalls.length === 0) return EMPTY_TRAVAUX_STATS;
    const base = computeStats(travauxCalls);
    return { ...base, projectCount: travauxProjects.length };
  }, [travauxCalls, travauxProjects]);

  // ── Unpaid count ──
  const impayesCount = useMemo(() => {
    if (!unpaidData) return 0;
    return unpaidData.length;
  }, [unpaidData]);

  // ── Loading ──
  const isLoading = callsLoading || campaignsLoading || periodsLoading || unpaidLoading || budgetsLoading;

  // ── Grouped calls for accordion view ──
  const groupedCalls = useMemo((): CallCategory[] => {
    const budgetMap = new Map(budgets.map(b => [b.id, b]));

    const buildGroups = (calls: CallForFundsOverview[]): CallGroup[] => {
      const byBudget = new Map<string, CallForFundsOverview[]>();
      const trimestriels: CallForFundsOverview[] = [];
      const ponctuels: CallForFundsOverview[] = [];

      for (const call of calls) {
        if (call.budget_id) {
          const existing = byBudget.get(call.budget_id) ?? [];
          existing.push(call);
          byBudget.set(call.budget_id, existing);
        } else if (call.trimester) {
          trimestriels.push(call);
        } else {
          ponctuels.push(call);
        }
      }

      const groups: CallGroup[] = [];

      // Appels trimestriels non rattachés à un budget → "Appels de fonds Budget 20XX"
      if (trimestriels.length > 0) {
        const year = periodYear ?? new Date().getFullYear();
        groups.push({
          label: `Appels de fonds Budget ${year}`,
          calls: trimestriels,
          stats: computeStats(trimestriels),
        });
      }

      // Appels rattachés à un budget → "Appels exceptionnels"
      for (const [, groupCalls] of byBudget) {
        groups.push({
          label: 'Appels exceptionnels',
          calls: groupCalls,
          stats: computeStats(groupCalls),
        });
      }

      if (ponctuels.length > 0) {
        groups.push({
          label: 'Appels ponctuels',
          calls: ponctuels,
          stats: computeStats(ponctuels),
        });
      }

      return groups;
    };

    const categories: CallCategory[] = [
      {
        id: 'courant',
        label: 'Budget Courant',
        groups: buildGroups(courantCalls),
        stats: courantStats,
      },
      {
        id: 'travaux',
        label: 'Budget Travaux',
        groups: buildGroups(travauxCalls),
        stats: travauxStats,
      },
    ];

    return categories;
  }, [courantCalls, travauxCalls, budgets, courantStats, travauxStats]);

  // ── Budgets formatted for wizard ──
  const wizardBudgets = useMemo(() => {
    return budgets.map(b => ({
      id: b.id,
      label: b.name,
      total_amount: b.total_planned,
      budget_type: b.budget_type,
    }));
  }, [budgets]);

  return {
    calls: periodCalls,
    trimesterCards,
    travauxProjects,
    campaign,
    globalStats,
    courantStats,
    travauxStats,
    activeTab,
    setActiveTab,
    impayesCount,
    periods,
    selectedPeriod,
    navigatePeriod,
    selectPeriod,
    canGoPrev,
    canGoNext,
    isLoading,
    wizardBudgets,
    refreshCalls,
    groupedCalls,
  };
}
