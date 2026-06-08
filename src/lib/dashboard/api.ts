/**
 * Dashboard API Service
 * Centralized layer for dashboard-related Supabase operations
 * Uses views: v_dashboard_kpis, v_dashboard_recent_activity, v_dashboard_todos
 */

import { createClient } from '@/lib/supabase/client';
import { getActiveAccountingPeriod } from '@/lib/finance/accounting-period';

// Helper: Create untyped client for views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardKpis {
  copro_id: string;
  current_balance: number;
  tresorerie_courante?: number;
  tresorerie_travaux?: number;
  unpaid_total: number;
  critical_unpaid_count: number;
  next_ag_date: string | null;
  next_ag_id: string | null;
  next_ag_title: string | null;
  budget_vote?: number;
  budget_realise?: number;
  budget_pct?: number;
  tresorerie?: number;
  provisions_travaux?: number;
  travaux_en_cours?: number;
  nb_travaux_ouverts?: number;
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
  context?: string;
  deadline?: string;
  action_label?: string;
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

  // 1. Période comptable active (nécessaire aux KPIs budgétaires ; null si aucune).
  const periodResult = await getActiveAccountingPeriod(coproId);
  const periodId = periodResult.data?.id ?? null;

  // 2. KPIs financiers dérivés du grand livre (source unique de vérité).
  //    fn_dashboard_kpis renvoie : tresorerie, total_impayes, provisions_travaux,
  //    dettes, budget_vote, budget_realise, budget_pct.
  const { data: fin, error: finError } = await supabase.rpc('fn_dashboard_kpis', {
    p_copro_id: coproId,
    p_period_id: periodId,
  });

  if (finError) {
    return { data: null, error: finError.message };
  }

  // 3. Prochaine AG à venir : la plus proche dans le futur, encore en cours de vie.
  const { data: nextAg } = await supabase
    .from('ag_meetings')
    .select('id, title, meeting_date')
    .eq('copro_id', coproId)
    .gte('meeting_date', new Date().toISOString())
    .in('status', ['draft', 'convoked', 'in_progress', 'session_active'])
    .order('meeting_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  // La fn ne sépare pas le compte bancaire travaux (5121) → tresorerie = trésorerie courante.
  // La tuile "Fonds travaux" du dashboard montre le FONDS ALUR / réserve travaux (comptes 103+105,
  // = provisions_travaux, dérivé du grand livre) — décision USER 2026-06-08.
  // critical_unpaid_count reste non fourni par la fn (0) : indicateur d'impayés critiques différé.
  const tresorerie = Number(fin?.tresorerie) || 0;
  const provisionsTravaux = Number(fin?.provisions_travaux) || 0;

  const kpis: DashboardKpis = {
    copro_id: coproId,
    current_balance: tresorerie,
    tresorerie,
    tresorerie_courante: tresorerie,
    tresorerie_travaux: provisionsTravaux,
    unpaid_total: Number(fin?.total_impayes) || 0,
    critical_unpaid_count: 0,
    provisions_travaux: provisionsTravaux,
    budget_vote: Number(fin?.budget_vote) || 0,
    budget_realise: Number(fin?.budget_realise) || 0,
    budget_pct: Number(fin?.budget_pct) || 0,
    next_ag_date: nextAg?.meeting_date ?? null,
    next_ag_id: nextAg?.id ?? null,
    next_ag_title: nextAg?.title ?? null,
  };

  return { data: kpis, error: null };
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

  const kpis = kpisResult.data!;

  // Pour activities et todos, on tolère les erreurs (retourne tableau vide)
  return {
    data: {
      kpis,
      activities: activitiesResult.data || [],
      todos: todosResult.data || [],
    },
    error: null,
  };
}
