/**
 * Dashboard API Service
 * Centralized layer for dashboard-related Supabase operations
 * Uses views: v_dashboard_kpis, v_dashboard_recent_activity, v_dashboard_todos
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardKpis {
  copro_id: string;
  current_balance: number;
  unpaid_total: number;
  critical_unpaid_count: number;
  next_ag_date: string | null;
  next_ag_id: string | null;
  next_ag_title: string | null;
}

export type ActivityType = 'AG' | 'FINANCE' | 'MAINT' | 'DOC';

export interface DashboardActivity {
  copro_id: string;
  activity_type: ActivityType;
  label: string;
  event_date: string;
  deep_link: string;
}

export type TodoPriority = 1 | 2 | 3;

export type TodoType =
  | 'unpaid_critical'
  | 'ag_draft'
  | 'bank_unmatched'
  | 'contract_renewal'
  | 'maintenance_due';

export interface DashboardTodo {
  copro_id: string;
  label: string;
  priority: TodoPriority;
  deep_link: string;
  due_date: string | null;
  todo_type: TodoType;
}

// ============================================================================
// API RESULT TYPE
// ============================================================================

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getSupabaseClient() {
  return createUntypedClient();
}

// ============================================================================
// KPIs
// ============================================================================

/**
 * Récupère les KPIs du dashboard pour une copropriété
 * - Solde global
 * - Total impayés
 * - Prochaine AG
 */
export async function getDashboardKpis(coproId: string): Promise<ApiResult<DashboardKpis>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_dashboard_kpis')
    .select('*')
    .eq('copro_id', coproId)
    .single();

  if (error) {
    // Si PGRST116 (no rows), retourner des KPIs vides
    if (error.code === 'PGRST116') {
      return {
        data: {
          copro_id: coproId,
          current_balance: 0,
          unpaid_total: 0,
          critical_unpaid_count: 0,
          next_ag_date: null,
          next_ag_id: null,
          next_ag_title: null,
        },
        error: null,
      };
    }
    return { data: null, error: error.message };
  }

  return { data: data as DashboardKpis, error: null };
}

// ============================================================================
// RECENT ACTIVITY
// ============================================================================

/**
 * Récupère les 20 dernières activités pour une copropriété
 * Triées par date décroissante
 */
export async function getDashboardActivity(
  coproId: string,
  limit: number = 20
): Promise<ApiResult<DashboardActivity[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_dashboard_recent_activity')
    .select('*')
    .eq('copro_id', coproId)
    .order('event_date', { ascending: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as DashboardActivity[], error: null };
}

// ============================================================================
// TODOS / PRIORITIES
// ============================================================================

/**
 * Récupère les 10 tâches prioritaires pour une copropriété
 * Triées par priorité (1=critique, 2=warning, 3=info) puis par date
 */
export async function getDashboardTodos(
  coproId: string,
  limit: number = 10
): Promise<ApiResult<DashboardTodo[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_dashboard_todos')
    .select('*')
    .eq('copro_id', coproId)
    .order('priority', { ascending: true })
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data || []) as DashboardTodo[], error: null };
}

// ============================================================================
// COMBINED DATA (optional - for single query optimization)
// ============================================================================

export interface DashboardData {
  kpis: DashboardKpis;
  activities: DashboardActivity[];
  todos: DashboardTodo[];
}

/**
 * Récupère toutes les données du dashboard en parallèle
 * Utile pour le chargement initial
 */
export async function getDashboardData(coproId: string): Promise<ApiResult<DashboardData>> {
  const [kpisResult, activitiesResult, todosResult] = await Promise.all([
    getDashboardKpis(coproId),
    getDashboardActivity(coproId, 6), // DASHBOARD_MAX_ACTIVITIES
    getDashboardTodos(coproId, 5), // DASHBOARD_MAX_PRIORITIES
  ]);

  // Si une erreur sur les KPIs, on fail
  if (kpisResult.error) {
    return { data: null, error: kpisResult.error };
  }

  // Pour activities et todos, on tolère les erreurs (retourne tableau vide)
  return {
    data: {
      kpis: kpisResult.data!,
      activities: activitiesResult.data || [],
      todos: todosResult.data || [],
    },
    error: null,
  };
}
