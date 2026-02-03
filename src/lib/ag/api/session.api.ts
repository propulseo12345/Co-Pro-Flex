// ============================================================================
// API: AG Session - Présences, Quorum, Participants
// ============================================================================

import { createUntypedClient, invokeEdgeFunction } from './utils';
import type {
  AgAttendanceSummary,
  RegisterAttendanceInput,
  RegisterAttendanceResponse,
} from '../types';

/**
 * Liste les présences d'une AG
 */
export async function listAttendance(agId: string): Promise<AgAttendanceSummary[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_attendance_summary')
    .select('*')
    .eq('ag_id', agId)
    .order('owner_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []) as AgAttendanceSummary[];
}

/**
 * Liste les copropriétaires éligibles pour une AG via RPC sécurisée
 * Utilise rpc_get_ag_coproprietaires qui dérive copro_id depuis l'AG
 */
export async function listAgVoters(agId: string): Promise<Array<{
  coproprietaire_id: string;
  name: string;
  email: string | null;
  lot_ids: string[];
  lot_refs: string[];
  tantiemes: number;
}>> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase.rpc('rpc_get_ag_coproprietaires', {
    p_ag_id: agId,
  });

  if (error) throw new Error(error.message);

  // Map RPC result to expected format
  return (data || []).map((row: {
    id: string;
    display_name: string;
    email: string | null;
    total_tantiemes: number;
    lots_count: number;
  }) => ({
    coproprietaire_id: row.id,
    name: row.display_name || 'Inconnu',
    email: row.email,
    lot_ids: [], // Not returned by RPC, but not critical
    lot_refs: [],
    tantiemes: row.total_tantiemes || 0,
  }));
}

/**
 * Liste les copropriétaires éligibles pour une AG (avec leurs lots)
 * @deprecated Utiliser listAgVoters(agId) pour un scoping sécurisé
 */
export async function listEligibleVoters(coproId: string): Promise<Array<{
  coproprietaire_id: string;
  name: string;
  email: string | null;
  lot_ids: string[];
  lot_refs: string[];
  tantiemes: number;
}>> {
  const supabase = createUntypedClient();

  // Get all current lot owners for this copro
  const { data, error } = await supabase
    .from('lot_owners')
    .select(`
      coproprietaire_id,
      is_primary,
      lots!inner (
        id,
        ref,
        tantiemes_generaux,
        copro_id
      ),
      coproprietaires!inner (
        id,
        first_name,
        last_name,
        company_name,
        is_company,
        email
      )
    `)
    .eq('lots.copro_id', coproId)
    .is('end_date', null)
    .eq('is_primary', true);

  if (error) throw new Error(error.message);

  // Group by coproprietaire
  const votersMap = new Map<string, {
    coproprietaire_id: string;
    name: string;
    email: string | null;
    lot_ids: string[];
    lot_refs: string[];
    tantiemes: number;
  }>();

  for (const row of data || []) {
    const copro = row.coproprietaires as {
      id: string;
      first_name: string;
      last_name: string;
      company_name: string | null;
      is_company: boolean;
      email: string | null;
    };
    const lot = row.lots as {
      id: string;
      ref: string;
      tantiemes_generaux: number;
    };

    const existing = votersMap.get(copro.id);
    const name = copro.is_company
      ? copro.company_name || 'Société'
      : `${copro.first_name} ${copro.last_name}`;

    if (existing) {
      existing.lot_ids.push(lot.id);
      existing.lot_refs.push(lot.ref);
      existing.tantiemes += lot.tantiemes_generaux || 0;
    } else {
      votersMap.set(copro.id, {
        coproprietaire_id: copro.id,
        name,
        email: copro.email,
        lot_ids: [lot.id],
        lot_refs: [lot.ref],
        tantiemes: lot.tantiemes_generaux || 0,
      });
    }
  }

  return Array.from(votersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Enregistrer une présence
 * Essaie d'abord via edge function, puis fallback sur upsert direct si échec auth
 */
export async function registerAttendance(input: RegisterAttendanceInput): Promise<RegisterAttendanceResponse> {
  try {
    return await invokeEdgeFunction<RegisterAttendanceResponse>('ag_register_attendance', input);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : '';

    // Si c'est une erreur d'auth ou si l'edge function n'existe pas, utiliser upsert direct
    if (errorMsg.includes('401') || errorMsg.includes('JWT') || errorMsg.includes('auth') ||
        errorMsg.includes('Session') || errorMsg.includes('FunctionsFetchError') ||
        errorMsg.includes('non_2xx_response')) {
      console.log('[registerAttendance] Edge function échouée, tentative d\'upsert direct...');
      return registerAttendanceDirect(input);
    }

    throw err;
  }
}

/**
 * Insertion directe d'une présence (fallback si edge function indisponible)
 */
async function registerAttendanceDirect(input: RegisterAttendanceInput): Promise<RegisterAttendanceResponse> {
  const supabase = createUntypedClient();

  console.log('[registerAttendanceDirect] Upsert direct pour:', input.coproprietaire_id);

  try {
    // Get tantiemes for this coproprietaire from their lots
    const { data: lotsData, error: lotsError } = await supabase
      .from('lots')
      .select('tantiemes_generaux')
      .eq('copro_id', input.copro_id)
      .in('id', input.lot_ids.length > 0 ? input.lot_ids : ['00000000-0000-0000-0000-000000000000']);

    let tantiemes = 0;
    if (!lotsError && lotsData) {
      tantiemes = lotsData.reduce((sum: number, lot: { tantiemes_generaux: number }) => sum + (lot.tantiemes_generaux || 0), 0);
    }

    // If no lot_ids provided, get all lots for this coproprietaire
    if (input.lot_ids.length === 0) {
      const { data: ownerLots } = await supabase
        .from('lot_owners')
        .select('lots!inner(id, tantiemes_generaux)')
        .eq('coproprietaire_id', input.coproprietaire_id)
        .is('end_date', null);

      if (ownerLots && ownerLots.length > 0) {
        tantiemes = ownerLots.reduce((sum: number, lo: { lots: { tantiemes_generaux: number } }) =>
          sum + (lo.lots?.tantiemes_generaux || 0), 0);
      }
    }

    // Check if attendance record already exists
    const { data: existing } = await supabase
      .from('ag_attendance')
      .select('id')
      .eq('ag_id', input.ag_id)
      .eq('coproprietaire_id', input.coproprietaire_id)
      .maybeSingle();

    const attendanceData = {
      ag_id: input.ag_id,
      copro_id: input.copro_id,
      coproprietaire_id: input.coproprietaire_id,
      lot_ids: input.lot_ids,
      tantiemes,
      presence_type: input.presence_type,
      represented_by_id: input.represented_by_id || null,
      represented_by_name: input.represented_by_name || null,
      signed: false,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('ag_attendance')
        .update(attendanceData)
        .eq('id', existing.id)
        .select('id')
        .single();

      if (error) {
        console.error('[registerAttendanceDirect] Update error:', error);
        return { success: false, error: error.message };
      }
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('ag_attendance')
        .insert({
          ...attendanceData,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('[registerAttendanceDirect] Insert error:', error);
        return { success: false, error: error.message };
      }
      result = data;
    }

    console.log('[registerAttendanceDirect] Attendance enregistrée avec ID:', result?.id);

    return {
      success: true,
      attendance_id: result?.id,
      tantiemes,
      presence_type: input.presence_type,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[registerAttendanceDirect] Exception:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Supprimer une présence
 */
export async function removeAttendance(attendanceId: string): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_attendance')
    .delete()
    .eq('id', attendanceId);

  if (error) throw new Error(error.message);
}

/**
 * Signer une présence
 */
export async function signAttendance(
  attendanceId: string,
  signatureData: string
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_attendance')
    .update({
      signed: true,
      signed_at: new Date().toISOString(),
      signature_data: signatureData,
    })
    .eq('id', attendanceId);

  if (error) throw new Error(error.message);
}
