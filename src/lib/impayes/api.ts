/**
 * Impayés API Service
 * Supabase queries for unpaid charges and payment reminders
 *
 * Tables: call_for_funds_lines, payment_reminders, payment_reminder_rules
 * Views: v_unpaid_by_lot, v_unpaid_with_reminders, v_payment_reminders_overview
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// Types
// ============================================================================

/** Unpaid lot from v_unpaid_by_lot */
export interface UnpaidByLot {
  copro_id: string;
  lot_id: string;
  lot_ref: string;
  lot_type: string;
  owner_id: string | null;
  owner_name: string;
  owner_email: string | null;
  owner_phone: string | null;
  total_due: number;
  total_paid: number;
  unpaid_amount: number;
  unpaid_lines_count: number;
  oldest_due_date: string;
  days_overdue: number;
  severity: 'MINOR' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/** Unpaid with reminder info from v_unpaid_with_reminders */
export interface UnpaidWithReminders extends UnpaidByLot {
  last_reminder_id: string | null;
  last_reminder_level: number | null;
  last_reminder_status: string | null;
  last_reminder_sent_at: string | null;
  total_reminders_sent: number;
}

/** Payment reminder row from v_payment_reminders_overview */
export interface PaymentReminderOverview {
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

/** Impayés statistics */
export interface ImpayesStats {
  totalImpayes: number;
  montantTotal: number;
  nbMinor: number;
  nbMedium: number;
  nbHigh: number;
  nbCritical: number;
  nbRelancesPending: number;
  nbRelancesSent: number;
}

/** Reminder rule */
export interface ReminderRule {
  id: string;
  copro_id: string;
  delay_days: number;
  channel: string;
  template_id: string | null;
  label: string;
  is_active: boolean;
}

/** Input for creating a manual reminder */
export interface CreateReminderInput {
  copro_id: string;
  lot_id: string;
  owner_id?: string;
  unpaid_amount: number;
  oldest_due_date: string;
  days_overdue: number;
  delay_level: number;
  recipient_email?: string;
  recipient_name?: string;
  call_id?: string;
  call_line_id?: string;
  content?: string;
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * List all unpaid lots for a copro (with reminder info)
 */
export async function listUnpaidWithReminders(
  coproId: string
): Promise<UnpaidWithReminders[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_unpaid_with_reminders')
    .select('*')
    .eq('copro_id', coproId)
    .order('unpaid_amount', { ascending: false });

  if (error) {
    console.error('Error fetching unpaid with reminders:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * List all unpaid lots (basic, without reminder info)
 */
export async function listUnpaidByLot(
  coproId: string
): Promise<UnpaidByLot[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_unpaid_by_lot')
    .select('*')
    .eq('copro_id', coproId)
    .order('unpaid_amount', { ascending: false });

  if (error) {
    console.error('Error fetching unpaid by lot:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * List payment reminders for a copro
 */
export async function listPaymentReminders(
  coproId: string,
  options?: { lotId?: string; status?: string }
): Promise<PaymentReminderOverview[]> {
  const supabase = createUntypedClient();

  let query = supabase
    .from('v_payment_reminders_overview')
    .select('*')
    .eq('copro_id', coproId);

  if (options?.lotId) {
    query = query.eq('lot_id', options.lotId);
  }

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching payment reminders:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get impayés statistics for a copro
 */
export async function getImpayesStats(
  coproId: string
): Promise<ImpayesStats> {
  const supabase = createUntypedClient();

  // Fetch unpaid lots
  const { data: unpaid, error: unpaidError } = await supabase
    .from('v_unpaid_by_lot')
    .select('unpaid_amount, severity')
    .eq('copro_id', coproId);

  if (unpaidError) {
    console.error('Error fetching impayés stats:', unpaidError);
    throw new Error(unpaidError.message);
  }

  // Fetch reminder counts
  const { data: reminders, error: remindersError } = await supabase
    .from('payment_reminders')
    .select('status')
    .eq('copro_id', coproId)
    .in('status', ['pending', 'sent']);

  if (remindersError) {
    console.error('Error fetching reminder stats:', remindersError);
    throw new Error(remindersError.message);
  }

  const items = unpaid || [];
  const reminderItems = reminders || [];

  return {
    totalImpayes: items.length,
    montantTotal: items.reduce((sum: number, i: { unpaid_amount: number }) => sum + i.unpaid_amount, 0),
    nbMinor: items.filter((i: { severity: string }) => i.severity === 'MINOR').length,
    nbMedium: items.filter((i: { severity: string }) => i.severity === 'MEDIUM').length,
    nbHigh: items.filter((i: { severity: string }) => i.severity === 'HIGH').length,
    nbCritical: items.filter((i: { severity: string }) => i.severity === 'CRITICAL').length,
    nbRelancesPending: reminderItems.filter((r: { status: string }) => r.status === 'pending').length,
    nbRelancesSent: reminderItems.filter((r: { status: string }) => r.status === 'sent').length,
  };
}

/**
 * List reminder rules for a copro
 */
export async function listReminderRules(
  coproId: string
): Promise<ReminderRule[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('payment_reminder_rules')
    .select('*')
    .eq('copro_id', coproId)
    .order('delay_days', { ascending: true });

  if (error) {
    console.error('Error fetching reminder rules:', error);
    throw new Error(error.message);
  }

  return data || [];
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a manual payment reminder
 */
export async function createPaymentReminder(
  input: CreateReminderInput
): Promise<string> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('payment_reminders')
    .insert({
      copro_id: input.copro_id,
      lot_id: input.lot_id,
      owner_id: input.owner_id,
      unpaid_amount: input.unpaid_amount,
      oldest_due_date: input.oldest_due_date,
      days_overdue: input.days_overdue,
      delay_level: input.delay_level,
      recipient_email: input.recipient_email,
      recipient_name: input.recipient_name,
      call_id: input.call_id,
      call_line_id: input.call_line_id,
      content: input.content,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating payment reminder:', error);
    throw new Error(error.message);
  }

  return data.id;
}

/**
 * Mark a reminder as sent
 */
export async function markReminderSent(
  reminderId: string,
  providerMessageId?: string
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('payment_reminders')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      delivery_status: 'delivered',
      provider_message_id: providerMessageId,
    })
    .eq('id', reminderId);

  if (error) {
    console.error('Error marking reminder as sent:', error);
    throw new Error(error.message);
  }
}

/**
 * Cancel a reminder
 */
export async function cancelReminder(
  reminderId: string,
  reason: string
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('payment_reminders')
    .update({
      status: 'stale',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason,
    })
    .eq('id', reminderId);

  if (error) {
    console.error('Error cancelling reminder:', error);
    throw new Error(error.message);
  }
}

/**
 * Get unpaid call_for_funds_lines for a specific lot
 * (Detailed breakdown of what is owed)
 */
export async function getUnpaidLinesForLot(
  coproId: string,
  lotId: string
): Promise<Array<{
  id: string;
  call_id: string;
  call_label: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
}>> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('call_for_funds_lines')
    .select(`
      id,
      call_id,
      amount_due,
      amount_paid,
      call_for_funds!inner (
        label,
        due_date,
        status
      )
    `)
    .eq('copro_id', coproId)
    .eq('lot_id', lotId)
    .gt('amount_due', 0)
    .lt('amount_paid', supabase.rpc ? undefined : undefined); // Filter done in JS below

  if (error) {
    console.error('Error fetching unpaid lines for lot:', error);
    throw new Error(error.message);
  }

  // Filter and map
  return (data || [])
    .filter((line: Record<string, unknown>) => {
      const amountDue = line.amount_due as number;
      const amountPaid = line.amount_paid as number;
      const callData = line.call_for_funds as Record<string, unknown>;
      const dueDate = callData?.due_date as string;
      return amountPaid < amountDue && dueDate && new Date(dueDate) < new Date();
    })
    .map((line: Record<string, unknown>) => {
      const callData = line.call_for_funds as Record<string, unknown>;
      return {
        id: line.id as string,
        call_id: line.call_id as string,
        call_label: (callData?.label as string) || '',
        due_date: (callData?.due_date as string) || '',
        amount_due: line.amount_due as number,
        amount_paid: line.amount_paid as number,
        remaining: (line.amount_due as number) - (line.amount_paid as number),
      };
    })
    .sort((a: { due_date: string }, b: { due_date: string }) =>
      new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
}
