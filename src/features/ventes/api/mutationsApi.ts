// ============================================================================
// API: Mutations Supabase
// ============================================================================

import { createClient } from '@/lib/supabase/client';
import type {
  Mutation,
  MutationOverview,
  EtatDateSnapshot,
  CreateMutationInput,
  ValidateMutationInput,
  SnapshotType,
} from '../domain/types';

const supabase = createClient();

// Helper for untyped views/tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromUntyped = (name: string) => (supabase as any).from(name);

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Récupère toutes les mutations d'une copropriété (vue enrichie)
 */
export async function fetchMutations(coproId: string): Promise<MutationOverview[]> {
  const { data, error } = await fromUntyped('v_mutations_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as MutationOverview[];
}

/**
 * Récupère une mutation par ID
 */
export async function fetchMutationById(
  coproId: string,
  mutationId: string
): Promise<MutationOverview | null> {
  const { data, error } = await fromUntyped('v_mutations_overview')
    .select('*')
    .eq('copro_id', coproId)
    .eq('id', mutationId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(error.message);
  }
  return data as MutationOverview;
}

/**
 * Récupère les snapshots état daté d'une mutation
 */
export async function fetchEtatDateSnapshots(
  coproId: string,
  mutationId: string
): Promise<EtatDateSnapshot[]> {
  const { data, error } = await fromUntyped('v_etat_date_latest')
    .select('*')
    .eq('copro_id', coproId)
    .eq('mutation_id', mutationId)
    .order('generated_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as EtatDateSnapshot[];
}

/**
 * Récupère les lots disponibles pour une nouvelle mutation
 */
export async function fetchAvailableLots(coproId: string) {
  // Les tantièmes ne sont plus une colonne de `lots` (ils vivent dans les clés
  // de répartition) : on les lit depuis la vue canonique v_lots_with_owners.
  const [lotsResult, tantiemesResult] = await Promise.all([
    supabase
      .from('lots')
      .select(`
        id,
        ref,
        type,
        floor,
        surface,
        lot_owners!inner (
          coproprietaire_id,
          is_primary,
          end_date,
          coproprietaires (
            id,
            first_name,
            last_name,
            company_name,
            is_company,
            email
          )
        )
      `)
      .eq('copro_id', coproId)
      .is('lot_owners.end_date', null)
      .eq('lot_owners.is_primary', true),
    supabase
      .from('v_lots_with_owners')
      .select('id, tantiemes_generaux')
      .eq('copro_id', coproId),
  ]);

  if (lotsResult.error) throw new Error(lotsResult.error.message);
  if (tantiemesResult.error) throw new Error(tantiemesResult.error.message);

  const tantiemesByLot = new Map(
    (tantiemesResult.data || []).map((l) => [l.id, l.tantiemes_generaux ?? 0])
  );

  return (lotsResult.data || []).map((lot) => ({
    ...lot,
    tantiemes_generaux: tantiemesByLot.get(lot.id) ?? 0,
  }));
}

// ============================================================================
// MUTATIONS (CRUD)
// ============================================================================

/**
 * Crée une nouvelle mutation
 */
export async function createMutation(input: CreateMutationInput): Promise<Mutation> {
  const { data, error } = await fromUntyped('mutations')
    .insert({
      copro_id: input.copro_id,
      lot_id: input.lot_id,
      seller_owner_id: input.seller_owner_id,
      mutation_type: input.mutation_type,
      buyer_name: input.buyer_name,
      buyer_email: input.buyer_email,
      buyer_is_company: input.buyer_is_company ?? false,
      notary_name: input.notary_name,
      notary_email: input.notary_email,
      notary_reference: input.notary_reference,
      notes: input.notes,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Mutation;
}

/**
 * Met à jour une mutation
 */
export async function updateMutation(
  mutationId: string,
  updates: Partial<Mutation>
): Promise<Mutation> {
  const { data, error } = await fromUntyped('mutations')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mutationId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Mutation;
}

/**
 * Annule une mutation
 */
export async function cancelMutation(mutationId: string): Promise<void> {
  const { error } = await fromUntyped('mutations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', mutationId);

  if (error) throw new Error(error.message);
}

// ============================================================================
// EDGE FUNCTIONS
// ============================================================================

/**
 * Génère un état daté (pré ou final) via Edge Function
 */
export async function generateEtatDate(
  coproId: string,
  mutationId: string,
  snapshotType: SnapshotType
): Promise<{
  success: boolean;
  snapshot_id?: string;
  document_id?: string;
  mutation_status?: string;
  payload?: unknown;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate_etat_date`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        copro_id: coproId,
        mutation_id: mutationId,
        snapshot_type: snapshotType,
      }),
    }
  );

  const result = await response.json();
  return result;
}

/**
 * Valide une mutation (transfert de propriété) via Edge Function
 */
export async function validateMutation(
  input: ValidateMutationInput
): Promise<{
  success: boolean;
  mutation_id?: string;
  buyer_owner_id?: string;
  new_status?: string;
  message?: string;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate_mutation`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify(input),
    }
  );

  const result = await response.json();
  return result;
}

/**
 * Obtient une URL signée pour télécharger un document de la GED
 */
export async function getDocumentSignedUrl(
  documentId: string
): Promise<{
  success: boolean;
  signed_url?: string;
  file_name?: string;
  mime_type?: string;
  expires_in?: number;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get_document_signed_url`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ document_id: documentId }),
    }
  );

  const result = await response.json();
  return result;
}
