// ============================================================================
// API: AG Votes - Gestion des votes (session + correspondance)
// ============================================================================

import { createUntypedClient, invokeEdgeFunction } from './utils';
import type {
  AgVoteDetailed,
  CastVoteInput,
  CastVoteResponse,
} from '../types';

/**
 * Liste les votes d'une résolution
 */
export async function listVotes(resolutionId: string): Promise<AgVoteDetailed[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_votes_detailed')
    .select('*')
    .eq('resolution_id', resolutionId)
    .order('voter_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AgVoteDetailed[];
}

/**
 * Enregistrer un vote
 * Avec fallback direct DB si edge function échoue (401/JWT)
 */
export async function castVote(input: CastVoteInput): Promise<CastVoteResponse> {
  try {
    return await invokeEdgeFunction<CastVoteResponse>('ag_cast_vote', input);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '';
    // Si erreur 401/JWT, tenter l'upsert direct
    if (
      errorMsg.includes('401') ||
      errorMsg.includes('JWT') ||
      errorMsg.includes('Unauthorized') ||
      errorMsg.includes('non-2xx')
    ) {
      console.log('[castVote] Edge function échouée, tentative d\'upsert direct...');
      return castVoteDirect(input);
    }
    throw err;
  }
}

/**
 * Fallback: Enregistrer un vote directement dans la DB
 */
async function castVoteDirect(input: CastVoteInput): Promise<CastVoteResponse> {
  const supabase = createUntypedClient();

  try {
    // Récupérer les tantièmes du copropriétaire
    let tantiemes = 0;
    const { data: ownerLots } = await supabase
      .from('lot_owners')
      .select('lots!inner(id, tantiemes_generaux, copro_id)')
      .eq('coproprietaire_id', input.coproprietaire_id)
      .eq('lots.copro_id', input.copro_id)
      .is('end_date', null);

    if (ownerLots && ownerLots.length > 0) {
      tantiemes = ownerLots.reduce((sum: number, lo: { lots: { tantiemes_generaux: number } }) =>
        sum + (lo.lots?.tantiemes_generaux || 0), 0);
    }

    // Check if vote already exists
    const { data: existing } = await supabase
      .from('ag_votes')
      .select('id')
      .eq('resolution_id', input.resolution_id)
      .eq('coproprietaire_id', input.coproprietaire_id)
      .maybeSingle();

    const voteData = {
      resolution_id: input.resolution_id,
      copro_id: input.copro_id,
      coproprietaire_id: input.coproprietaire_id,
      vote: input.vote,
      tantiemes,
      vote_source: input.vote_source || 'live',
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Update existing vote
      const { data, error } = await supabase
        .from('ag_votes')
        .update(voteData)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) {
        console.error('[castVoteDirect] Update error:', error);
        return { success: false, error: error.message };
      }
      result = data;
    } else {
      // Insert new vote
      const { data, error } = await supabase
        .from('ag_votes')
        .insert({
          ...voteData,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('[castVoteDirect] Insert error:', error);
        return { success: false, error: error.message };
      }
      result = data;
    }

    console.log('[castVoteDirect] Vote enregistré avec ID:', result?.id);

    return {
      success: true,
      vote_id: result?.id,
      vote: input.vote,
      tantiemes,
      vote_source: input.vote_source || 'live',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[castVoteDirect] Exception:', err);
    return { success: false, error: errorMsg };
  }
}
