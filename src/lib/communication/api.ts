// ============================================================================
// API: Communication - Supabase Backend
// CoProFlex - NIVEAU 6B
// ============================================================================

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export type PostCategory = 'information' | 'question' | 'suggestion' | 'urgent' | 'other';
export type ContentVisibility = 'all_members' | 'council_only' | 'managers_only';
export type EventType = 'ag' | 'reunion_cs' | 'intervention' | 'travaux' | 'fete' | 'other';

// Wall Posts
export interface WallPost {
  id: string;
  copro_id: string;
  author_id: string;
  author_name: string | null;
  author_role: string | null;
  title: string;
  content: string;
  category: PostCategory;
  visibility: ContentVisibility;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by_name: string | null;
  likes_count: number;
  comments_count: number;
  current_user_liked: boolean;
  created_at: string;
  updated_at: string;
}

export interface WallComment {
  id: string;
  copro_id: string;
  post_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

// Events
export interface CalendarEvent {
  id: string;
  copro_id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  visibility: ContentVisibility;
  linked_ag_id: string | null;
  linked_ag_title: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// Conversations & Messages
export interface Conversation {
  id: string;
  copro_id: string;
  subject: string | null;
  is_group: boolean;
  created_by: string;
  created_by_name: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  participants_count: number;
  participant_names: string[] | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  copro_id: string;
  conversation_id: string;
  user_id: string;
  user_name: string | null;
  is_admin: boolean;
  joined_at: string;
  last_read_at: string | null;
  muted_until: string | null;
  left_at: string | null;
}

export interface Message {
  id: string;
  copro_id: string;
  conversation_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  attachment_ids: string[] | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
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
// QUERIES - WALL POSTS
// ============================================================================

export async function listWallPosts(coproId: string): Promise<ApiResult<WallPost[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_wall_feed')
    .select('*')
    .eq('copro_id', coproId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as WallPost[], error: null };
}

export async function getWallPost(postId: string): Promise<ApiResult<WallPost>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_wall_feed')
    .select('*')
    .eq('id', postId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as WallPost, error: null };
}

export async function listPostComments(postId: string): Promise<ApiResult<WallComment[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('wall_comments')
    .select(`
      id,
      copro_id,
      post_id,
      author_id,
      content,
      created_at,
      updated_at,
      profiles:author_id (full_name)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  // Map the profiles join to author_name
  const comments = (data || []).map((c: Record<string, unknown>) => ({
    id: c.id,
    copro_id: c.copro_id,
    post_id: c.post_id,
    author_id: c.author_id,
    author_name: (c.profiles as { full_name: string } | null)?.full_name || null,
    content: c.content,
    created_at: c.created_at,
    updated_at: c.updated_at,
  })) as WallComment[];

  return { data: comments, error: null };
}

// ============================================================================
// QUERIES - EVENTS
// ============================================================================

export async function listEvents(coproId: string): Promise<ApiResult<CalendarEvent[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_events_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('starts_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CalendarEvent[], error: null };
}

export async function getUpcomingEvents(coproId: string, limit: number = 5): Promise<ApiResult<CalendarEvent[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_events_overview')
    .select('*')
    .eq('copro_id', coproId)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CalendarEvent[], error: null };
}

export async function getEvent(eventId: string): Promise<ApiResult<CalendarEvent>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_events_overview')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as CalendarEvent, error: null };
}

// ============================================================================
// QUERIES - CONVERSATIONS
// ============================================================================

export async function listConversations(coproId: string): Promise<ApiResult<Conversation[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_conversations_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Conversation[], error: null };
}

export async function getConversation(conversationId: string): Promise<ApiResult<Conversation>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_conversations_overview')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Conversation, error: null };
}

export async function listConversationMessages(conversationId: string): Promise<ApiResult<Message[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Message[], error: null };
}

export async function listConversationMembers(conversationId: string): Promise<ApiResult<ConversationMember[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('conversation_members')
    .select(`
      id,
      copro_id,
      conversation_id,
      user_id,
      is_admin,
      joined_at,
      last_read_at,
      muted_until,
      left_at,
      profiles:user_id (full_name)
    `)
    .eq('conversation_id', conversationId)
    .is('left_at', null);

  if (error) {
    return { data: null, error: error.message };
  }

  const members = (data || []).map((m: Record<string, unknown>) => ({
    id: m.id,
    copro_id: m.copro_id,
    conversation_id: m.conversation_id,
    user_id: m.user_id,
    user_name: (m.profiles as { full_name: string } | null)?.full_name || null,
    is_admin: m.is_admin,
    joined_at: m.joined_at,
    last_read_at: m.last_read_at,
    muted_until: m.muted_until,
    left_at: m.left_at,
  })) as ConversationMember[];

  return { data: members, error: null };
}

// ============================================================================
// MUTATIONS - WALL POSTS (via Edge Function)
// ============================================================================

export interface CreatePostPayload {
  coproId: string;
  title: string;
  content: string;
  category?: PostCategory;
  visibility?: ContentVisibility;
}

export interface CreatePostResult {
  success: boolean;
  post?: WallPost;
  message?: string;
  error?: string;
}

export async function createPost(payload: CreatePostPayload): Promise<ApiResult<CreatePostResult>> {
  return invokeEdgeFunction('communication-workflow', 'create-post', payload);
}

export interface CreateCommentPayload {
  coproId: string;
  postId: string;
  content: string;
}

export interface CreateCommentResult {
  success: boolean;
  comment?: WallComment;
  message?: string;
  error?: string;
}

export async function createComment(payload: CreateCommentPayload): Promise<ApiResult<CreateCommentResult>> {
  return invokeEdgeFunction('communication-workflow', 'create-comment', payload);
}

export interface ToggleLikePayload {
  coproId: string;
  postId: string;
}

export interface ToggleLikeResult {
  success: boolean;
  liked: boolean;
  likesCount: number;
  error?: string;
}

export async function toggleLike(payload: ToggleLikePayload): Promise<ApiResult<ToggleLikeResult>> {
  return invokeEdgeFunction('communication-workflow', 'toggle-like', payload);
}

export interface TogglePinPayload {
  coproId: string;
  postId: string;
}

export interface TogglePinResult {
  success: boolean;
  isPinned: boolean;
  message?: string;
  error?: string;
}

export async function togglePin(payload: TogglePinPayload): Promise<ApiResult<TogglePinResult>> {
  return invokeEdgeFunction('communication-workflow', 'toggle-pin', payload);
}

export interface DeletePostPayload {
  coproId: string;
  postId: string;
}

export interface DeletePostResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function deletePost(payload: DeletePostPayload): Promise<ApiResult<DeletePostResult>> {
  return invokeEdgeFunction('communication-workflow', 'delete-post', payload);
}

// ============================================================================
// MUTATIONS - EVENTS (via Edge Function)
// ============================================================================

export interface CreateEventPayload {
  coproId: string;
  title: string;
  description?: string;
  eventType: EventType;
  location?: string;
  startsAt: string;
  endsAt?: string;
  allDay?: boolean;
  visibility?: ContentVisibility;
  linkedAgId?: string;
}

export interface CreateEventResult {
  success: boolean;
  event?: CalendarEvent;
  message?: string;
  error?: string;
}

export async function createEvent(payload: CreateEventPayload): Promise<ApiResult<CreateEventResult>> {
  return invokeEdgeFunction('communication-workflow', 'create-event', payload);
}

export interface UpdateEventPayload {
  eventId: string;
  title?: string;
  description?: string;
  eventType?: EventType;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  allDay?: boolean;
  visibility?: ContentVisibility;
}

export interface UpdateEventResult {
  success: boolean;
  event?: CalendarEvent;
  message?: string;
  error?: string;
}

export async function updateEvent(payload: UpdateEventPayload): Promise<ApiResult<UpdateEventResult>> {
  return invokeEdgeFunction('communication-workflow', 'update-event', payload);
}

export interface DeleteEventPayload {
  eventId: string;
}

export interface DeleteEventResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function deleteEvent(payload: DeleteEventPayload): Promise<ApiResult<DeleteEventResult>> {
  return invokeEdgeFunction('communication-workflow', 'delete-event', payload);
}

// ============================================================================
// MUTATIONS - CONVERSATIONS (via Edge Function)
// ============================================================================

export interface CreateConversationPayload {
  coproId: string;
  subject?: string;
  participantIds: string[];
  initialMessage?: string;
}

export interface CreateConversationResult {
  success: boolean;
  conversation?: Conversation;
  message?: string;
  error?: string;
}

export async function createConversation(payload: CreateConversationPayload): Promise<ApiResult<CreateConversationResult>> {
  return invokeEdgeFunction('communication-workflow', 'create-conversation', payload);
}

export interface SendMessagePayload {
  coproId: string;
  conversationId: string;
  content: string;
  attachmentIds?: string[];
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  error?: string;
}

export async function sendMessage(payload: SendMessagePayload): Promise<ApiResult<SendMessageResult>> {
  return invokeEdgeFunction('communication-workflow', 'send-message', payload);
}

export interface MarkConversationReadPayload {
  conversationId: string;
}

export interface MarkConversationReadResult {
  success: boolean;
  error?: string;
}

export async function markConversationRead(payload: MarkConversationReadPayload): Promise<ApiResult<MarkConversationReadResult>> {
  return invokeEdgeFunction('communication-workflow', 'mark-conversation-read', payload);
}

export interface LeaveConversationPayload {
  conversationId: string;
}

export interface LeaveConversationResult {
  success: boolean;
  message?: string;
  error?: string;
}

export async function leaveConversation(payload: LeaveConversationPayload): Promise<ApiResult<LeaveConversationResult>> {
  return invokeEdgeFunction('communication-workflow', 'leave-conversation', payload);
}

export interface AddConversationMemberPayload {
  conversationId: string;
  userId: string;
}

export interface AddConversationMemberResult {
  success: boolean;
  member?: ConversationMember;
  error?: string;
}

export async function addConversationMember(payload: AddConversationMemberPayload): Promise<ApiResult<AddConversationMemberResult>> {
  return invokeEdgeFunction('communication-workflow', 'add-conversation-member', payload);
}

// ============================================================================
// DIRECT MUTATIONS
// ============================================================================

export async function updatePost(
  postId: string,
  updates: {
    title?: string;
    content?: string;
    category?: PostCategory;
  }
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('wall_posts')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function updateComment(
  commentId: string,
  content: string
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('wall_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function deleteComment(commentId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('wall_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function updateMessage(
  messageId: string,
  content: string
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('messages')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', messageId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}
