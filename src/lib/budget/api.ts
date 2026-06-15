'use client';

/**
 * Budget API Layer
 * Supabase queries and mutations for budget management
 *
 * Tables: budgets, budget_lines, budget_expenses
 * Views: v_budgets_overview, v_budget_lines_overview, v_budget_expenses_detail
 */

import { createClient } from '@/lib/supabase/client';
import { BudgetStatut, DepenseStatut } from '@/types/enums/statuts';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// Types - Database rows
// ============================================================================

/** Budget type enum (matches DB) */
export type BudgetType = 'current' | 'works' | 'alur';

/** Budget status (DB values) */
export type DbBudgetStatus = 'draft' | 'pending_approval' | 'submitted' | 'validated' | 'rejected' | 'closed';

/** Expense status (DB values) */
export type DbExpenseStatus = 'draft' | 'pending_validation' | 'validated' | 'rejected';

/** Budget row from v_budgets_overview */
export interface BudgetOverview {
  id: string;
  copro_id: string;
  period_id: string;
  budget_type: BudgetType;
  status: DbBudgetStatus;
  version: number;
  name: string;
  notes: string | null;
  created_at: string;
  validated_at: string | null;
  period_name: string;
  period_start: string;
  period_end: string;
  period_year: number;
  lines_count: number;
  total_planned: number;
  total_spent: number;
  validated_spent: number;
  remaining: number;
}

/** Budget line row from v_budget_lines_overview */
export interface BudgetLineOverview {
  id: string;
  copro_id: string;
  budget_id: string;
  account_id: string;
  repartition_key_id: string;
  label: string;
  code: string | null;
  planned_amount: number;
  sort_order: number;
  created_at: string;
  expenses_count: number;
  total_spent: number;
  validated_spent: number;
  pending_count: number;
  remaining: number;
  consumption_pct: number;
}

/** Expense row from v_budget_expenses_detail */
export interface ExpenseDetail {
  id: string;
  copro_id: string;
  budget_id: string;
  budget_line_id: string;
  label: string;
  amount: number;
  tx_date: string;
  status: DbExpenseStatus;
  fournisseur: string | null;
  montant_ht: number | null;
  taux_tva: number | null;
  piece_jointe: string | null;
  validated_at: string | null;
  validated_by: string | null;
  rejection_comment: string | null;
  created_at: string;
  updated_at: string;
  line_label: string;
  line_code: string | null;
  budget_name: string;
  budget_type: BudgetType;
}

// ============================================================================
// Status mapping - Front ↔ DB
// ============================================================================

const BUDGET_STATUS_TO_DB: Record<BudgetStatut, DbBudgetStatus> = {
  [BudgetStatut.BROUILLON]: 'draft',
  [BudgetStatut.EN_ATTENTE_APPROBATION]: 'pending_approval',
  [BudgetStatut.APPROUVE]: 'validated',
  [BudgetStatut.REJETE]: 'rejected',
  [BudgetStatut.CLOTURE]: 'closed',
};

const BUDGET_STATUS_FROM_DB: Record<DbBudgetStatus, BudgetStatut> = {
  draft: BudgetStatut.BROUILLON,
  pending_approval: BudgetStatut.EN_ATTENTE_APPROBATION,
  submitted: BudgetStatut.EN_ATTENTE_APPROBATION, // Map submitted to pending
  validated: BudgetStatut.APPROUVE,
  rejected: BudgetStatut.REJETE,
  closed: BudgetStatut.CLOTURE,
};

const EXPENSE_STATUS_TO_DB: Record<DepenseStatut, DbExpenseStatus> = {
  [DepenseStatut.BROUILLON]: 'draft',
  [DepenseStatut.EN_ATTENTE_VALIDATION]: 'pending_validation',
  [DepenseStatut.VALIDEE]: 'validated',
  [DepenseStatut.REJETEE]: 'rejected',
};

const EXPENSE_STATUS_FROM_DB: Record<DbExpenseStatus, DepenseStatut> = {
  draft: DepenseStatut.BROUILLON,
  pending_validation: DepenseStatut.EN_ATTENTE_VALIDATION,
  validated: DepenseStatut.VALIDEE,
  rejected: DepenseStatut.REJETEE,
};

export function mapBudgetStatusToDb(status: BudgetStatut): DbBudgetStatus {
  return BUDGET_STATUS_TO_DB[status] || 'draft';
}

export function mapBudgetStatusFromDb(status: DbBudgetStatus): BudgetStatut {
  return BUDGET_STATUS_FROM_DB[status] || BudgetStatut.BROUILLON;
}

export function mapExpenseStatusToDb(status: DepenseStatut): DbExpenseStatus {
  return EXPENSE_STATUS_TO_DB[status] || 'draft';
}

export function mapExpenseStatusFromDb(status: DbExpenseStatus): DepenseStatut {
  return EXPENSE_STATUS_FROM_DB[status] || DepenseStatut.BROUILLON;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all budgets for a copro, optionally filtered by year
 */
export async function listBudgets(
  coproId: string,
  periodYear?: number
): Promise<BudgetOverview[]> {
  const supabase = createUntypedClient();

  let query = supabase
    .from('v_budgets_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('period_year', { ascending: false })
    .order('budget_type', { ascending: true });

  if (periodYear) {
    query = query.eq('period_year', periodYear);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list budgets: ${error.message}`);
  }

  return (data || []) as BudgetOverview[];
}

/**
 * Get a single budget by ID
 */
export async function getBudget(
  coproId: string,
  budgetId: string
): Promise<BudgetOverview | null> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_budgets_overview')
    .select('*')
    .eq('copro_id', coproId)
    .eq('id', budgetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to get budget: ${error.message}`);
  }

  return data as BudgetOverview;
}

/**
 * List budget lines for a budget
 */
export async function listBudgetLines(
  coproId: string,
  budgetId: string
): Promise<BudgetLineOverview[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_budget_lines_overview')
    .select('*')
    .eq('copro_id', coproId)
    .eq('budget_id', budgetId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to list budget lines: ${error.message}`);
  }

  return (data || []) as BudgetLineOverview[];
}

/**
 * List expenses for a budget
 */
export async function listBudgetExpenses(
  coproId: string,
  budgetId: string
): Promise<ExpenseDetail[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_budget_expenses_detail')
    .select('*')
    .eq('copro_id', coproId)
    .eq('budget_id', budgetId)
    .order('tx_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to list expenses: ${error.message}`);
  }

  return (data || []) as ExpenseDetail[];
}

/**
 * Get accounting period for a year
 */
export async function getAccountingPeriod(
  coproId: string,
  year: number
): Promise<{ id: string; status: string } | null> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('id, status')
    .eq('copro_id', coproId)
    .gte('start_date', `${year}-01-01`)
    .lte('start_date', `${year}-12-31`)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get period: ${error.message}`);
  }

  return data;
}

// ============================================================================
// MUTATIONS - Budgets
// ============================================================================

export interface CreateBudgetInput {
  copro_id: string;
  period_id: string;
  budget_type: BudgetType;
  name: string;
  notes?: string;
}

/**
 * Create a new budget
 */
export async function createBudget(input: CreateBudgetInput): Promise<string> {
  const supabase = createUntypedClient();

  // Get next version for this (copro, period, type) combination
  const { data: existing } = await supabase
    .from('budgets')
    .select('version')
    .eq('copro_id', input.copro_id)
    .eq('period_id', input.period_id)
    .eq('budget_type', input.budget_type)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      copro_id: input.copro_id,
      period_id: input.period_id,
      budget_type: input.budget_type,
      name: input.name,
      notes: input.notes || null,
      status: 'draft',
      version: nextVersion,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create budget: ${error.message}`);
  }

  return data.id;
}

export interface UpdateBudgetInput {
  name?: string;
  notes?: string;
}

/**
 * Update a budget
 */
export async function updateBudget(
  budgetId: string,
  input: UpdateBudgetInput
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('budgets')
    .update({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.notes !== undefined && { notes: input.notes }),
    })
    .eq('id', budgetId);

  if (error) {
    throw new Error(`Failed to update budget: ${error.message}`);
  }
}

/**
 * Update budget status
 */
export async function updateBudgetStatus(
  budgetId: string,
  status: BudgetStatut
): Promise<void> {
  const supabase = createUntypedClient();
  const dbStatus = mapBudgetStatusToDb(status);

  // CLÔTURE d'un budget TRAVAUX = clôture d'OPÉRATION : passe par close_works_operation (garde dure
  // E9 : refuse s'il reste une charge travaux non rattachée à une opération). Un budget non-travaux
  // se clôture par simple bascule de statut. Cf. PLAN_J5 T3 décision #8.
  if (dbStatus === 'closed') {
    const { data: budget, error: bErr } = await supabase
      .from('budgets')
      .select('copro_id, budget_type')
      .eq('id', budgetId)
      .single();
    if (bErr) {
      throw new Error(`Failed to load budget before close: ${bErr.message}`);
    }
    if (budget?.budget_type === 'works') {
      const { data, error } = await supabase.rpc('close_works_operation', {
        p_copro_id: budget.copro_id,
        p_budget_id: budgetId,
      });
      if (error) {
        throw new Error(error.message);
      }
      const res = (data ?? {}) as { success?: boolean; error?: string };
      if (!res.success) {
        throw new Error(res.error ?? "Échec de la clôture de l'opération travaux");
      }
      return;
    }
  }

  const updates: Record<string, unknown> = { status: dbStatus };

  if (status === BudgetStatut.APPROUVE) {
    updates.validated_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('budgets')
    .update(updates)
    .eq('id', budgetId);

  if (error) {
    throw new Error(`Failed to update budget status: ${error.message}`);
  }
}

/**
 * Delete a budget (only draft)
 */
export async function deleteBudget(budgetId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId);

  if (error) {
    throw new Error(`Failed to delete budget: ${error.message}`);
  }
}

// ============================================================================
// MUTATIONS - Budget Lines
// ============================================================================

export interface CreateBudgetLineInput {
  copro_id: string;
  budget_id: string;
  account_id: string;
  repartition_key_id: string;
  label: string;
  code?: string;
  amount: number;
  sort_order?: number;
}

/**
 * Create a budget line
 */
export async function createBudgetLine(input: CreateBudgetLineInput): Promise<string> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('budget_lines')
    .insert({
      copro_id: input.copro_id,
      budget_id: input.budget_id,
      account_id: input.account_id,
      repartition_key_id: input.repartition_key_id,
      label: input.label,
      code: input.code || null,
      amount: input.amount,
      sort_order: input.sort_order || 0,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create budget line: ${error.message}`);
  }

  return data.id;
}

export interface UpdateBudgetLineInput {
  label?: string;
  code?: string;
  amount?: number;
  sort_order?: number;
}

/**
 * Update a budget line
 */
export async function updateBudgetLine(
  lineId: string,
  input: UpdateBudgetLineInput
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('budget_lines')
    .update({
      ...(input.label !== undefined && { label: input.label }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', lineId);

  if (error) {
    throw new Error(`Failed to update budget line: ${error.message}`);
  }
}

/**
 * Delete a budget line
 */
export async function deleteBudgetLine(lineId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('budget_lines')
    .delete()
    .eq('id', lineId);

  if (error) {
    throw new Error(`Failed to delete budget line: ${error.message}`);
  }
}

// ============================================================================
// MUTATIONS - Expenses
// ============================================================================

export interface CreateExpenseInput {
  copro_id: string;
  budget_id: string;
  budget_line_id: string;
  label: string;
  amount: number;
  tx_date: string;
  fournisseur?: string;
  montant_ht?: number;
  taux_tva?: number;
  piece_jointe?: string;
}

/**
 * Create an expense
 */
export async function createExpense(input: CreateExpenseInput): Promise<string> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('budget_expenses')
    .insert({
      copro_id: input.copro_id,
      budget_id: input.budget_id,
      budget_line_id: input.budget_line_id,
      label: input.label,
      amount: input.amount,
      tx_date: input.tx_date,
      status: 'draft',
      fournisseur: input.fournisseur || null,
      montant_ht: input.montant_ht || null,
      taux_tva: input.taux_tva || null,
      piece_jointe: input.piece_jointe || null,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create expense: ${error.message}`);
  }

  return data.id;
}

export interface UpdateExpenseInput {
  label?: string;
  amount?: number;
  tx_date?: string;
  fournisseur?: string;
  montant_ht?: number;
  taux_tva?: number;
  piece_jointe?: string;
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('budget_expenses')
    .update({
      ...(input.label !== undefined && { label: input.label }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.tx_date !== undefined && { tx_date: input.tx_date }),
      ...(input.fournisseur !== undefined && { fournisseur: input.fournisseur }),
      ...(input.montant_ht !== undefined && { montant_ht: input.montant_ht }),
      ...(input.taux_tva !== undefined && { taux_tva: input.taux_tva }),
      ...(input.piece_jointe !== undefined && { piece_jointe: input.piece_jointe }),
    })
    .eq('id', expenseId);

  if (error) {
    throw new Error(`Failed to update expense: ${error.message}`);
  }
}

/**
 * Update expense status (for validation workflow)
 */
export async function updateExpenseStatus(
  expenseId: string,
  status: DepenseStatut,
  rejectionComment?: string
): Promise<void> {
  const supabase = createUntypedClient();

  // Valider une dépense = la comptabiliser au grand livre (Débit 6xx / Crédit 401)
  // via la RPC dédiée (idempotente, ne poste que si la période est ouverte).
  if (status === DepenseStatut.VALIDEE) {
    const { data, error } = await supabase.rpc('validate_budget_expense', {
      p_expense_id: expenseId,
    });
    if (error) {
      throw new Error(`Failed to validate expense: ${error.message}`);
    }
    if (data && data.success === false) {
      throw new Error(data.error || 'Validation de la dépense échouée');
    }
    return;
  }

  const dbStatus = mapExpenseStatusToDb(status);
  const updates: Record<string, unknown> = { status: dbStatus };

  if (status === DepenseStatut.REJETEE) {
    updates.rejection_comment = rejectionComment || null;
    updates.validated_at = null;
  }

  const { error } = await supabase
    .from('budget_expenses')
    .update(updates)
    .eq('id', expenseId);

  if (error) {
    throw new Error(`Failed to update expense status: ${error.message}`);
  }
}

/**
 * Delete an expense (only draft)
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('budget_expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    throw new Error(`Failed to delete expense: ${error.message}`);
  }
}

// ============================================================================
// MUTATIONS - Affectation du fonds de travaux ALUR (migration 0037)
// ============================================================================

/** Ligne de la vue v_alur_transfers_pending_cash (affectations dont le cash n'a pas bougé). */
export interface PendingAlurCash {
  transfer_id: string;
  copro_id: string;
  budget_id: string | null;
  budget_name: string | null;
  amount: number;
  transfer_date: string | null;
  notes: string | null;
}

/** Ligne de la vue v_alur_transfers_history. */
export interface AlurTransferHistoryRow {
  id: string;
  copro_id: string;
  budget_id: string | null;
  amount: number;
  transfer_date: string | null;
  destination: 'works' | 'reserve' | 'operating' | 'other';
  notes: string | null;
  period_year: number;
}

/**
 * Affecte une partie du fonds ALUR à un budget travaux voté (écriture D105/C705).
 * Le serveur borne le montant sur le solde cumulé du compte 105.
 */
export async function postAlurTransfer(
  coproId: string,
  budgetId: string,
  amount: number,
  transferDate: string,
  notes?: string
): Promise<{ transfer_id: string; ledger_tx_id: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('post_alur_transfer', {
    p_copro_id: coproId,
    p_budget_id: budgetId,
    p_amount: amount,
    p_transfer_date: transferDate,
    p_notes: notes ?? null,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Échec de l'affectation du fonds ALUR");
  return { transfer_id: data.transfer_id, ledger_tx_id: data.ledger_tx_id };
}

/** Marque le virement de trésorerie réel (Livret A → courant) comme effectué (écriture D512/C502). */
export async function settleAlurTransferCash(
  transferId: string,
  settledDate: string
): Promise<{ cash_ledger_tx_id: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('settle_alur_transfer_cash', {
    p_transfer_id: transferId,
    p_settled_date: settledDate,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? 'Échec du règlement du virement');
  return { cash_ledger_tx_id: data.cash_ledger_tx_id };
}

/** Affectations en attente de virement de trésorerie (rappels UI). */
export async function listPendingAlurCash(coproId: string): Promise<PendingAlurCash[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_alur_transfers_pending_cash')
    .select('*')
    .eq('copro_id', coproId)
    .order('transfer_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PendingAlurCash[];
}

/** Solde cumulé du fonds ALUR (compte 105) — SOURCE UNIQUE du disponible (= la borne de la RPC). */
export async function getAlurFundBalance(coproId: string): Promise<number> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_alur_fund_balance')
    .select('balance')
    .eq('copro_id', coproId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Number(data?.balance ?? 0);
}

/** Historique des affectations du fonds ALUR. */
export async function listAlurTransfersHistory(coproId: string): Promise<AlurTransferHistoryRow[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_alur_transfers_history')
    .select('*')
    .eq('copro_id', coproId)
    .order('transfer_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AlurTransferHistoryRow[];
}
