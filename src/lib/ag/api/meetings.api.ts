// ============================================================================
// API: AG Meetings (Assemblées Générales) - CRUD & Workflow
// ============================================================================

import { createUntypedClient, invokeEdgeFunction } from './utils';
import type {
  AgOverview,
  AgMeeting,
  AgResolutionResult,
  AgAttendanceSummary,
  CreateAgInput,
  CreateAgResponse,
  CloseAgInput,
  CloseAgResponse,
  StartAgInput,
  AgStatus,
} from '../types';

/**
 * Liste toutes les AG d'une copropriété (vue enrichie)
 */
export async function listAgMeetings(coproId: string): Promise<AgOverview[]> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_ag_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('meeting_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as AgOverview[];
}

/**
 * Récupère une AG par ID avec détails complets
 */
export async function getAg(agId: string): Promise<{
  meeting: AgMeeting;
  resolutions: AgResolutionResult[];
  attendance: AgAttendanceSummary[];
  quorum: {
    totalTantiemes: number;
    presentTantiemes: number;
    quorumRatio: number;
    attendeesCount: number;
  } | null;
} | null> {
  const supabase = createUntypedClient();

  // Fetch meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('ag_meetings')
    .select('*')
    .eq('id', agId)
    .single();

  if (meetingError) {
    if (meetingError.code === 'PGRST116') return null;
    throw new Error(meetingError.message);
  }

  // Fetch resolutions
  const { data: resolutions, error: resError } = await supabase
    .from('v_ag_resolutions_results')
    .select('*')
    .eq('ag_id', agId)
    .order('resolution_number', { ascending: true });

  if (resError) throw new Error(resError.message);

  // Fetch attendance
  const { data: attendance, error: attError } = await supabase
    .from('v_ag_attendance_summary')
    .select('*')
    .eq('ag_id', agId)
    .order('owner_name', { ascending: true });

  if (attError) throw new Error(attError.message);

  // Calculate quorum from attendance
  let quorum = null;
  if (attendance && attendance.length > 0) {
    // We need the total tantiemes of the copro, let's get it from the overview
    const { data: overview } = await supabase
      .from('v_ag_overview')
      .select('total_tantiemes, present_tantiemes, quorum_ratio, attendees_count')
      .eq('id', agId)
      .single();

    if (overview) {
      quorum = {
        totalTantiemes: overview.total_tantiemes || 0,
        presentTantiemes: overview.present_tantiemes || 0,
        quorumRatio: overview.quorum_ratio || 0,
        attendeesCount: overview.attendees_count || 0,
      };
    }
  }

  return {
    meeting: meeting as AgMeeting,
    resolutions: (resolutions || []) as AgResolutionResult[],
    attendance: (attendance || []) as AgAttendanceSummary[],
    quorum,
  };
}

/**
 * Créer une nouvelle AG
 */
export async function createAg(input: CreateAgInput): Promise<CreateAgResponse> {
  return invokeEdgeFunction<CreateAgResponse>('ag_create', input);
}

/**
 * Clôturer une AG
 */
export async function closeAg(input: CloseAgInput): Promise<CloseAgResponse> {
  return invokeEdgeFunction<CloseAgResponse>('ag_close', input);
}

/**
 * Démarrer une AG (mettre en statut in_progress)
 */
export async function startAg(input: StartAgInput): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'in_progress' as AgStatus,
      session_started_at: new Date().toISOString(),
      opening_notes: input.opening_notes || null,
    })
    .eq('id', input.ag_id)
    .eq('copro_id', input.copro_id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mettre à jour une AG
 */
export async function updateAg(
  agId: string,
  updates: {
    title?: string;
    meeting_date?: string;
    location?: string;
    president_name?: string;
    secretary_name?: string;
    scrutineer1_name?: string;
    scrutineer2_name?: string;
    opening_notes?: string;
    closing_notes?: string;
  }
): Promise<void> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('ag_meetings')
    .update(updates)
    .eq('id', agId);

  if (error) throw new Error(error.message);
}

/**
 * Met à jour l'étape courante du wizard AG
 * Appelé automatiquement quand l'utilisateur navigue entre les étapes
 */
export async function updateAgCurrentStep(
  agId: string,
  step: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();

  try {
    const { error } = await supabase.rpc('save_ag_wizard_state', {
      p_ag_id: agId,
      p_current_step: step,
      p_step_data: null,
      p_wizard_mode: null,
    });

    if (error) {
      console.warn('[updateAgCurrentStep] Error:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[updateAgCurrentStep] Exception:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
