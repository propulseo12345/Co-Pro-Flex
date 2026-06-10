/**
 * Finance API Service
 * Centralized layer for all finance-related Supabase operations
 * Uses views and Edge Functions from NIVEAU 2E
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface CallForFundsOverview {
  id: string;
  copro_id: string;
  period_id: string;
  budget_id: string | null;
  repartition_key_id: string | null;
  repartition_key_name: string | null;
  label: string;
  trimester: number | null;
  issue_date: string;
  due_date: string;
  total_amount: number;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';
  ledger_tx_id: string | null;
  created_at: string;
  issued_at: string | null;
  total_paid: number;
  total_unpaid: number;
  lines_count: number;
  lines_paid_count: number;
  lines_unpaid_count: number;
}

export interface CallLineDetailed {
  id: string;
  copro_id: string;
  call_id: string;
  call_label: string;
  issue_date: string;
  due_date: string;
  call_status: string;
  lot_id: string;
  lot_ref: string;
  lot_type: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  status: 'unpaid' | 'partial' | 'paid';
  owner_name: string | null;
  repartition_key_id: string | null;
  repartition_key_name: string | null;
  lot_weight: number;
  key_total_weight: number;
  lot_tantiemes: number;
}

export interface UnpaidByLot {
  copro_id: string;
  lot_id: string;
  lot_ref: string;
  owner_name: string | null;
  owner_email: string | null;
  total_unpaid: number;
  unpaid_lines_count: number;
  oldest_due_date: string;
  days_overdue: number;
}

export interface PaymentOverview {
  id: string;
  copro_id: string;
  period_id: string;
  lot_id: string;
  lot_ref: string;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
  status: 'recorded' | 'reconciled' | 'reversed';
  ledger_tx_id: string | null;
  created_at: string;
  total_allocated: number;
  unallocated: number;
  allocations_count: number;
  owner_name: string | null;
}

export interface SupplierInvoiceOverview {
  id: string;
  copro_id: string;
  period_id: string;
  // La vue v_supplier_invoices_overview expose `tiers_id` (FK tiers) + `supplier_name` (= tiers.name).
  tiers_id: string;
  supplier_name: string;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  label: string;
  total_amount: number;
  status: 'draft' | 'approved' | 'posted' | 'paid' | 'cancelled';
  ledger_tx_id: string | null;
  document_id: string | null;
  created_at: string;
  total_paid: number;
  remaining_to_pay: number;
  payments_count: number;
}

export interface BankMovementOverview {
  id: string;
  copro_id: string;
  period_id: string;
  account_id: string;
  bank_date: string;
  value_date: string | null;
  amount_signed: number;
  direction: 'credit' | 'debit';
  amount_abs: number;
  label: string;
  bank_ref: string | null;
  status: 'unmatched' | 'matched' | 'ignored';
  account_code: string | null;
  account_category: string | null;
  created_at: string;
  total_matched: number;
  remaining_to_match: number;
  matches_count: number;
}

/**
 * Fournisseur = ligne de la table `tiers` avec `is_supplier = true`.
 * L'ancienne table `suppliers` a été fusionnée dans `tiers` lors du redesign du schéma :
 * il n'y a plus de colonne `contact` (jsonb) — les coordonnées sont des colonnes à plat.
 */
export interface Supplier {
  id: string;
  copro_id: string;
  name: string;
  is_supplier: boolean;
  is_active: boolean;
  siret: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface RepartitionKey {
  id: string;
  copro_id: string;
  name: string;
}

export interface AccountingPeriod {
  id: string;
  copro_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: 'open' | 'locked' | 'closed' | 'approved' | 'rejected';
  entry_count?: number;
}

// ============================================================================
// API RESULT TYPES
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

async function invokeEdgeFunction<T>(
  functionName: string,
  payload: object
): Promise<ApiResult<T>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke(functionName, {
    body: payload,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (data?.error) {
    return { data: null, error: data.error };
  }

  return { data: data as T, error: null };
}

// ============================================================================
// CALLS FOR FUNDS (APPELS DE FONDS)
// ============================================================================

export interface CallCampaign {
  copro_id: string;
  period_id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  ag_id: string | null;
  ag_meeting_date: string | null;
  ag_title: string | null;
  total_calls: number;
  total_keys: number;
  total_trimesters: number;
  trimesters_issued: number;
  total_amount: number;
  total_paid: number;
  global_status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';
}

export async function listCallCampaigns(coproId: string): Promise<ApiResult<CallCampaign[]>> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('v_call_campaigns')
    .select('*')
    .eq('copro_id', coproId)
    .order('period_start', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: data as CallCampaign[], error: null };
}

export async function listCalls(coproId: string): Promise<ApiResult<CallForFundsOverview[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_calls_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('issue_date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CallForFundsOverview[], error: null };
}

export async function getCallById(callId: string): Promise<ApiResult<CallForFundsOverview>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_calls_overview')
    .select('*')
    .eq('id', callId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CallForFundsOverview, error: null };
}

/** Load all calls for a given period + trimester (all keys combined) */
export async function getCallsForTrimester(
  coproId: string,
  periodId: string,
  trimester: number
): Promise<ApiResult<CallForFundsOverview[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_calls_overview')
    .select('*')
    .eq('copro_id', coproId)
    .eq('period_id', periodId)
    .eq('trimester', trimester);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CallForFundsOverview[], error: null };
}

/** Load combined call lines for multiple call IDs */
export async function getCombinedCallLines(callIds: string[]): Promise<ApiResult<CallLineDetailed[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_call_lines_detailed')
    .select('*')
    .in('call_id', callIds)
    .order('lot_ref');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CallLineDetailed[], error: null };
}

export async function getCallLines(callId: string): Promise<ApiResult<CallLineDetailed[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_call_lines_detailed')
    .select('*')
    .eq('call_id', callId)
    .order('lot_ref');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CallLineDetailed[], error: null };
}

export interface CreateCallPayload {
  copro_id: string;
  period_id: string;
  repartition_key_id: string;
  label: string;
  trimester?: number;
  issue_date: string;
  due_date: string;
  total_amount: number;
  budget_id?: string;
  description?: string;
}

export async function createCall(payload: CreateCallPayload): Promise<ApiResult<{ call_id: string; ledger_tx_id: string }>> {
  const supabase = createUntypedClient();
  const { copro_id, period_id, budget_id, repartition_key_id, label, trimester, issue_date, due_date, total_amount, description } = payload;

  // Route canonique : la RPC post_call_for_funds crée l'appel mono-clé ET son
  // écriture au grand livre (D 450-x par lot avec lot_id / C 701·702·105 selon
  // la nature du budget). Remplace l'ancien chemin client qui écrivait à tort sur
  // un compte « 450 » sans lot_id (cassé). Les appels budgétaires agrégés
  // multi-clés passent, eux, par post_budget_call_for_funds (chemin AG).
  const { data, error } = await supabase.rpc('post_call_for_funds', {
    p_copro_id: copro_id,
    p_period_id: period_id,
    p_budget_id: budget_id ?? null,
    p_repartition_key_id: repartition_key_id,
    p_label: label,
    p_trimester: trimester ?? null,
    p_issue_date: issue_date,
    p_due_date: due_date,
    p_total_amount: total_amount,
    p_description: description ?? null,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const res = (data ?? {}) as { success?: boolean; call_id?: string; ledger_tx_id?: string; error?: string };
  if (!res.success || !res.call_id || !res.ledger_tx_id) {
    return { data: null, error: res.error ?? "Échec de la création de l'appel de fonds" };
  }

  return { data: { call_id: res.call_id, ledger_tx_id: res.ledger_tx_id }, error: null };
}

// ============================================================================
// UNPAID (IMPAYES)
// ============================================================================

export async function listUnpaid(coproId: string): Promise<ApiResult<UnpaidByLot[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_unpaid_by_lot')
    .select('*')
    .eq('copro_id', coproId)
    .order('total_unpaid', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UnpaidByLot[], error: null };
}

// ============================================================================
// PAYMENTS (PAIEMENTS)
// ============================================================================

export async function listPayments(coproId: string): Promise<ApiResult<PaymentOverview[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_payments_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('payment_date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as PaymentOverview[], error: null };
}

/**
 * Nature de fonds ciblée pour l'imputation (reprend l'enum Postgres `budget_type`).
 * Absent = imputation multi-nature FIFO (défaut légal, art. 1342-10 du Code civil).
 */
export type PaymentNatureFilter = 'current' | 'works' | 'alur';

export interface RecordPaymentPayload {
  copro_id: string;
  period_id: string;
  lot_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  call_line_ids?: string[];
  /** Clé d'idempotence (UUID généré une fois par tentative de paiement) : évite le double encaissement. */
  idempotency_key?: string;
  /** Restreint l'imputation FIFO aux appels de cette nature (cloisonnement). Absent = toutes natures. */
  nature_filter?: PaymentNatureFilter;
}

export async function recordPayment(payload: RecordPaymentPayload): Promise<ApiResult<{ payment_id: string; ledger_tx_id: string; allocations: Array<{ call_line_id: string; amount_allocated: number }> }>> {
  return invokeEdgeFunction('record_payment', payload);
}

// ============================================================================
// UPDATE CALL STATUS
// ============================================================================

export async function updateCallStatus(
  callId: string,
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled'
): Promise<ApiResult<{ success: boolean }>> {
  const supabase = getSupabaseClient();

  const updates: Record<string, unknown> = { status };
  if (status === 'issued') {
    updates.issued_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('call_for_funds')
    .update(updates)
    .eq('id', callId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { success: true }, error: null };
}

// ============================================================================
// SUPPLIER INVOICES (FACTURES FOURNISSEURS)
// ============================================================================

export async function listSupplierInvoices(coproId: string): Promise<ApiResult<SupplierInvoiceOverview[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_supplier_invoices_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('invoice_date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as SupplierInvoiceOverview[], error: null };
}

export async function listSuppliers(coproId: string): Promise<ApiResult<Supplier[]>> {
  const supabase = getSupabaseClient();

  // Fournisseurs = tiers avec is_supplier=true (l'ancienne table `suppliers` a fusionné dans `tiers`).
  const { data, error } = await supabase
    .from('tiers')
    .select('*')
    .eq('copro_id', coproId)
    .eq('is_supplier', true)
    .eq('is_active', true)
    .order('name');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Supplier[], error: null };
}

export interface CreateSupplierInvoicePayload {
  copro_id: string;
  period_id: string;
  supplier_id: string;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  label: string;
  lines: Array<{
    account_id: string;
    label: string;
    amount: number;
    repartition_key_id?: string;
  }>;
  document_id?: string;
  post_immediately?: boolean;
}

export async function createSupplierInvoice(payload: CreateSupplierInvoicePayload): Promise<ApiResult<{ invoice_id: string; ledger_tx_id: string | null; total_amount: number }>> {
  return invokeEdgeFunction('create_supplier_invoice', payload);
}

// Direct creation without Edge Function (bypasses auth issues)
export interface CreateSupplierInvoiceDirectPayload {
  copro_id: string;
  period_id: string;
  supplier_id: string;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  label: string;
  total_amount: number;
}

export async function createSupplierInvoiceDirect(payload: CreateSupplierInvoiceDirectPayload): Promise<ApiResult<{ invoice_id: string }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('supplier_invoices')
    .insert({
      copro_id: payload.copro_id,
      period_id: payload.period_id,
      // Colonne réelle = `tiers_id` (FK tiers). On garde `supplier_id` comme nom de champ
      // côté payload (alias sémantique : un fournisseur EST un tiers is_supplier=true).
      tiers_id: payload.supplier_id,
      invoice_number: payload.invoice_number || null,
      invoice_date: payload.invoice_date,
      due_date: payload.due_date || null,
      label: payload.label,
      total_amount: payload.total_amount,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { invoice_id: data.id }, error: null };
}

export interface PaySupplierInvoicePayload {
  copro_id: string;
  period_id: string;
  supplier_invoice_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  /** Clé d'idempotence (UUID généré une fois par tentative de paiement) : évite le double règlement. */
  idempotency_key?: string;
}

export async function paySupplierInvoice(payload: PaySupplierInvoicePayload): Promise<ApiResult<{ payment_id: string; ledger_tx_id: string; invoice_status: string }>> {
  return invokeEdgeFunction('pay_supplier_invoice', payload);
}

export interface UpdateSupplierInvoicePayload {
  copro_id: string;
  invoice_id: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  label?: string;
  total_amount?: number;
  status?: 'draft' | 'approved' | 'posted' | 'paid' | 'cancelled';
}

export async function updateSupplierInvoice(payload: UpdateSupplierInvoicePayload): Promise<ApiResult<{ success: boolean }>> {
  const supabase = getSupabaseClient();

  const { invoice_id, copro_id, ...updates } = payload;

  const { error } = await supabase
    .from('supplier_invoices')
    .update(updates)
    .eq('id', invoice_id)
    .eq('copro_id', copro_id);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { success: true }, error: null };
}

export async function deleteSupplierInvoice(coproId: string, invoiceId: string): Promise<ApiResult<{ success: boolean }>> {
  const supabase = getSupabaseClient();

  // Soft delete by setting status to cancelled
  const { error } = await supabase
    .from('supplier_invoices')
    .update({ status: 'cancelled' })
    .eq('id', invoiceId)
    .eq('copro_id', coproId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { success: true }, error: null };
}

// ============================================================================
// BANK MOVEMENTS (MOUVEMENTS BANCAIRES)
// ============================================================================

export async function listBankMovements(
  coproId: string,
  status?: 'unmatched' | 'matched' | 'ignored'
): Promise<ApiResult<BankMovementOverview[]>> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('v_bank_movements_overview')
    .select('*')
    .eq('copro_id', coproId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('bank_date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as BankMovementOverview[], error: null };
}

export interface ImportBankMovementPayload {
  copro_id: string;
  period_id: string;
  account_id: string;
  movements: Array<{
    bank_date: string;
    value_date?: string;
    amount_signed: number;
    label: string;
    bank_ref?: string;
  }>;
}

export async function importBankMovement(payload: ImportBankMovementPayload): Promise<ApiResult<{ imported: number; skipped: number; errors: string[] }>> {
  return invokeEdgeFunction('import_bank_movement', payload);
}

export interface ReconcileBankMovementPayload {
  copro_id: string;
  bank_movement_id: string;
  target_type: 'payment' | 'supplier_payment' | 'other';
  target_id: string;
  amount_matched?: number;
}

export async function reconcileBankMovement(payload: ReconcileBankMovementPayload): Promise<ApiResult<{ match_id: string; movement_status: string }>> {
  return invokeEdgeFunction('reconcile_bank_movement', payload);
}

export interface CategorizeBankMovementPayload {
  copro_id: string;
  bank_movement_id: string;
  account_code: string;
  account_category: string;
}

export async function categorizeBankMovement(payload: CategorizeBankMovementPayload): Promise<ApiResult<{ success: boolean }>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('bank_movements')
    .update({
      account_code: payload.account_code,
      account_category: payload.account_category,
    })
    .eq('id', payload.bank_movement_id)
    .eq('copro_id', payload.copro_id);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { success: true }, error: null };
}

// ============================================================================
// REFERENCE DATA
// ============================================================================

export async function listRepartitionKeys(coproId: string): Promise<ApiResult<RepartitionKey[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('repartition_keys')
    .select('id, copro_id, name')
    .eq('copro_id', coproId)
    .order('name');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as RepartitionKey[], error: null };
}

export async function listAccountingPeriods(coproId: string): Promise<ApiResult<AccountingPeriod[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('id, copro_id, name, start_date, end_date, status, ledger_entries(count)')
    .eq('copro_id', coproId)
    .order('start_date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  // Flatten the nested count from Supabase join
  const periods: AccountingPeriod[] = (data || []).map((row: Record<string, unknown>) => {
    const entries = row.ledger_entries as Array<{ count: number }> | undefined;
    return {
      id: row.id as string,
      copro_id: row.copro_id as string,
      name: row.name as string,
      start_date: row.start_date as string,
      end_date: row.end_date as string,
      status: row.status as AccountingPeriod['status'],
      entry_count: entries?.[0]?.count ?? 0,
    };
  });

  return { data: periods, error: null };
}

export async function getOpenPeriod(coproId: string): Promise<ApiResult<AccountingPeriod | null>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('id, copro_id, name, start_date, end_date, status')
    .eq('copro_id', coproId)
    .eq('status', 'open')
    .single();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  return { data: data as AccountingPeriod | null, error: null };
}

export async function getActivePeriod(coproId: string): Promise<ApiResult<AccountingPeriod | null>> {
  const supabase = getSupabaseClient();

  // Try open period first
  const { data: openData, error: openError } = await supabase
    .from('accounting_periods')
    .select('id, copro_id, name, start_date, end_date, status')
    .eq('copro_id', coproId)
    .eq('status', 'open')
    .single();

  if (openData) {
    return { data: openData as AccountingPeriod, error: null };
  }

  if (openError && openError.code !== 'PGRST116') {
    return { data: null, error: openError.message };
  }

  // Fallback: most recent closed period
  const { data: closedData, error: closedError } = await supabase
    .from('accounting_periods')
    .select('id, copro_id, name, start_date, end_date, status')
    .eq('copro_id', coproId)
    .eq('status', 'closed')
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  if (closedError && closedError.code !== 'PGRST116') {
    return { data: null, error: closedError.message };
  }

  return { data: closedData as AccountingPeriod | null, error: null };
}

export async function closePeriod(periodId: string): Promise<ApiResult<boolean>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('close_period', {
    p_period_id: periodId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  if (data !== true) {
    return { data: false, error: null };
  }

  return { data: true, error: null };
}

export async function findPeriodByDates(coproId: string, startDate: string, endDate: string): Promise<ApiResult<AccountingPeriod | null>> {
  const supabase = getSupabaseClient();

  // Normalize dates to YYYY-MM-DD
  const normalizeDate = (d: string) => {
    if (d.includes('/')) {
      const parts = d.split('/');
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return d;
  };

  const { data, error } = await supabase
    .from('accounting_periods')
    .select('id, copro_id, name, start_date, end_date, status')
    .eq('copro_id', coproId)
    .eq('start_date', normalizeDate(startDate))
    .eq('end_date', normalizeDate(endDate))
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as AccountingPeriod | null, error: null };
}

export async function approvePeriod(periodId: string, notes?: string): Promise<ApiResult<boolean>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('accounting_periods')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approval_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .eq('status', 'closed');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: true, error: null };
}

export async function rejectPeriod(periodId: string, notes?: string): Promise<ApiResult<boolean>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('accounting_periods')
    .update({
      status: 'rejected',
      approved_at: new Date().toISOString(),
      approval_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', periodId)
    .eq('status', 'closed');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: true, error: null };
}

export async function listAccounts(coproId: string, accountType?: string): Promise<ApiResult<Array<{ id: string; code: string; name: string; account_type: string }>>> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('accounts')
    .select('id, code, name, account_type')
    .eq('copro_id', coproId)
    .eq('is_active', true);

  if (accountType) {
    query = query.eq('account_type', accountType);
  }

  const { data, error } = await query.order('code');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

export async function listLots(coproId: string): Promise<ApiResult<Array<{ id: string; ref: string; type: string | null }>>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('lots')
    .select('id, ref, type')
    .eq('copro_id', coproId)
    .order('ref');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ============================================================================
// GENERAL LEDGER (GRAND LIVRE)
// ============================================================================

export interface GeneralLedgerEntry {
  entry_id: string;
  tx_id: string;
  copro_id: string;
  period_id: string;
  tx_date: string;
  tx_label: string;
  source_type: string | null;
  source_id: string | null;
  status: string;
  posted_at: string | null;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  lot_id: string | null;
  lot_ref: string | null;
  direction: 'debit' | 'credit';
  amount: number;
  entry_label: string | null;
}

export async function getGeneralLedger(
  coproId: string,
  options?: { periodId?: string; status?: string }
): Promise<ApiResult<GeneralLedgerEntry[]>> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('v_general_ledger')
    .select('*')
    .eq('copro_id', coproId);

  if (options?.periodId) {
    query = query.eq('period_id', options.periodId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('tx_date', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as GeneralLedgerEntry[], error: null };
}

// ============================================================================
// TRIAL BALANCE (BALANCE COMPTABLE)
// ============================================================================

export interface TrialBalanceEntry {
  copro_id: string;
  period_id: string;
  period_name: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_parent_id: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export async function getTrialBalance(
  coproId: string,
  periodId: string
): Promise<ApiResult<TrialBalanceEntry[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_trial_balance')
    .select('*')
    .eq('copro_id', coproId)
    .eq('period_id', periodId)
    .order('account_code');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as TrialBalanceEntry[], error: null };
}

// ============================================================================
// PAYMENT REMINDERS (RELANCES IMPAYÉS)
// ============================================================================

export interface UnpaidWithReminder {
  copro_id: string;
  lot_id: string;
  lot_ref: string;
  owner_name: string | null;
  owner_email: string | null;
  total_unpaid: number;
  unpaid_lines_count: number;
  oldest_due_date: string;
  days_overdue: number;
  // Reminder info
  last_reminder_id: string | null;
  last_reminder_level: number | null;
  last_reminder_status: string | null;
  last_reminder_sent_at: string | null;
  total_reminders_sent: number;
}

export interface PaymentReminder {
  id: string;
  copro_id: string;
  lot_id: string;
  lot_ref: string;
  owner_id: string | null;
  owner_name: string | null;
  recipient_email: string | null;
  unpaid_amount: number;
  oldest_due_date: string;
  days_overdue: number;
  delay_level: number;
  status: 'pending' | 'sent' | 'failed' | 'stale' | 'skipped';
  delivery_status: string | null;
  scheduled_at: string;
  sent_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string | null;
  created_at: string;
  rule_label: string | null;
  channel: string | null;
}

export interface PaymentReminderRule {
  id: string;
  copro_id: string;
  delay_days: number;
  channel: string;
  template_id: string | null;
  label: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listUnpaidWithReminders(coproId: string): Promise<ApiResult<UnpaidWithReminder[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_unpaid_with_reminders')
    .select('*')
    .eq('copro_id', coproId)
    .order('total_unpaid', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UnpaidWithReminder[], error: null };
}

export async function listPaymentReminders(
  coproId: string,
  options?: { lot_id?: string; status?: string }
): Promise<ApiResult<PaymentReminder[]>> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('v_payment_reminders_overview')
    .select('*')
    .eq('copro_id', coproId);

  if (options?.lot_id) {
    query = query.eq('lot_id', options.lot_id);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as PaymentReminder[], error: null };
}

export async function listPaymentReminderRules(coproId: string): Promise<ApiResult<PaymentReminderRule[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('payment_reminder_rules')
    .select('*')
    .eq('copro_id', coproId)
    .order('delay_days');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as PaymentReminderRule[], error: null };
}

export interface SendManualReminderPayload {
  copro_id: string;
  lot_id: string;
  delay_level?: number;
  custom_message?: string;
  dry_run?: boolean;
}

export interface SendManualReminderResult {
  success: boolean;
  error?: string;
  reminder_id?: string;
  recipient_email?: string;
  delay_level?: number;
  // dry_run results
  would_send?: boolean;
  dry_run?: boolean;
}

export async function sendManualReminder(
  payload: SendManualReminderPayload
): Promise<ApiResult<SendManualReminderResult>> {
  return invokeEdgeFunction<SendManualReminderResult>('send_manual_payment_reminder', payload);
}

export interface RunRemindersPayload {
  copro_id: string;
  dry_run?: boolean;
}

export interface RunRemindersResult {
  success: boolean;
  copro_id?: string;
  summary?: {
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    stale_cancelled: number;
  };
  error?: string;
  dry_run?: boolean;
  // Pause info
  paused?: boolean;
  pause_reason?: string | null;
  paused_until?: string | null;
}

export async function runPaymentReminders(
  payload: RunRemindersPayload
): Promise<ApiResult<RunRemindersResult>> {
  return invokeEdgeFunction<RunRemindersResult>('run_payment_reminders', payload);
}

export interface CreateReminderRulePayload {
  copro_id: string;
  delay_days: number;
  channel?: string;
  label: string;
  template_id?: string;
  is_active?: boolean;
}

export async function createPaymentReminderRule(
  payload: CreateReminderRulePayload
): Promise<ApiResult<{ id: string }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('payment_reminder_rules')
    .insert({
      copro_id: payload.copro_id,
      delay_days: payload.delay_days,
      channel: payload.channel || 'email',
      label: payload.label,
      template_id: payload.template_id,
      is_active: payload.is_active !== false,
    })
    .select('id')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { id: data.id }, error: null };
}

export async function updatePaymentReminderRule(
  ruleId: string,
  updates: Partial<Omit<PaymentReminderRule, 'id' | 'copro_id' | 'created_at' | 'updated_at'>>
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('payment_reminder_rules')
    .update(updates)
    .eq('id', ruleId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

// ============================================================================
// MANUAL REMINDERS (RELANCES MANUELLES)
// ============================================================================

export interface CreateManualReminderPayload {
  copro_id: string;
  lot_id: string;
  call_id: string;
  call_line_id: string;
  delay_level: number;
  unpaid_amount: number;
  oldest_due_date: string;
  days_overdue: number;
  recipient_email: string | null;
  recipient_name: string | null;
  channel: string;
  content: string;
}

export async function createManualReminder(
  payload: CreateManualReminderPayload
): Promise<ApiResult<{ reminder_id: string }>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('payment_reminders')
    .insert({
      copro_id: payload.copro_id,
      lot_id: payload.lot_id,
      call_id: payload.call_id,
      call_line_id: payload.call_line_id,
      delay_level: payload.delay_level,
      unpaid_amount: payload.unpaid_amount,
      oldest_due_date: payload.oldest_due_date,
      days_overdue: payload.days_overdue,
      recipient_email: payload.recipient_email,
      recipient_name: payload.recipient_name,
      content: payload.content,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) return { data: null, error: error.message };
  return { data: { reminder_id: data.id }, error: null };
}

// ============================================================================
// REMINDER SETTINGS (PAUSE)
// ============================================================================

export interface ReminderSettings {
  copro_id: string;
  is_paused: boolean;
  paused_until: string | null;
  pause_reason: string | null;
  created_at: string;
  updated_at: string;
}

export async function getReminderSettings(coproId: string): Promise<ApiResult<ReminderSettings>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('reminder_settings')
    .select('*')
    .eq('copro_id', coproId)
    .single();

  if (error) {
    // If not found, return default settings
    if (error.code === 'PGRST116') {
      return {
        data: {
          copro_id: coproId,
          is_paused: false,
          paused_until: null,
          pause_reason: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      };
    }
    return { data: null, error: error.message };
  }

  return { data: data as ReminderSettings, error: null };
}

export interface UpdateReminderSettingsPayload {
  is_paused?: boolean;
  paused_until?: string | null;
  pause_reason?: string | null;
}

export async function updateReminderSettings(
  coproId: string,
  updates: UpdateReminderSettingsPayload
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  // Upsert to handle case where settings don't exist yet
  const { error } = await supabase
    .from('reminder_settings')
    .upsert({
      copro_id: coproId,
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('copro_id', coproId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export interface EmailTemplate {
  id: string;
  copro_id: string | null;
  code: string;
  name: string;
  description: string | null;
  subject: string;
  body_html: string;
  body_text: string | null;
  available_variables: Record<string, string> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function listEmailTemplates(coproId?: string): Promise<ApiResult<EmailTemplate[]>> {
  const supabase = getSupabaseClient();

  // Get templates that are global (copro_id is null) or belong to this copro
  let query = supabase
    .from('email_templates')
    .select('*')
    .order('code');

  if (coproId) {
    query = query.or(`copro_id.is.null,copro_id.eq.${coproId}`);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as EmailTemplate[], error: null };
}

export async function getEmailTemplate(templateId: string): Promise<ApiResult<EmailTemplate>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as EmailTemplate, error: null };
}

export interface UpdateEmailTemplatePayload {
  subject?: string;
  body_html?: string;
  body_text?: string | null;
  name?: string;
  is_active?: boolean;
}

export async function updateEmailTemplate(
  templateId: string,
  updates: UpdateEmailTemplatePayload
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('email_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

// ============================================================================
// BANK ACCOUNTS, SUPPLIERS, INVOICES, PAYMENTS
// ============================================================================

export interface BankAccountWithBalance {
  account_id: string;
  copro_id: string;
  code: string;
  name: string;
  banque: string | null;
  iban: string | null;
  initial_balance: number;
  movements_total: number;
  computed_balance: number;
}

export async function listBankAccounts(coproId: string): Promise<ApiResult<BankAccountWithBalance[]>> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('v_account_balances')
    .select('*')
    .eq('copro_id', coproId)
    .order('code');

  if (error) return { data: null, error: error.message };

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      initial_balance: Number(d.initial_balance) || 0,
      movements_total: Number(d.movements_total) || 0,
      computed_balance: Number(d.computed_balance) || 0,
    })) as BankAccountWithBalance[],
    error: null,
  };
}

export interface PendingInvoice {
  id: string;
  copro_id: string;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  label: string | null;
  total_amount: number;
  status: string;
}

export async function listPendingInvoices(coproId: string): Promise<ApiResult<PendingInvoice[]>> {
  const supabase = createUntypedClient();
  // Colonne réelle = `tiers_id` (FK tiers), jointure imbriquée = `tiers(name)`.
  // « En attente de paiement » = factures NON soldées : tout sauf 'paid' et 'cancelled'.
  // L'enum cible supplier_invoice_status = ('draft','posted','paid','cancelled') → on filtre sur
  // ('draft','posted'). NB : les anciennes valeurs ('pending','validated','approved') n'existaient
  // plus dans l'enum et levaient une erreur Postgres (22P02). Le débat « faut-il un statut
  // 'validé/approuvé' distinct ? » + le drift jumeau côté écriture (useFactureDetailPage écrit
  // encore 'approved') restent une décision de workflow ouverte — voir dossier 2026-06-10.
  const { data, error } = await supabase
    .from('supplier_invoices')
    .select('id, copro_id, tiers_id, invoice_number, invoice_date, due_date, label, total_amount, status, tiers(name)')
    .eq('copro_id', coproId)
    .in('status', ['draft', 'posted']);

  if (error) return { data: null, error: error.message };

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      id: d.id as string,
      copro_id: d.copro_id as string,
      // alias sémantique : on garde `supplier_id` côté type interne, alimenté par la colonne tiers_id.
      supplier_id: (d.tiers_id as string | null) ?? null,
      supplier_name: (d.tiers as Record<string, unknown> | null)?.name as string ?? null,
      invoice_number: (d.invoice_number as string | null) ?? null,
      invoice_date: d.invoice_date as string,
      due_date: (d.due_date as string | null) ?? null,
      label: (d.label as string | null) ?? null,
      total_amount: Number(d.total_amount) || 0,
      status: d.status as string,
    })) as PendingInvoice[],
    error: null,
  };
}

export interface UnmatchedPayment {
  id: string;
  copro_id: string;
  lot_id: string | null;
  amount: number;
  payment_date: string;
  method: string;
  reference: string | null;
  status: string;
}

export async function listUnmatchedPayments(coproId: string): Promise<ApiResult<UnmatchedPayment[]>> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('payments')
    .select('id, copro_id, lot_id, amount, payment_date, method, reference, status')
    .eq('copro_id', coproId)
    .eq('status', 'validated');

  if (error) return { data: null, error: error.message };

  return {
    data: (data || []).map((d: Record<string, unknown>) => ({
      ...d,
      amount: Number(d.amount) || 0,
    })) as UnmatchedPayment[],
    error: null,
  };
}
