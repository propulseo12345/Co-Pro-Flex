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

/** Acquéreur saisi avant validation (pas encore copropriétaire) -> buyer_draft. */
type BuyerDraft = { name?: string; email?: string; is_company?: boolean };

/** Construit buyer_draft à partir des champs acquéreur libres (null si vide). */
function buildBuyerDraft(input: {
  buyer_name?: string | null;
  buyer_email?: string | null;
  buyer_is_company?: boolean | null;
}): BuyerDraft | null {
  const draft: BuyerDraft = {};
  if (input.buyer_name) draft.name = input.buyer_name;
  if (input.buyer_email) draft.email = input.buyer_email;
  if (input.buyer_is_company !== undefined && input.buyer_is_company !== null) {
    draft.is_company = input.buyer_is_company;
  }
  return Object.keys(draft).length > 0 ? draft : null;
}

/**
 * Crée (ou réutilise) le tiers notaire d'une copro à partir du notaire saisi
 * librement, et renvoie son id (find-or-create atomique, migration 0064).
 */
async function resolveNotaryTiersId(
  coproId: string,
  input: { notary_name?: string | null; notary_email?: string | null; notary_reference?: string | null }
): Promise<string | null> {
  if (!input.notary_name) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('upsert_mutation_notary', {
    p_copro_id: coproId,
    p_name: input.notary_name,
    p_email: input.notary_email ?? null,
    p_office_name: null,
    p_notary_reference: input.notary_reference ?? null,
  });
  if (error) throw new Error(error.message);
  return (data as string) ?? null;
}

/**
 * Crée une nouvelle mutation.
 *
 * Le modèle réel `mutations` (0019) n'a pas de colonnes acquéreur/notaire libres :
 * l'acquéreur saisi va dans `buyer_draft` (jsonb), le notaire devient un `tiers`
 * (is_notary) référencé par `notaire_id`. `buyer_owner_id` reste NULL avant validation.
 */
export async function createMutation(input: CreateMutationInput): Promise<Mutation> {
  const notaireId = await resolveNotaryTiersId(input.copro_id, input);
  const buyerDraft = buildBuyerDraft(input);

  const { data, error } = await fromUntyped('mutations')
    .insert({
      copro_id: input.copro_id,
      lot_id: input.lot_id,
      seller_owner_id: input.seller_owner_id,
      mutation_type: input.mutation_type,
      notaire_id: notaireId,
      buyer_draft: buyerDraft,
      notes: input.notes,
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Mutation;
}

/**
 * Met à jour une mutation (mêmes garde-fous que createMutation : on ne pousse que
 * des colonnes réelles, les champs acquéreur/notaire libres sont traduits).
 */
export async function updateMutation(
  mutationId: string,
  updates: Partial<Mutation>
): Promise<Mutation> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.buyer_owner_id !== undefined) patch.buyer_owner_id = updates.buyer_owner_id;
  if (updates.signature_date !== undefined) patch.signature_date = updates.signature_date;
  if (updates.effective_date !== undefined) patch.effective_date = updates.effective_date;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.mutation_type !== undefined) patch.mutation_type = updates.mutation_type;

  const buyerDraft = buildBuyerDraft(updates);
  if (buyerDraft) patch.buyer_draft = buyerDraft;

  if (updates.notary_name) {
    const { data: existing, error: fetchError } = await fromUntyped('mutations')
      .select('copro_id')
      .eq('id', mutationId)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    patch.notaire_id = await resolveNotaryTiersId(existing.copro_id, updates);
  }

  const { data, error } = await fromUntyped('mutations')
    .update(patch)
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
  payload?: unknown;
  error?: string;
}> {
  // RPC canonique (l'edge function `generate_etat_date` n'existe pas dans le dépôt) :
  // create_etat_date_snapshot fige le payload (generate_etat_date_payload) dans
  // etat_date_snapshots (immuable) et fait avancer le workflow de la mutation.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('create_etat_date_snapshot', {
    p_copro_id: coproId,
    p_mutation_id: mutationId,
    p_snapshot_type: snapshotType,
  });

  if (error) return { success: false, error: error.message };
  return {
    success: data?.success ?? true,
    snapshot_id: data?.snapshot_id,
    payload: data?.payload,
  };
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
  // RPC canonique (l'edge function `validate_mutation` n'existe pas dans le dépôt) :
  // bascule lot_owners (lot-centric) — ZÉRO écriture au grand livre. L'acquéreur peut être
  // fourni par id, sinon réutilisé depuis mutations.buyer_owner_id (fallback côté SQL).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('validate_mutation', {
    p_mutation_id: input.mutation_id,
    p_signature_date: input.signature_date,
    p_effective_date: null,
    p_buyer_owner_id: input.buyer_owner_id ?? null,
    p_buyer_first_name: input.buyer_first_name ?? null,
    p_buyer_last_name: input.buyer_last_name ?? null,
    p_buyer_company_name: null,
    p_buyer_email: input.buyer_email ?? null,
    p_buyer_is_company: input.buyer_is_company ?? false,
  });

  if (error) return { success: false, error: error.message };
  return {
    success: data?.success ?? true,
    mutation_id: data?.mutation_id,
    buyer_owner_id: data?.buyer_owner_id,
    new_status: 'validated',
  };
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
