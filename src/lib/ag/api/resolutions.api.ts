// ============================================================================
// API: AG Resolutions - Gestion des résolutions
// ============================================================================

import { createUntypedClient, invokeEdgeFunction } from './utils';
import type {
  AgResolutionResult,
  AddResolutionInput,
  AddResolutionResponse,
} from '../types';

/**
 * Liste les résolutions d'une AG
 */
export async function listResolutions(agId: string): Promise<AgResolutionResult[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_resolutions_results')
    .select('*')
    .eq('ag_id', agId)
    .order('resolution_number', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AgResolutionResult[];
}

/**
 * Ajouter une résolution à une AG
 * Essaie d'abord via edge function, puis fallback sur insert direct si échec auth
 */
export async function addResolution(input: AddResolutionInput): Promise<AddResolutionResponse> {
  try {
    // Essayer d'abord via edge function
    return await invokeEdgeFunction<AddResolutionResponse>('ag_add_resolution', input);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '';

    // Si c'est une erreur d'auth ou si l'edge function n'existe pas, utiliser insert direct
    if (errorMsg.includes('401') || errorMsg.includes('JWT') || errorMsg.includes('auth') ||
        errorMsg.includes('Session') || errorMsg.includes('FunctionsFetchError') ||
        errorMsg.includes('non_2xx_response')) {
      // Edge function failed, trying direct insert
      return addResolutionDirect(input);
    }

    throw err;
  }
}

/**
 * Insertion directe d'une résolution (fallback si edge function indisponible)
 */
async function addResolutionDirect(input: AddResolutionInput): Promise<AddResolutionResponse> {
  const supabase = createUntypedClient();

  // Direct insert for resolution

  try {
    // Construire l'objet à insérer
    const insertData = {
      ag_id: input.ag_id,
      copro_id: input.copro_id,
      title: input.title,
      description: input.description || null,
      resolution_type: input.resolution_type || 'other',
      majority_type: input.majority_type || 'art24',
      resolution_number: input.resolution_number || 1,
      status: 'draft',
      variables: input.variables || null,
      is_customized: input.is_customized || false,
      action_type: input.action_type || null,
      tantiemes_for: 0,
      tantiemes_against: 0,
      tantiemes_abstention: 0,
      voters_for: 0,
      voters_against: 0,
      voters_abstention: 0,
      is_bridgeable: false,
      vote_details: {},
    };

    const { data, error } = await supabase
      .from('ag_resolutions')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('[addResolutionDirect] Erreur insert:', error);
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'insertion',
      };
    }

    return {
      success: true,
      resolution_id: data?.id,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[addResolutionDirect] Exception:', err);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Mettre à jour une résolution
 */
export async function updateResolution(
  resolutionId: string,
  updates: {
    title?: string;
    description?: string;
    resolution_type?: string;
    majority_type?: string;
    status?: string;
    variables?: Record<string, unknown>;
    is_customized?: boolean;
  }
): Promise<void> {
  const supabase = createUntypedClient();

  // Build update payload, filtering undefined values
  const payload: Record<string, unknown> = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.resolution_type !== undefined) payload.resolution_type = updates.resolution_type;
  if (updates.majority_type !== undefined) payload.majority_type = updates.majority_type;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.variables !== undefined) payload.variables = updates.variables;
  if (updates.is_customized !== undefined) payload.is_customized = updates.is_customized;

  // Always set updated_at
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('ag_resolutions')
    .update(payload)
    .eq('id', resolutionId);

  if (error) throw new Error(error.message);
}

/**
 * Supprimer une résolution
 */
export async function deleteResolution(resolutionId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_resolutions')
    .delete()
    .eq('id', resolutionId);

  if (error) throw new Error(error.message);
}

/**
 * Réordonner les résolutions
 */
export async function reorderResolutions(
  agId: string,
  resolutionIds: string[]
): Promise<void> {
  const supabase = createUntypedClient();

  // Update each resolution with its new number
  for (let i = 0; i < resolutionIds.length; i++) {
    const { error } = await supabase
      .from('ag_resolutions')
      .update({ resolution_number: i + 1 })
      .eq('id', resolutionIds[i])
      .eq('ag_id', agId);

    if (error) throw new Error(error.message);
  }
}
