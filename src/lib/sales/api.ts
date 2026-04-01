'use client';

/**
 * Sales/Mutations API Layer
 * Supabase queries and mutations for sales/ventes management
 *
 * Tables: mutations, mutation_steps, etat_date_snapshots
 * Views: v_mutations_overview, v_mutation_detail, v_etat_date_latest
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// Types - Database rows
// ============================================================================

/** Mutation type enum (DB) */
export type MutationType = 'sale' | 'donation' | 'inheritance' | 'other';

/** Mutation status (DB values) */
export type DbMutationStatus =
  | 'draft'
  | 'pre_etat_generated'
  | 'final_etat_generated'
  | 'sent_to_notary'
  | 'signed'
  | 'validated'
  | 'cancelled';

/** Step key (DB values) */
export type StepKey =
  | 'demande'
  | 'pre_etat_date'
  | 'etat_date'
  | 'envoi_notaire'
  | 'signature_acte'
  | 'cloture_compte';

/** Step status (DB values) */
export type DbStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/** Snapshot type (DB values) */
export type SnapshotType = 'pre' | 'final';

/** Mutation row from v_mutations_overview */
export interface MutationOverview {
  id: string;
  copro_id: string;
  lot_id: string;
  lot_ref: string;
  lot_type: string;
  tantiemes_generaux: number;
  building_id: string | null;
  floor: number | null;
  status: DbMutationStatus;
  mutation_type: MutationType;
  seller_owner_id: string;
  seller_name: string;
  seller_email: string | null;
  buyer_owner_id: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  notary_name: string | null;
  notary_email: string | null;
  requested_at: string;
  signature_date: string | null;
  effective_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  days_until_pre_etat_deadline: number | null;
  has_pre_etat: boolean;
  has_final_etat: boolean;
}

/** Mutation detail from v_mutation_detail */
export interface MutationDetail extends MutationOverview {
  buyer_is_company: boolean | null;
  notary_reference: string | null;
  steps: Record<StepKey, StepData>;
  etat_date_snapshots: SnapshotInfo[];
  completed_steps_count: number;
  total_steps_count: number;
}

/** Step data within mutation detail */
export interface StepData {
  status: DbStepStatus;
  completed_at: string | null;
  payload: Record<string, unknown>;
}

/** Snapshot info within mutation detail */
export interface SnapshotInfo {
  id: string;
  type: SnapshotType;
  generated_at: string;
  document_id: string | null;
}

/** Mutation step row */
export interface MutationStepRow {
  id: string;
  copro_id: string;
  mutation_id: string;
  step_key: StepKey;
  status: DbStepStatus;
  completed_at: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Etat date snapshot row */
export interface EtatDateSnapshotRow {
  id: string;
  copro_id: string;
  mutation_id: string;
  snapshot_type: SnapshotType;
  generated_at: string;
  generated_by: string | null;
  payload: Record<string, unknown>;
  document_id: string | null;
  created_at: string;
}

// ============================================================================
// Status mapping - Front ↔ DB
// ============================================================================

/** Map frontend VenteStatut to DB status */
export function mapVenteStatutToDb(statut: string): DbMutationStatus {
  switch (statut) {
    case 'EN_COURS':
      return 'draft';
    case 'TERMINEE':
      return 'validated';
    case 'ANNULEE':
      return 'cancelled';
    default:
      return 'draft';
  }
}

/** Map DB status to frontend VenteStatut */
export function mapDbStatusToVenteStatut(status: DbMutationStatus): string {
  switch (status) {
    case 'validated':
      return 'TERMINEE';
    case 'cancelled':
      return 'ANNULEE';
    default:
      return 'EN_COURS';
  }
}

/** Map DB step status to frontend */
export function mapDbStepStatusToFrontend(status: DbStepStatus): string {
  switch (status) {
    case 'completed':
      return 'completed';
    case 'in_progress':
      return 'in_progress';
    case 'skipped':
      return 'skipped';
    default:
      return 'pending';
  }
}

// ============================================================================
// QUERIES - List & Get
// ============================================================================

/**
 * List all mutations for a copro
 */
export async function listMutations(coproId: string): Promise<MutationOverview[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_mutations_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching mutations:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get mutation detail by ID
 */
export async function getMutationDetail(
  coproId: string,
  mutationId: string
): Promise<MutationDetail | null> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_mutation_detail')
    .select('*')
    .eq('copro_id', coproId)
    .eq('id', mutationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    console.error('Error fetching mutation detail:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * List mutation steps for a mutation
 */
export async function listMutationSteps(
  mutationId: string
): Promise<MutationStepRow[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('mutation_steps')
    .select('*')
    .eq('mutation_id', mutationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching mutation steps:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * List etat date snapshots for a mutation
 */
export async function listEtatDateSnapshots(
  mutationId: string
): Promise<EtatDateSnapshotRow[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('etat_date_snapshots')
    .select('*')
    .eq('mutation_id', mutationId)
    .order('generated_at', { ascending: false });

  if (error) {
    console.error('Error fetching etat date snapshots:', error);
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Get latest etat date snapshot for a mutation
 */
export async function getLatestEtatDate(
  mutationId: string,
  snapshotType?: SnapshotType
): Promise<EtatDateSnapshotRow | null> {
  const supabase = createUntypedClient();

  let query = supabase
    .from('etat_date_snapshots')
    .select('*')
    .eq('mutation_id', mutationId);

  if (snapshotType) {
    query = query.eq('snapshot_type', snapshotType);
  }

  const { data, error } = await query
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching latest etat date:', error);
    throw new Error(error.message);
  }

  return data;
}

// ============================================================================
// MUTATIONS - Create & Update
// ============================================================================

/** Input for creating a mutation */
export interface CreateMutationInput {
  copro_id: string;
  lot_id: string;
  seller_owner_id: string;
  mutation_type?: MutationType;
  buyer_name?: string;
  buyer_email?: string;
  buyer_is_company?: boolean;
  notary_name?: string;
  notary_email?: string;
  notary_reference?: string;
  notes?: string;
}

/**
 * Create a new mutation (sale)
 */
export async function createMutation(input: CreateMutationInput): Promise<string> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('mutations')
    .insert({
      copro_id: input.copro_id,
      lot_id: input.lot_id,
      seller_owner_id: input.seller_owner_id,
      mutation_type: input.mutation_type || 'sale',
      buyer_name: input.buyer_name,
      buyer_email: input.buyer_email,
      buyer_is_company: input.buyer_is_company || false,
      notary_name: input.notary_name,
      notary_email: input.notary_email,
      notary_reference: input.notary_reference,
      notes: input.notes,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating mutation:', error);
    throw new Error(error.message);
  }

  return data.id;
}

/** Input for updating a mutation */
export interface UpdateMutationInput {
  buyer_name?: string;
  buyer_email?: string;
  buyer_is_company?: boolean;
  buyer_owner_id?: string;
  notary_name?: string;
  notary_email?: string;
  notary_reference?: string;
  signature_date?: string;
  effective_date?: string;
  notes?: string;
}

/**
 * Update a mutation
 */
export async function updateMutation(
  mutationId: string,
  input: UpdateMutationInput
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('mutations')
    .update(input)
    .eq('id', mutationId);

  if (error) {
    console.error('Error updating mutation:', error);
    throw new Error(error.message);
  }
}

/**
 * Update mutation status
 */
export async function updateMutationStatus(
  mutationId: string,
  status: DbMutationStatus
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('mutations')
    .update({ status })
    .eq('id', mutationId);

  if (error) {
    console.error('Error updating mutation status:', error);
    throw new Error(error.message);
  }
}

/**
 * Delete a mutation (only if draft)
 */
export async function deleteMutation(mutationId: string): Promise<void> {
  const supabase = createUntypedClient();

  // First delete related records
  await supabase
    .from('etat_date_snapshots')
    .delete()
    .eq('mutation_id', mutationId);

  await supabase
    .from('mutation_steps')
    .delete()
    .eq('mutation_id', mutationId);

  const { error } = await supabase
    .from('mutations')
    .delete()
    .eq('id', mutationId);

  if (error) {
    console.error('Error deleting mutation:', error);
    throw new Error(error.message);
  }
}

// ============================================================================
// STEPS - Upsert
// ============================================================================

/** Input for upserting a step */
export interface UpsertStepInput {
  mutation_id: string;
  step_key: StepKey;
  status?: DbStepStatus;
  payload?: Record<string, unknown>;
}

/**
 * Upsert a mutation step (uses DB function)
 */
export async function upsertMutationStep(input: UpsertStepInput): Promise<MutationStepRow> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .rpc('upsert_mutation_step', {
      p_mutation_id: input.mutation_id,
      p_step_key: input.step_key,
      p_status: input.status || null,
      p_payload: input.payload || null,
    });

  if (error) {
    console.error('Error upserting mutation step:', error);
    throw new Error(error.message);
  }

  return data;
}

/**
 * Mark a step as completed
 */
export async function completeStep(
  mutationId: string,
  stepKey: StepKey,
  payload?: Record<string, unknown>
): Promise<MutationStepRow> {
  return upsertMutationStep({
    mutation_id: mutationId,
    step_key: stepKey,
    status: 'completed',
    payload,
  });
}

/**
 * Mark a step as in progress
 */
export async function startStep(
  mutationId: string,
  stepKey: StepKey,
  payload?: Record<string, unknown>
): Promise<MutationStepRow> {
  return upsertMutationStep({
    mutation_id: mutationId,
    step_key: stepKey,
    status: 'in_progress',
    payload,
  });
}

// ============================================================================
// ETAT DATE - Create Snapshots
// ============================================================================

/** Input for creating an etat date snapshot */
export interface CreateEtatDateInput {
  copro_id: string;
  mutation_id: string;
  snapshot_type: SnapshotType;
  payload: Record<string, unknown>;
  document_id?: string;
}

/**
 * Create an etat date snapshot
 */
export async function createEtatDateSnapshot(
  input: CreateEtatDateInput
): Promise<string> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('etat_date_snapshots')
    .insert({
      copro_id: input.copro_id,
      mutation_id: input.mutation_id,
      snapshot_type: input.snapshot_type,
      payload: input.payload,
      document_id: input.document_id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating etat date snapshot:', error);
    throw new Error(error.message);
  }

  // Also update the mutation status
  const newStatus: DbMutationStatus =
    input.snapshot_type === 'pre' ? 'pre_etat_generated' : 'final_etat_generated';

  await updateMutationStatus(input.mutation_id, newStatus);

  // Mark the corresponding step as completed
  const stepKey: StepKey =
    input.snapshot_type === 'pre' ? 'pre_etat_date' : 'etat_date';

  await completeStep(input.mutation_id, stepKey, {
    snapshot_id: data.id,
    generated_at: new Date().toISOString(),
  });

  return data.id;
}

// ============================================================================
// STATS - Aggregations
// ============================================================================

/** Sales statistics */
export interface SalesStats {
  total: number;
  draft: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}

/**
 * Get sales statistics for a copro
 */
export async function getSalesStats(coproId: string): Promise<SalesStats> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('mutations')
    .select('status')
    .eq('copro_id', coproId);

  if (error) {
    console.error('Error fetching sales stats:', error);
    throw new Error(error.message);
  }

  const stats: SalesStats = {
    total: 0,
    draft: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
  };

  (data || []).forEach((row: { status: string }) => {
    stats.total++;
    switch (row.status) {
      case 'draft':
        stats.draft++;
        break;
      case 'validated':
        stats.completed++;
        break;
      case 'cancelled':
        stats.cancelled++;
        break;
      default:
        stats.inProgress++;
    }
  });

  return stats;
}

// ============================================================================
// LEDGER - Sale completion → journal entry
// ============================================================================

/**
 * Create a ledger transaction for ALUR fund transfer when a sale is completed.
 * The ALUR fund balance follows tantièmes généraux (Art. 14-2 II),
 * so on sale, the seller's share is transferred to the buyer.
 *
 * This calls the DB function create_ledger_transaction which atomically
 * creates a transaction + entries and optionally posts it.
 */
export async function createSaleCompletionLedgerEntry(
  coproId: string,
  mutationId: string,
  options: {
    periodId: string;
    lotId: string;
    alurFundAmount?: number;
    sellerAccountId?: string;
    buyerAccountId?: string;
    alurAccountId?: string;
  }
): Promise<string | null> {
  const supabase = createUntypedClient();

  // Only create ledger entry if there's an ALUR fund amount to transfer
  if (!options.alurFundAmount || options.alurFundAmount <= 0) {
    return null;
  }

  // Build entries for the ALUR fund transfer
  // Debit: ALUR fund (reduce seller's share)
  // Credit: ALUR fund (add buyer's share)
  // Net effect is just a relabeling of the owner, tracked via lot_owner change
  const entries = [];

  if (options.sellerAccountId && options.buyerAccountId) {
    entries.push(
      {
        account_id: options.sellerAccountId,
        lot_id: options.lotId,
        direction: 'credit',
        amount: options.alurFundAmount,
        entry_label: 'Transfert fonds ALUR - Vente (vendeur)',
      },
      {
        account_id: options.buyerAccountId,
        lot_id: options.lotId,
        direction: 'debit',
        amount: options.alurFundAmount,
        entry_label: 'Transfert fonds ALUR - Vente (acquéreur)',
      }
    );
  }

  if (entries.length === 0) {
    return null;
  }

  const { data, error } = await supabase.rpc('create_ledger_transaction', {
    p_copro_id: coproId,
    p_period_id: options.periodId,
    p_tx_date: new Date().toISOString().split('T')[0],
    p_label: `Transfert fonds ALUR - Mutation ${mutationId.slice(0, 8)}`,
    p_source_type: 'mutation',
    p_source_id: mutationId,
    p_entries: JSON.stringify(entries),
    p_auto_post: true,
  });

  if (error) {
    console.error('Error creating sale completion ledger entry:', error);
    throw new Error(error.message);
  }

  return data?.tx_id || null;
}
