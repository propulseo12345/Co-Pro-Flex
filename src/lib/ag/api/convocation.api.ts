// ============================================================================
// API: AG Convocation - Gestion des convocations
// ============================================================================

import { createUntypedClient } from './utils';
import type { AgStatus } from '../types';

/**
 * Marquer les convocations comme envoyées
 */
export async function markConvoked(agId: string, coproId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'convoked' as AgStatus,
      convocation_date: new Date().toISOString(),
    })
    .eq('id', agId)
    .eq('copro_id', coproId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
