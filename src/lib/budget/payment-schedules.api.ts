'use client';

/**
 * Payment Schedules API Layer
 * CRUD operations for budget_payment_schedules table
 *
 * Used for works budgets: phased payment tracking with retention support.
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// Types
// ============================================================================

export interface PaymentScheduleRow {
  id: string;
  copro_id: string;
  budget_id: string;
  phase_number: number;
  label: string;
  percentage: number;
  amount: number;
  due_date: string | null;
  status: 'pending' | 'awaiting_invoice' | 'paid';
  paid_date: string | null;
  invoice_ref: string | null;
  document_id: string | null;
  service_order_id: string | null;
  is_retention: boolean;
  retention_release_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePhaseInput {
  copro_id: string;
  budget_id: string;
  phase_number: number;
  label: string;
  percentage: number;
  amount: number;
  due_date?: string;
  is_retention?: boolean;
  retention_release_date?: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * List all payment schedule phases for a given budget, ordered by phase_number.
 */
export async function listPaymentSchedules(budgetId: string): Promise<PaymentScheduleRow[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('budget_payment_schedules')
    .select('*')
    .eq('budget_id', budgetId)
    .order('phase_number', { ascending: true });

  if (error) throw new Error('Failed to list payment schedules: ' + error.message);
  return data as PaymentScheduleRow[];
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Bulk-create payment phases. Returns the IDs of created rows.
 */
export async function createPaymentPhases(phases: CreatePhaseInput[]): Promise<string[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from('budget_payment_schedules')
    .insert(phases)
    .select('id');

  if (error) throw new Error('Failed to create payment phases: ' + error.message);
  return (data as { id: string }[]).map((r) => r.id);
}

/**
 * Update a single payment phase by id.
 */
export async function updatePaymentPhase(
  phaseId: string,
  updates: Partial<Omit<PaymentScheduleRow, 'id' | 'created_at' | 'updated_at'>>
): Promise<boolean> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('budget_payment_schedules')
    .update(updates)
    .eq('id', phaseId);

  if (error) throw new Error('Failed to update payment phase: ' + error.message);
  return true;
}

/**
 * Delete a single payment phase by id.
 */
export async function deletePaymentPhase(phaseId: string): Promise<boolean> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('budget_payment_schedules')
    .delete()
    .eq('id', phaseId);

  if (error) throw new Error('Failed to delete payment phase: ' + error.message);
  return true;
}

/**
 * Delete all payment phases for a given budget.
 */
export async function deleteAllPhasesForBudget(budgetId: string): Promise<boolean> {
  const supabase = createUntypedClient();
  const { error } = await supabase
    .from('budget_payment_schedules')
    .delete()
    .eq('budget_id', budgetId);

  if (error) throw new Error('Failed to delete payment phases for budget: ' + error.message);
  return true;
}

/**
 * Mark a payment phase as paid with optional invoice reference and document link.
 */
export async function markPhasePaid(
  phaseId: string,
  paidDate: string,
  invoiceRef?: string,
  documentId?: string
): Promise<boolean> {
  const supabase = createUntypedClient();

  const updates: Record<string, unknown> = {
    status: 'paid',
    paid_date: paidDate,
  };
  if (invoiceRef !== undefined) updates.invoice_ref = invoiceRef;
  if (documentId !== undefined) updates.document_id = documentId;

  const { error } = await supabase
    .from('budget_payment_schedules')
    .update(updates)
    .eq('id', phaseId);

  if (error) throw new Error('Failed to mark phase as paid: ' + error.message);
  return true;
}
