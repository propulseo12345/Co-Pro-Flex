'use client';

import { useState, useMemo } from 'react';
import { useCalls, useCallCampaigns, useAccountingPeriods, useUnpaid } from '@/hooks/modules/useFinanceData';
import { useBudgetData } from '@/hooks/modules/useBudgetData';
import type { CallForFundsOverview, AccountingPeriod, CallCampaign } from '@/lib/finance/api';
import type { AppelTab, TrimesterCard, TravauxProject, AppelStats, TravauxStats } from '../types';
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
  const { data: allCalls, isLoading: callsLoading } = useCalls();
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
  };
}
