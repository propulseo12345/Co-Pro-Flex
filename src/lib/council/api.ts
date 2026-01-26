// ============================================================================
// API: Conseil Syndical - Supabase Backend
// CoProFlex - NIVEAU 6B
// ============================================================================

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export type CouncilRole = 'president' | 'vice_president' | 'treasurer' | 'secretary' | 'member';
export type CouncilDecisionStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type CouncilVoteChoice = 'for' | 'against' | 'abstention';
export type ContentVisibility = 'all_members' | 'council_only' | 'managers_only';

export interface CouncilMember {
  id: string;
  copro_id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  coproprietaire_id: string | null;
  role: CouncilRole;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  lot_refs: string[] | null;
  total_tantiemes: number | null;
  created_at: string;
}

export interface CouncilDecision {
  id: string;
  copro_id: string;
  title: string;
  description: string | null;
  status: CouncilDecisionStatus;
  created_by: string;
  created_by_name: string | null;
  submitted_at: string | null;
  submitted_by_name: string | null;
  decided_at: string | null;
  decided_by_name: string | null;
  rejection_reason: string | null;
  linked_ag_id: string | null;
  linked_ag_title: string | null;
  linked_resolution_id: string | null;
  linked_resolution_title: string | null;
  // Vote stats
  total_members: number;
  votes_cast: number;
  votes_for: number;
  votes_against: number;
  votes_abstention: number;
  is_passed: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface CouncilVote {
  id: string;
  copro_id: string;
  decision_id: string;
  council_member_id: string;
  vote: CouncilVoteChoice;
  comment: string | null;
  voted_at: string;
  voter_name: string;
  voter_role: CouncilRole;
}

export interface CouncilDocument {
  id: string;
  copro_id: string;
  document_id: string;
  document_name: string | null;
  document_storage_path: string | null;
  visibility: ContentVisibility;
  linked_type: string | null;
  linked_id: string | null;
  label: string | null;
  notes: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
}

export interface DecisionResult {
  total_members: number;
  total_votes: number;
  votes_for: number;
  votes_against: number;
  votes_abstention: number;
  is_passed: boolean;
  quorum_reached: boolean;
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

// ============================================================================
// HELPERS
// ============================================================================

function getSupabaseClient() {
  return createUntypedClient();
}

async function invokeEdgeFunction<T>(
  functionName: string,
  action: string,
  payload: object
): Promise<ApiResult<T>> {
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { data: null, error: 'Non authentifié' };
  }

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${functionName}/${action}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();

    if (!result.success) {
      return { data: null, error: result.error || 'Erreur inconnue' };
    }

    return { data: result as T, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : 'Erreur réseau' };
  }
}

// ============================================================================
// QUERIES - COUNCIL MEMBERS
// ============================================================================

export async function listCouncilMembers(coproId: string): Promise<ApiResult<CouncilMember[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_council_members')
    .select('*')
    .eq('copro_id', coproId)
    .order('role', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CouncilMember[], error: null };
}

export async function getActiveCouncilMembers(coproId: string): Promise<ApiResult<CouncilMember[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_council_members')
    .select('*')
    .eq('copro_id', coproId)
    .eq('is_active', true)
    .order('role', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CouncilMember[], error: null };
}

export async function getMyCouncilRole(coproId: string): Promise<ApiResult<{
  isMember: boolean;
  role: CouncilRole | null;
  membership: CouncilMember | null;
}>> {
  return invokeEdgeFunction('council-workflow', 'get-my-council-role', { coproId });
}

// ============================================================================
// QUERIES - DECISIONS
// ============================================================================

export async function listDecisions(coproId: string): Promise<ApiResult<CouncilDecision[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_council_decisions_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CouncilDecision[], error: null };
}

export async function getDecision(decisionId: string): Promise<ApiResult<CouncilDecision>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_council_decisions_overview')
    .select('*')
    .eq('id', decisionId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CouncilDecision, error: null };
}

export async function getDecisionResults(decisionId: string): Promise<ApiResult<{
  results: DecisionResult;
  votes: CouncilVote[];
}>> {
  return invokeEdgeFunction('council-workflow', 'get-decision-results', { decisionId });
}

// ============================================================================
// QUERIES - DOCUMENTS
// ============================================================================

export async function listCouncilDocuments(coproId: string): Promise<ApiResult<CouncilDocument[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_council_documents_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CouncilDocument[], error: null };
}

// ============================================================================
// MUTATIONS - DECISIONS
// ============================================================================

export interface CreateDecisionPayload {
  coproId: string;
  title: string;
  description?: string;
  submitImmediately?: boolean;
  linkedAgId?: string;
  linkedResolutionId?: string;
}

export interface CreateDecisionResult {
  success: boolean;
  decision?: CouncilDecision;
  message?: string;
  error?: string;
}

export async function createDecision(payload: CreateDecisionPayload): Promise<ApiResult<CreateDecisionResult>> {
  return invokeEdgeFunction('council-workflow', 'create-decision', payload);
}

export interface CastVotePayload {
  decisionId: string;
  vote: CouncilVoteChoice;
  comment?: string;
}

export interface CastVoteResult {
  success: boolean;
  vote?: CouncilVote;
  results?: DecisionResult;
  message?: string;
  error?: string;
}

export async function castVote(payload: CastVotePayload): Promise<ApiResult<CastVoteResult>> {
  return invokeEdgeFunction('council-workflow', 'cast-vote', payload);
}

export interface UpdateDecisionStatusPayload {
  decisionId: string;
  newStatus: 'submitted' | 'approved' | 'rejected' | 'archived';
  rejectionReason?: string;
}

export interface UpdateDecisionStatusResult {
  success: boolean;
  decision?: CouncilDecision;
  message?: string;
  error?: string;
}

export async function updateDecisionStatus(payload: UpdateDecisionStatusPayload): Promise<ApiResult<UpdateDecisionStatusResult>> {
  return invokeEdgeFunction('council-workflow', 'update-decision-status', payload);
}

// ============================================================================
// MUTATIONS - DOCUMENTS
// ============================================================================

export interface AttachDocumentPayload {
  coproId: string;
  documentId: string;
  visibility: ContentVisibility;
  linkedType?: string;
  linkedId?: string;
  label?: string;
  notes?: string;
}

export interface AttachDocumentResult {
  success: boolean;
  councilDocument?: CouncilDocument;
  message?: string;
  error?: string;
}

export async function attachDocument(payload: AttachDocumentPayload): Promise<ApiResult<AttachDocumentResult>> {
  return invokeEdgeFunction('council-workflow', 'attach-document', payload);
}

// ============================================================================
// DIRECT MUTATIONS
// ============================================================================

export async function updateDecision(
  decisionId: string,
  updates: {
    title?: string;
    description?: string;
  }
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('council_decisions')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', decisionId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function deleteDecision(decisionId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  // Only allow deleting drafts
  const { error } = await supabase
    .from('council_decisions')
    .delete()
    .eq('id', decisionId)
    .eq('status', 'draft');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function removeCouncilDocument(documentId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('council_documents')
    .delete()
    .eq('id', documentId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}
