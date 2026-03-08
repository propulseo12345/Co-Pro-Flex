import { createUntypedClient } from './utils';

export interface BlocPoste {
  label: string;
  amount: number;
  sort_order: number;
  code?: string;
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

export interface CallPreviewKey {
  key_id: string;
  key_name: string;
  total_amount: number;
  budget_amount: number;
  alur_amount: number;
}

export interface CallPreviewData {
  copro_id: string;
  period_start: string;
  period_end: string;
  keys: CallPreviewKey[];
  total: number;
  total_budget: number;
  total_alur: number;
}

export async function loadCallPreviewData(agId: string): Promise<CallPreviewData | null> {
  const supabase = createUntypedClient();
  // Get budget lines grouped by key, combining current + alur
  const { data: budgets, error: bErr } = await supabase
    .from('budgets')
    .select('id, period_id, copro_id, budget_type')
    .eq('source_ag_id', agId);
  if (bErr || !budgets?.length) return null;

  const budgetIds = budgets.map((b: { id: string }) => b.id);
  const alurBudgetIds = new Set(
    (budgets as Array<{ id: string; budget_type: string }>)
      .filter(b => b.budget_type === 'alur')
      .map(b => b.id)
  );
  const periodId = budgets[0].period_id;
  const coproId = budgets[0].copro_id;

  // Get period dates
  const { data: period } = await supabase
    .from('accounting_periods')
    .select('start_date, end_date')
    .eq('id', periodId)
    .single();

  // Get budget lines with key info and budget_id to know source
  const { data: lines, error: lErr } = await supabase
    .from('budget_lines')
    .select('amount, budget_id, repartition_key_id, repartition_keys(name)')
    .in('budget_id', budgetIds)
    .not('repartition_key_id', 'is', null);
  if (lErr || !lines?.length) return null;

  // Group by key, tracking budget vs alur
  const keyMap = new Map<string, CallPreviewKey>();
  for (const line of lines as Array<{ amount: string; budget_id: string; repartition_key_id: string; repartition_keys: { name: string } | null }>) {
    const kid = line.repartition_key_id;
    const amt = parseFloat(line.amount) || 0;
    const isAlur = alurBudgetIds.has(line.budget_id);
    const existing = keyMap.get(kid);
    if (existing) {
      existing.total_amount += amt;
      if (isAlur) existing.alur_amount += amt;
      else existing.budget_amount += amt;
    } else {
      keyMap.set(kid, {
        key_id: kid,
        key_name: (line.repartition_keys as { name: string } | null)?.name || kid,
        total_amount: amt,
        budget_amount: isAlur ? 0 : amt,
        alur_amount: isAlur ? amt : 0,
      });
    }
  }

  const keys = Array.from(keyMap.values());
  return {
    copro_id: coproId,
    period_start: period?.start_date || '',
    period_end: period?.end_date || '',
    keys,
    total: keys.reduce((s, k) => s + k.total_amount, 0),
    total_budget: keys.reduce((s, k) => s + k.budget_amount, 0),
    total_alur: keys.reduce((s, k) => s + k.alur_amount, 0),
  };
}

export async function generateCombinedCallsFromAg(
  agId: string,
  nbAppels: number
): Promise<{ success: boolean; error?: string; calls_created?: number; lines_created?: number }> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase.rpc('generate_combined_calls_from_ag', {
    p_ag_id: agId,
    p_nb_appels: nbAppels,
  });
  if (error) return { success: false, error: error.message };
  return data as { success: boolean; error?: string; calls_created?: number; lines_created?: number };
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
  const { error } = await supabase
    .from('ag_meetings')
    .update({
      status: 'finalized',
      current_step: 9,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
