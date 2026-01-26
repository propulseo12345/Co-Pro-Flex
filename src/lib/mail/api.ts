// ============================================================================
// API: Mail Module - Supabase Backend
// CoProFlex - NIVEAU 6B
// ============================================================================

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
export type RecipientType = 'all' | 'council' | 'by_building' | 'by_floor' | 'custom';
export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

export interface MailTemplate {
  id: string;
  copro_id: string;
  name: string;
  subject: string;
  body: string;
  category: string | null;
  variables: string[] | null;
  is_system: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MailFolder {
  id: string;
  copro_id: string;
  user_id: string;
  name: string;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  system_type: string | null;
  created_at: string;
}

export interface MailCampaign {
  id: string;
  copro_id: string;
  subject: string;
  body: string;
  preview: string | null;
  template_id: string | null;
  template_name: string | null;
  recipient_type: RecipientType;
  recipient_filter: Record<string, unknown> | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  failed_count: number;
  open_rate: number;
  click_rate: number;
  folder_id: string | null;
  folder_name: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface MailRecipient {
  id: string;
  copro_id: string;
  campaign_id: string;
  coproprietaire_id: string | null;
  email: string;
  name: string | null;
  variables: Record<string, string> | null;
  delivery_status: DeliveryStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface MailInbox {
  id: string;
  copro_id: string;
  original_campaign_id: string | null;
  original_campaign_subject: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  body: string;
  preview: string | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  folder_id: string | null;
  folder_name: string | null;
  owner_id: string;
  received_at: string;
  created_at: string;
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

// ============================================================================
// QUERIES - TEMPLATES
// ============================================================================

export async function listTemplates(coproId: string): Promise<ApiResult<MailTemplate[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mail_templates')
    .select('*')
    .eq('copro_id', coproId)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailTemplate[], error: null };
}

export async function getTemplate(templateId: string): Promise<ApiResult<MailTemplate>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mail_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailTemplate, error: null };
}

// ============================================================================
// QUERIES - FOLDERS
// ============================================================================

export async function listFolders(): Promise<ApiResult<MailFolder[]>> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('mail_folders')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailFolder[], error: null };
}

// ============================================================================
// QUERIES - CAMPAIGNS
// ============================================================================

export async function listCampaigns(coproId: string, status?: CampaignStatus): Promise<ApiResult<MailCampaign[]>> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('v_mail_campaigns_overview')
    .select('*')
    .eq('copro_id', coproId);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailCampaign[], error: null };
}

export async function getCampaign(campaignId: string): Promise<ApiResult<MailCampaign>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('v_mail_campaigns_overview')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailCampaign, error: null };
}

export async function getCampaignRecipients(campaignId: string): Promise<ApiResult<MailRecipient[]>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mail_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('email', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailRecipient[], error: null };
}

// ============================================================================
// QUERIES - INBOX
// ============================================================================

export async function listInbox(coproId: string, folderId?: string | null): Promise<ApiResult<MailInbox[]>> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from('v_mail_inbox_overview')
    .select('*')
    .eq('copro_id', coproId);

  if (folderId) {
    query = query.eq('folder_id', folderId);
  }

  const { data, error } = await query.order('received_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailInbox[], error: null };
}

export async function getInboxMessage(messageId: string): Promise<ApiResult<MailInbox>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mail_inbox')
    .select('*')
    .eq('id', messageId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Mark as read
  await supabase
    .from('mail_inbox')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', messageId);

  return { data: data as MailInbox, error: null };
}

export async function getUnreadCount(coproId: string): Promise<ApiResult<number>> {
  const supabase = getSupabaseClient();

  const { count, error } = await supabase
    .from('mail_inbox')
    .select('*', { count: 'exact', head: true })
    .eq('copro_id', coproId)
    .eq('is_read', false)
    .eq('is_deleted', false);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: count || 0, error: null };
}

// ============================================================================
// MUTATIONS - TEMPLATES
// ============================================================================

export interface CreateTemplatePayload {
  coproId: string;
  name: string;
  subject: string;
  body: string;
  category?: string;
  variables?: string[];
}

export async function createTemplate(payload: CreateTemplatePayload): Promise<ApiResult<MailTemplate>> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('mail_templates')
    .insert({
      copro_id: payload.coproId,
      name: payload.name,
      subject: payload.subject,
      body: payload.body,
      category: payload.category || null,
      variables: payload.variables || null,
      is_system: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailTemplate, error: null };
}

export async function updateTemplate(
  templateId: string,
  updates: Partial<Pick<MailTemplate, 'name' | 'subject' | 'body' | 'category' | 'variables'>>
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', templateId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function deleteTemplate(templateId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_templates')
    .delete()
    .eq('id', templateId)
    .eq('is_system', false);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

// ============================================================================
// MUTATIONS - FOLDERS
// ============================================================================

export interface CreateFolderPayload {
  coproId: string;
  name: string;
  color?: string;
  icon?: string;
}

export async function createFolder(payload: CreateFolderPayload): Promise<ApiResult<MailFolder>> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Non authentifié' };
  }

  // Get max sort order
  const { data: existing } = await supabase
    .from('mail_folders')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const sortOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('mail_folders')
    .insert({
      copro_id: payload.coproId,
      user_id: user.id,
      name: payload.name,
      color: payload.color || '#6b7280',
      icon: payload.icon || null,
      sort_order: sortOrder,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailFolder, error: null };
}

export async function updateFolder(
  folderId: string,
  updates: Partial<Pick<MailFolder, 'name' | 'color' | 'icon'>>
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_folders')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', folderId)
    .eq('is_system', false);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function deleteFolder(folderId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_folders')
    .delete()
    .eq('id', folderId)
    .eq('is_system', false);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

// ============================================================================
// MUTATIONS - CAMPAIGNS
// ============================================================================

export interface CreateCampaignPayload {
  coproId: string;
  subject: string;
  body: string;
  templateId?: string;
  recipientType: RecipientType;
  recipientFilter?: Record<string, unknown>;
  attachmentIds?: string[];
  scheduledAt?: string;
}

export async function createCampaign(payload: CreateCampaignPayload): Promise<ApiResult<MailCampaign>> {
  const supabase = getSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Non authentifié' };
  }

  const { data, error } = await supabase
    .from('mail_campaigns')
    .insert({
      copro_id: payload.coproId,
      subject: payload.subject,
      body: payload.body,
      template_id: payload.templateId || null,
      recipient_type: payload.recipientType,
      recipient_filter: payload.recipientFilter || null,
      attachment_ids: payload.attachmentIds || null,
      status: payload.scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: payload.scheduledAt || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as MailCampaign, error: null };
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<Pick<MailCampaign, 'subject' | 'body' | 'recipient_type' | 'recipient_filter' | 'scheduled_at'>>
): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_campaigns')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function deleteCampaign(campaignId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('status', 'draft');

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function generateRecipients(campaignId: string): Promise<ApiResult<number>> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.rpc('generate_campaign_recipients', {
    p_campaign_id: campaignId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as number, error: null };
}

export async function sendCampaign(campaignId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  // Update status to sending
  const { error } = await supabase
    .from('mail_campaigns')
    .update({
      status: 'sending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .in('status', ['draft', 'scheduled']);

  if (error) {
    return { data: null, error: error.message };
  }

  // Note: Actual sending would be done by an Edge Function or background job
  // that processes campaigns with status='sending'

  return { data: undefined, error: null };
}

export async function cancelCampaign(campaignId: string): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_campaigns')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)
    .in('status', ['scheduled', 'sending']);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

// ============================================================================
// MUTATIONS - INBOX
// ============================================================================

export async function markAsRead(messageIds: string[]): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .in('id', messageIds);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function markAsUnread(messageIds: string[]): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .update({ is_read: false, updated_at: new Date().toISOString() })
    .in('id', messageIds);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function toggleStar(messageId: string): Promise<ApiResult<boolean>> {
  const supabase = getSupabaseClient();

  // Get current state
  const { data: message } = await supabase
    .from('mail_inbox')
    .select('is_starred')
    .eq('id', messageId)
    .single();

  const newState = !message?.is_starred;

  const { error } = await supabase
    .from('mail_inbox')
    .update({ is_starred: newState, updated_at: new Date().toISOString() })
    .eq('id', messageId);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: newState, error: null };
}

export async function moveToFolder(messageIds: string[], folderId: string | null): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .update({
      folder_id: folderId,
      is_archived: folderId === null ? false : undefined,
      updated_at: new Date().toISOString(),
    })
    .in('id', messageIds);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function archiveMessages(messageIds: string[]): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .update({
      is_archived: true,
      updated_at: new Date().toISOString(),
    })
    .in('id', messageIds);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function deleteMessages(messageIds: string[]): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .in('id', messageIds);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function permanentlyDeleteMessages(messageIds: string[]): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .delete()
    .in('id', messageIds)
    .eq('is_deleted', true);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}

export async function restoreMessages(messageIds: string[]): Promise<ApiResult<void>> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('mail_inbox')
    .update({
      is_deleted: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', messageIds);

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: undefined, error: null };
}
