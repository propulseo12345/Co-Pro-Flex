'use client';

import { useMemo } from 'react';
import {
  Wallet,
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Wrench,
  Users,
} from 'lucide-react';
import { getCurrentBusinessYear, formatDateFR } from '@/lib/time/period';
import { useDashboardData, type DashboardTodo, type DashboardActivity } from '@/hooks/modules/useDashboardData';
import { DASHBOARD_MAX_PRIORITIES, DASHBOARD_MAX_ACTIVITIES } from '@/lib/features/flags';

// ============================================================================
// TYPES
// ============================================================================

export interface QuickAction {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number }>;
}

export interface KpisData {
  current_balance: number;
  unpaid_total: number;
  next_ag_date: string | null;
  next_ag_id: string | null;
  budget_vote?: number;
  budget_realise?: number;
  budget_pct?: number;
  tresorerie?: number;
  provisions_travaux?: number;
  travaux_en_cours?: number;
  nb_travaux_ouverts?: number;
}

export interface ComputedDashboardData {
  kpis: KpisData;
  displayedTodos: DashboardTodo[];
  displayedActivities: DashboardActivity[];
  hasMoreTodos: boolean;
  hasTodos: boolean;
  hasActivities: boolean;
  todosCount: number;
}

export interface UseDashboardMainPageResult {
  data: ComputedDashboardData | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  isEmpty: boolean;
  refresh: () => void;
  businessYear: number;
  quickActions: QuickAction[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const BUSINESS_YEAR = getCurrentBusinessYear();

export const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Créer AG', href: '/ag/new', icon: Users },
  { label: 'Appel de fonds', href: '/finance/calls', icon: DollarSign },
  { label: 'Ajouter facture', href: '/finance/invoices', icon: FileText },
  { label: 'Ordre de service', href: '/maintenance/service-orders', icon: Wrench },
];

// Export icons for components
export const ICONS = {
  Wallet,
  AlertTriangle,
  Calendar,
  DollarSign,
  FileText,
  Wrench,
  Users,
};

// ============================================================================
// HELPERS
// ============================================================================

export function getPriorityIcon(priority: number): string {
  switch (priority) {
    case 1:
      return '🔴';
    case 2:
      return '🟠';
    case 3:
      return '🟡';
    default:
      return '🔵';
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return "À l'instant";
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDateFR(date);
}

// ============================================================================
// HOOK
// ============================================================================

export function useDashboardMainPage(): UseDashboardMainPageResult {
  const { data, isLoading, isRefreshing, error, isEmpty, refresh } = useDashboardData();

  const computedData = useMemo((): ComputedDashboardData | null => {
    if (!data) return null;

    const { kpis, todos, activities } = data;
    const displayedTodos = todos.slice(0, DASHBOARD_MAX_PRIORITIES);
    const displayedActivities = activities.slice(0, DASHBOARD_MAX_ACTIVITIES);
    const hasMoreTodos = todos.length > DASHBOARD_MAX_PRIORITIES;
    const hasTodos = todos.length > 0;
    const hasActivities = activities.length > 0;
    const todosCount = todos.length;

    return {
      kpis,
      displayedTodos,
      displayedActivities,
      hasMoreTodos,
      hasTodos,
      hasActivities,
      todosCount,
    };
  }, [data]);

  return {
    data: computedData,
    isLoading,
    isRefreshing,
    error,
    isEmpty: isEmpty || !data,
    refresh,
    businessYear: BUSINESS_YEAR,
    quickActions: QUICK_ACTIONS,
  };
}

// Re-export types from useDashboardData
export type { DashboardTodo, DashboardActivity };
