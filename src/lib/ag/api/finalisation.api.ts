import { createUntypedClient } from './utils';

export interface BlocPoste {
  label: string;
  amount: number;
  sort_order: number;
  account_id?: string;
  repartition_key_id?: string;
}

export interface MembreConseil {
  copro_id: string;
  nom: string;
  role: string;
}

export interface PendingAction {
  id: string;
  action_type: string;
  status: 'pending' | 'activated' | 'failed';
  error_message: string | null;
  result_data: Record<string, unknown> | null;
  resolution_id: string | null;
  resolution: { title: string; variables: Record<string, string> | null } | null;
}

export async function loadPendingActions(agId: string): Promise<PendingAction[]> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('get_ag_pending_actions', { p_ag_id: agId });
  if (error) throw error;
  return (data as unknown as PendingAction[]) || [];
}

export async function createBudgetFromAg(
  agId: string,
  exercice: number,
  postes: BlocPoste[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('create_budget_from_ag', {
    p_ag_id: agId,
    p_exercice: exercice,
    p_postes: postes,
  });
  if (error) return { success: false, error: error.message };
  const result = data as { success: boolean; error?: string };
  return result;
}

export async function createAlurFundFromAg(
  agId: string,
  montant: number,
  modalites: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('create_alur_fund_from_ag', {
    p_ag_id: agId,
    p_montant: montant,
    p_modalites: modalites,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function electCouncilFromAg(
  agId: string,
  membres: MembreConseil[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('elect_council_from_ag', {
    p_ag_id: agId,
    p_membres: membres,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function markActionActivated(
  agId: string,
  actionType: string,
  resultData?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('mark_ag_action_activated', {
    p_ag_id: agId,
    p_action_type: actionType,
    p_result_data: resultData || null,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string };
}

export async function markAgFinalized(agId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createUntypedClient();
  // La session est déjà close (finish_ag_session appelé au moment de l'envoi du PV)
  // On met juste à jour le statut en 'finalized'
  const { error } = await supabase
    .from('ag_meetings')
    .update({ status: 'finalized' })
    .eq('id', agId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
