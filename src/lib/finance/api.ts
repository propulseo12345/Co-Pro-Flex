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
  repartition_key_id: string;
  repartition_key_name: string;
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
  repartition_key_id: string;
  lot_weight: number;
  key_total_weight: number;
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
  supplier_id: string;
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
  bank_date: string;
  value_date: string | null;
  amount_signed: number;
  direction: 'credit' | 'debit';
  amount_abs: number;
  label: string;
  bank_ref: string | null;
  status: 'unmatched' | 'matched' | 'ignored';
  created_at: string;
  total_matched: number;
  remaining_to_match: number;
  matches_count: number;
}

export interface Supplier {
  id: string;
  copro_id: string;
  name: string;
  siret: string | null;
  contact: Record<string, unknown>;
  is_active: boolean;
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
  const supabase = getSupabaseClient();
  const { copro_id, period_id, budget_id, repartition_key_id, label, trimester, issue_date, due_date, total_amount, description } = payload;

  try {
    // 1. Get lots with weights
    const { data: lots, error: lotsErr } = await supabase
      .from('repartition_key_lines')
      .select('lot_id, weight')
      .eq('key_id', repartition_key_id);
    if (lotsErr) throw new Error(`Lots: ${lotsErr.message}`);
    if (!lots || lots.length === 0) throw new Error('Aucun lot trouvé pour cette clé de répartition');

    const totalWeight = lots.reduce((sum: number, l: { weight: number }) => sum + Number(l.weight), 0);

    // 2. Get accounts 450 & 701
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('copro_id', copro_id)
      .in('code', ['450', '701']);
    if (accErr) throw new Error(`Comptes: ${accErr.message}`);

    const acc450 = accounts?.find((a: { code: string }) => a.code === '450');
    const acc701 = accounts?.find((a: { code: string }) => a.code === '701');
    if (!acc450 || !acc701) throw new Error('Comptes 450 ou 701 manquants');

    // 3. Create ledger transaction
    const { data: ltx, error: ltxErr } = await supabase
      .from('ledger_transactions')
      .insert({
        copro_id, period_id,
        tx_date: issue_date,
        label: `Appel de fonds: ${label}`,
        source_type: 'call_for_funds',
        status: 'draft',
      })
      .select('id')
      .single();
    if (ltxErr) throw new Error(`Transaction: ${ltxErr.message}`);

    // 4. Create ledger entries
    const { error: entErr } = await supabase
      .from('ledger_entries')
      .insert([
        { copro_id, period_id, tx_id: ltx.id, account_id: acc450.id, direction: 'debit', amount: total_amount, entry_label: `Appel: ${label}` },
        { copro_id, period_id, tx_id: ltx.id, account_id: acc701.id, direction: 'credit', amount: total_amount, entry_label: `Appel: ${label}` },
      ]);
    if (entErr) throw new Error(`Écritures: ${entErr.message}`);

    // 5. Post the transaction
    const { error: postErr } = await supabase
      .from('ledger_transactions')
      .update({ status: 'posted', posted_at: new Date().toISOString() })
      .eq('id', ltx.id);
    if (postErr) throw new Error(`Post transaction: ${postErr.message}`);

    // 6. Create call_for_funds (was step 5)
    const { data: call, error: callErr } = await supabase
      .from('call_for_funds')
      .insert({
        copro_id, period_id,
        budget_id: budget_id || null,
        repartition_key_id, label,
        trimester: trimester || null,
        issue_date, due_date, total_amount,
        status: 'issued',
        ledger_tx_id: ltx.id,
        issued_at: new Date().toISOString(),
        description: description || null,
      })
      .select('id')
      .single();
    if (callErr) throw new Error(`Appel: ${callErr.message}`);

    // 7. Create lines per lot (with rounding delta on last lot)
    const lines = lots.map((l: { lot_id: string; weight: number }) => ({
      copro_id,
      call_id: call.id,
      lot_id: l.lot_id,
      amount_due: Math.round((total_amount * Number(l.weight) / totalWeight) * 100) / 100,
    }));

    const linesTotal = lines.reduce((sum: number, l: { amount_due: number }) => sum + l.amount_due, 0);
    const delta = Math.round((total_amount - linesTotal) * 100) / 100;
    if (lines.length > 0 && delta !== 0) {
      lines[lines.length - 1].amount_due += delta;
    }

    const { error: linesErr } = await supabase
      .from('call_for_funds_lines')
      .insert(lines);
    if (linesErr) throw new Error(`Lignes: ${linesErr.message}`);

    return { data: { call_id: call.id, ledger_tx_id: ltx.id }, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erreur inconnue' };
  }
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

export interface RecordPaymentPayload {
  copro_id: string;
  period_id: string;
  lot_id: string;
  amount: number;
  payment_date: string;
  method?: string;
  reference?: string;
  call_line_ids?: string[];
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

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('copro_id', coproId)
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
      supplier_id: payload.supplier_id,
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
