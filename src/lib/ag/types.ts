// ============================================================================
// Types: AG (Assemblées Générales) - Supabase Backend
// ============================================================================

// ============================================================================
// ENUMS (matching database types)
// ============================================================================

export type AgMeetingType = 'ordinary' | 'extraordinary' | 'special';

export type AgStatus = 'draft' | 'convoked' | 'in_progress' | 'closed' | 'pv_generated';

export type ResolutionType = 'budget' | 'accounts' | 'works' | 'appointment' | 'contract' | 'rules' | 'other';

export type MajorityType = 'art24' | 'art25' | 'art25_1' | 'art26' | 'art26_1' | 'unanimity';

export type ResolutionStatus = 'draft' | 'pending' | 'voting' | 'voted' | 'approved' | 'rejected' | 'adjourned' | 'withdrawn';

export type AttendanceType = 'present' | 'proxy' | 'correspondence';

export type VoteDirection = 'for' | 'against' | 'abstention';

export type VoteSource = 'live' | 'correspondence';

// ============================================================================
// MODELS (matching database tables)
// ============================================================================

export interface AgMeeting {
  id: string;
  copro_id: string;
  title: string;
  meeting_type: AgMeetingType;
  meeting_date: string;
  location: string | null;
  convocation_date: string | null;
  convocation_deadline: string | null;
  status: AgStatus;
  quorum_required: boolean;
  president_id: string | null;
  president_name: string | null;
  secretary_id: string | null;
  secretary_name: string | null;
  scrutineer1_id: string | null;
  scrutineer1_name: string | null;
  scrutineer2_id: string | null;
  scrutineer2_name: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  opening_notes: string | null;
  closing_notes: string | null;
  incidents: string | null;
  pv_document_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgResolution {
  id: string;
  ag_id: string;
  copro_id: string;
  resolution_number: number;
  title: string;
  description: string | null;
  resolution_type: ResolutionType;
  majority_type: MajorityType;
  linked_budget_id: string | null;
  linked_work_budget_id: string | null;
  status: ResolutionStatus;
  tantiemes_for: number;
  tantiemes_against: number;
  tantiemes_abstention: number;
  voters_for: number;
  voters_against: number;
  voters_abstention: number;
  threshold_tantiemes: number | null;
  threshold_voters: number | null;
  is_approved: boolean | null;
  is_bridgeable: boolean;
  bridge_vote_id: string | null;
  voted_at: string | null;
  vote_details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgAttendance {
  id: string;
  ag_id: string;
  copro_id: string;
  coproprietaire_id: string;
  lot_ids: string[];
  tantiemes: number;
  presence_type: AttendanceType;
  represented_by_id: string | null;
  represented_by_name: string | null;
  proxy_document_id: string | null;
  signed: boolean;
  signed_at: string | null;
  signature_data: string | null;
  arrived_at: string | null;
  left_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgVote {
  id: string;
  resolution_id: string;
  copro_id: string;
  coproprietaire_id: string;
  vote: VoteDirection;
  tantiemes: number;
  vote_source: VoteSource;
  is_excluded: boolean;
  exclusion_reason: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// VIEWS (matching database views)
// ============================================================================

export interface AgOverview {
  id: string;
  copro_id: string;
  copro_name: string;
  title: string;
  meeting_type: AgMeetingType;
  meeting_date: string;
  location: string | null;
  status: AgStatus;
  convocation_date: string | null;
  convocation_deadline: string | null;
  president_name: string | null;
  secretary_name: string | null;
  // Quorum stats
  total_tantiemes: number | null;
  present_tantiemes: number | null;
  quorum_ratio: number | null;
  attendees_count: number | null;
  present_count: number | null;
  proxy_count: number | null;
  correspondence_count: number | null;
  // Resolution stats
  resolutions_count: number;
  approved_count: number;
  rejected_count: number;
  // Audit
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
}

export interface AgResolutionResult {
  id: string;
  ag_id: string;
  ag_title: string;
  ag_date: string;
  copro_id: string;
  resolution_number: number;
  title: string;
  description: string | null;
  resolution_type: ResolutionType;
  majority_type: MajorityType;
  status: ResolutionStatus;
  tantiemes_for: number;
  tantiemes_against: number;
  tantiemes_abstention: number;
  voters_for: number;
  voters_against: number;
  voters_abstention: number;
  threshold_tantiemes: number | null;
  threshold_voters: number | null;
  is_approved: boolean | null;
  is_bridgeable: boolean;
  percent_for: number;
  bridge_vote_id: string | null;
  voted_at: string | null;
  vote_details: Record<string, unknown>;
  // Variables for template interpolation
  variables?: Record<string, unknown> | null;
  is_customized?: boolean;
  created_at: string;
}

export interface AgAttendanceSummary {
  id: string;
  ag_id: string;
  ag_title: string;
  ag_date: string;
  copro_id: string;
  coproprietaire_id: string;
  owner_name: string;
  owner_email: string | null;
  lot_ids: string[];
  lot_refs: string[] | null;
  tantiemes: number;
  presence_type: AttendanceType;
  represented_by_name: string | null;
  signed: boolean;
  signed_at: string | null;
  arrived_at: string | null;
  left_at: string | null;
  created_at: string;
}

export interface AgVoteDetailed {
  vote_id: string;
  resolution_id: string;
  resolution_title: string;
  resolution_number: number;
  majority_type: MajorityType;
  copro_id: string;
  ag_id: string;
  ag_title: string;
  meeting_date: string;
  coproprietaire_id: string;
  voter_name: string;
  vote: VoteDirection;
  tantiemes: number;
  vote_source: VoteSource;
  is_excluded: boolean;
  exclusion_reason: string | null;
  created_at: string;
}

// ============================================================================
// INPUT TYPES (for mutations)
// ============================================================================

export interface CreateAgInput {
  copro_id: string;
  title: string;
  meeting_type?: AgMeetingType;
  meeting_date: string;
  location: string;
  convocation_date?: string;
  include_standard_resolutions?: boolean;
}

export interface AddResolutionInput {
  ag_id: string;
  copro_id: string;
  title: string;
  description?: string;
  resolution_type?: ResolutionType;
  majority_type?: MajorityType;
  resolution_number?: number;
  variables?: Record<string, unknown>;
  is_customized?: boolean;
}

export interface RegisterAttendanceInput {
  ag_id: string;
  copro_id: string;
  coproprietaire_id: string;
  lot_ids: string[];
  presence_type: AttendanceType;
  represented_by_id?: string;
  represented_by_name?: string;
}

export interface CastVoteInput {
  resolution_id: string;
  copro_id: string;
  coproprietaire_id: string;
  vote: VoteDirection;
  vote_source?: VoteSource;
}

export interface CloseAgInput {
  ag_id: string;
  copro_id: string;
  closing_notes?: string;
}

export interface StartAgInput {
  ag_id: string;
  copro_id: string;
  opening_notes?: string;
}

// ============================================================================
// RESPONSE TYPES (from edge functions)
// ============================================================================

export interface CreateAgResponse {
  success: boolean;
  error?: string;
  ag_id?: string;
  title?: string;
  meeting_date?: string;
  status?: string;
  convocation_date?: string;
  resolutions_count?: number;
}

export interface AddResolutionResponse {
  success: boolean;
  error?: string;
  resolution_id?: string;
  resolution_number?: number;
  title?: string;
}

export interface RegisterAttendanceResponse {
  success: boolean;
  error?: string;
  attendance_id?: string;
  tantiemes?: number;
  presence_type?: string;
}

export interface CastVoteResponse {
  success: boolean;
  error?: string;
  vote_id?: string;
  resolution_title?: string;
  vote?: string;
  tantiemes?: number;
  vote_source?: string;
  current_result?: {
    votes_for: number;
    votes_against: number;
    votes_abstention: number;
    tantiemes_for: number;
    tantiemes_against: number;
    tantiemes_abstention: number;
  };
}

export interface CloseAgResponse {
  success: boolean;
  error?: string;
  ag_id?: string;
  closed_at?: string;
  resolutions_calculated?: number;
  results?: Array<{
    resolution_number: number;
    title: string;
    result: Record<string, unknown>;
  }>;
}

// ============================================================================
// STATS TYPES
// ============================================================================

export interface AgStats {
  total: number;
  draft: number;
  convoked: number;
  inProgress: number;
  closed: number;
  pvGenerated: number;
  upcoming: number;
  past: number;
}

export interface QuorumStats {
  totalTantiemes: number;
  presentTantiemes: number;
  quorumRatio: number;
  attendeesCount: number;
  presentCount: number;
  proxyCount: number;
  correspondenceCount: number;
}

// ============================================================================
// DOCUMENT TYPES (AG Documents)
// ============================================================================

export type AgDocumentType = 'convocation' | 'attendance_sheet' | 'pv';

export interface AgDocument {
  id: string;
  copro_id: string;
  ag_id: string;
  ag_title: string;
  ag_date: string;
  ag_status: AgStatus;
  doc_type: AgDocumentType;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  version: number;
  generated_at: string;
  generated_by: string | null;
  generated_by_name: string | null;
  generation_metadata: Record<string, unknown>;
  document_id: string | null;
  document_name: string | null;
  retention_until: string | null;
}

export interface GenerateDocumentInput {
  copro_id: string;
  ag_id: string;
  doc_type: AgDocumentType;
}

export interface GenerateDocumentResponse {
  success: boolean;
  error?: string;
  document_id?: string;
  storage_path?: string;
  signed_url?: string;
  expires_at?: string;
  version?: number;
}

export interface GetSignedUrlResponse {
  signedUrl: string;
  expiresAt: string;
}
