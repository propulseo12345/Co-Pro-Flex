/**
 * Service de gestion des mails - Version Supabase
 * Remplace progressivement mail.service.ts
 */

import { createClient } from '@/lib/supabase/client';
import type {
  Mail,
  MailStatut,
  PieceJointeMail,
  BrouillonData,
  MailOnglet,
  MailFiltres,
} from '@/types/models/mail';

// ========================================
// TYPES SUPABASE
// ========================================

export interface MailCampaignRow {
  id: string;
  copro_id: string;
  subject: string;
  body: string;
  preview_text: string | null;
  template_id: string | null;
  recipient_type: 'all' | 'council' | 'by_building' | 'by_floor' | 'custom';
  recipient_filter: Record<string, unknown> | null;
  attachment_ids: string[] | null;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  bounced_count: number;
  failed_count: number;
  folder_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MailInboxRow {
  id: string;
  copro_id: string;
  original_campaign_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  body: string;
  body_html: string | null;
  attachment_ids: string[] | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  is_deleted: boolean;
  folder_id: string | null;
  owner_id: string;
  received_at: string;
  created_at: string;
}

// ========================================
// HELPERS
// ========================================

function mapCampaignToMail(row: MailCampaignRow, userId: string): Mail {
  const statusMap: Record<string, MailStatut> = {
    draft: 'draft',
    scheduled: 'draft',
    sending: 'sent',
    sent: 'sent',
    failed: 'sent',
    cancelled: 'deleted',
  };

  return {
    id: row.id,
    coproprieteId: row.copro_id,
    subject: row.subject,
    body: row.body,
    preview: row.preview_text || row.body.substring(0, 100),
    sender: { id: row.created_by, nom: 'Syndic', type: 'syndic' },
    recipients: [{ id: 'all', nom: 'Destinataires', type: 'groupe' }],
    recipientType: row.recipient_type === 'all' ? 'all' : row.recipient_type === 'council' ? 'group' : 'individual',
    piecesJointes: [],
    statut: statusMap[row.status] || 'sent',
    isRead: true,
    hasAttachment: (row.attachment_ids?.length || 0) > 0,
    dateCreation: row.created_at,
    dateEnvoi: row.sent_at || undefined,
    stats: {
      sent: row.sent_count,
      opened: row.opened_count,
      received: row.delivered_count,
    },
  };
}

function mapInboxToMail(row: MailInboxRow): Mail {
  let statut: MailStatut = 'received';
  if (row.is_deleted) statut = 'deleted';
  else if (row.is_archived) statut = 'received'; // Keep as received for now

  return {
    id: row.id,
    coproprieteId: row.copro_id,
    subject: row.subject,
    body: row.body,
    preview: row.body.substring(0, 100),
    sender: { id: 'external', nom: row.from_name || row.from_email, type: 'coproprietaire', email: row.from_email },
    recipients: [{ id: row.owner_id, nom: 'Syndic', type: 'syndic' }],
    recipientType: 'individual',
    piecesJointes: [],
    statut,
    isRead: row.is_read,
    hasAttachment: (row.attachment_ids?.length || 0) > 0,
    dateCreation: row.received_at,
  };
}

// ========================================
// SERVICE CLASS
// ========================================

class MailSupabaseService {
  private supabase = createClient();

  // ----------------------------------------
  // LECTURE
  // ----------------------------------------

  async getMails(coproId: string, filtres?: MailFiltres): Promise<Mail[]> {
    // Mode développement: pas de vérification auth/owner_id (RLS désactivé)
    const mails: Mail[] = [];
    const onglet = filtres?.onglet || 'inbox';

    if (onglet === 'inbox') {
      const { data: inboxData } = await this.supabase
        .from('mail_inbox')
        .select('*')
        .eq('copro_id', coproId)
        .eq('is_deleted', false)
        .eq('is_archived', false)
        .order('received_at', { ascending: false });

      if (inboxData) {
        mails.push(...inboxData.map(row => mapInboxToMail(row as MailInboxRow)));
      }
    } else if (onglet === 'sent') {
      const { data: sentData } = await this.supabase
        .from('mail_campaigns')
        .select('*')
        .eq('copro_id', coproId)
        .in('status', ['sent', 'sending'])
        .order('created_at', { ascending: false });

      if (sentData) {
        mails.push(...sentData.map(row => mapCampaignToMail(row as MailCampaignRow, 'dev-user')));
      }
    } else if (onglet === 'drafts') {
      const { data: draftsData } = await this.supabase
        .from('mail_campaigns')
        .select('*')
        .eq('copro_id', coproId)
        .eq('status', 'draft')
        .order('created_at', { ascending: false });

      if (draftsData) {
        mails.push(...draftsData.map(row => mapCampaignToMail(row as MailCampaignRow, 'dev-user')));
      }
    } else if (onglet === 'trash') {
      const { data: trashInbox } = await this.supabase
        .from('mail_inbox')
        .select('*')
        .eq('copro_id', coproId)
        .eq('is_deleted', true)
        .order('received_at', { ascending: false });

      if (trashInbox) {
        mails.push(...trashInbox.map(row => mapInboxToMail(row as MailInboxRow)));
      }

      const { data: trashCampaigns } = await this.supabase
        .from('mail_campaigns')
        .select('*')
        .eq('copro_id', coproId)
        .eq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (trashCampaigns) {
        mails.push(...trashCampaigns.map(row => mapCampaignToMail(row as MailCampaignRow, 'dev-user')));
      }
    } else if (onglet === 'archived') {
      const { data: archivedData } = await this.supabase
        .from('mail_inbox')
        .select('*')
        .eq('copro_id', coproId)
        .eq('is_archived', true)
        .order('received_at', { ascending: false });

      if (archivedData) {
        mails.push(...archivedData.map(row => mapInboxToMail(row as MailInboxRow)));
      }
    }

    // Apply search filter
    if (filtres?.recherche) {
      const recherche = filtres.recherche.toLowerCase();
      return mails.filter(
        m =>
          m.subject.toLowerCase().includes(recherche) ||
          m.preview?.toLowerCase().includes(recherche) ||
          m.sender?.nom.toLowerCase().includes(recherche)
      );
    }

    return mails;
  }

  async getMailById(id: string): Promise<Mail | null> {
    // Mode développement: pas de vérification auth (RLS désactivé)

    // Try inbox first
    const { data: inboxData } = await this.supabase
      .from('mail_inbox')
      .select('*')
      .eq('id', id)
      .single();

    if (inboxData) {
      return mapInboxToMail(inboxData as MailInboxRow);
    }

    // Try campaigns
    const { data: campaignData } = await this.supabase
      .from('mail_campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (campaignData) {
      return mapCampaignToMail(campaignData as MailCampaignRow, 'dev-user');
    }

    return null;
  }

  // ----------------------------------------
  // CREATION / UPDATE
  // ----------------------------------------

  async createDraft(coproId: string, brouillon: BrouillonData): Promise<Mail | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const recipientTypeMap: Record<string, 'all' | 'council' | 'by_building' | 'by_floor' | 'custom'> = {
      all: 'all',
      group: 'council',
      individual: 'custom',
    };

    const { data, error } = await this.supabase
      .from('mail_campaigns')
      .insert({
        copro_id: coproId,
        subject: brouillon.subject,
        body: brouillon.body,
        preview_text: brouillon.body.substring(0, 100),
        recipient_type: recipientTypeMap[brouillon.recipientType] || 'all',
        status: 'draft',
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Error creating draft:', error);
      return null;
    }

    return mapCampaignToMail(data as MailCampaignRow, user.id);
  }

  async updateDraft(id: string, updates: Partial<BrouillonData>): Promise<Mail | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const updateData: Record<string, unknown> = {};
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.body !== undefined) {
      updateData.body = updates.body;
      updateData.preview_text = updates.body.substring(0, 100);
    }

    const { data, error } = await this.supabase
      .from('mail_campaigns')
      .update(updateData)
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating draft:', error);
      return null;
    }

    return mapCampaignToMail(data as MailCampaignRow, user.id);
  }

  // ----------------------------------------
  // ENVOI
  // ----------------------------------------

  async sendMail(id: string): Promise<Mail | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('mail_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'draft')
      .select()
      .single();

    if (error || !data) {
      console.error('Error sending mail:', error);
      return null;
    }

    return mapCampaignToMail(data as MailCampaignRow, user.id);
  }

  // ----------------------------------------
  // SUPPRESSION
  // ----------------------------------------

  async moveToTrash(id: string): Promise<boolean> {
    // Try inbox first
    const { error: inboxError } = await this.supabase
      .from('mail_inbox')
      .update({ is_deleted: true })
      .eq('id', id);

    if (!inboxError) return true;

    // Try campaigns (cancel)
    const { error: campaignError } = await this.supabase
      .from('mail_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id);

    return !campaignError;
  }

  async restore(id: string): Promise<boolean> {
    // Try inbox first
    const { error: inboxError } = await this.supabase
      .from('mail_inbox')
      .update({ is_deleted: false })
      .eq('id', id);

    if (!inboxError) return true;

    // Try campaigns (restore to draft)
    const { error: campaignError } = await this.supabase
      .from('mail_campaigns')
      .update({ status: 'draft' })
      .eq('id', id)
      .eq('status', 'cancelled');

    return !campaignError;
  }

  async permanentDelete(id: string): Promise<boolean> {
    // Try inbox first
    const { error: inboxError } = await this.supabase
      .from('mail_inbox')
      .delete()
      .eq('id', id)
      .eq('is_deleted', true);

    if (!inboxError) return true;

    // Try campaigns
    const { error: campaignError } = await this.supabase
      .from('mail_campaigns')
      .delete()
      .eq('id', id)
      .eq('status', 'cancelled');

    return !campaignError;
  }

  // ----------------------------------------
  // LECTURE (MARK AS READ)
  // ----------------------------------------

  async markAsRead(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('mail_inbox')
      .update({ is_read: true })
      .eq('id', id);

    return !error;
  }

  async markAsUnread(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('mail_inbox')
      .update({ is_read: false })
      .eq('id', id);

    return !error;
  }

  // ----------------------------------------
  // STATISTIQUES
  // ----------------------------------------

  async getStats(coproId: string): Promise<{
    inbox: number;
    inboxNonLus: number;
    sent: number;
    drafts: number;
    trash: number;
  }> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return { inbox: 0, inboxNonLus: 0, sent: 0, drafts: 0, trash: 0 };

    // Count inbox
    const { count: inboxCount } = await this.supabase
      .from('mail_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('copro_id', coproId)
      .eq('owner_id', user.id)
      .eq('is_deleted', false)
      .eq('is_archived', false);

    // Count unread
    const { count: unreadCount } = await this.supabase
      .from('mail_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('copro_id', coproId)
      .eq('owner_id', user.id)
      .eq('is_deleted', false)
      .eq('is_read', false);

    // Count sent campaigns
    const { count: sentCount } = await this.supabase
      .from('mail_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('copro_id', coproId)
      .in('status', ['sent', 'sending']);

    // Count drafts
    const { count: draftsCount } = await this.supabase
      .from('mail_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('copro_id', coproId)
      .eq('status', 'draft');

    // Count trash
    const { count: trashInboxCount } = await this.supabase
      .from('mail_inbox')
      .select('*', { count: 'exact', head: true })
      .eq('copro_id', coproId)
      .eq('owner_id', user.id)
      .eq('is_deleted', true);

    const { count: trashCampaignCount } = await this.supabase
      .from('mail_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('copro_id', coproId)
      .eq('status', 'cancelled');

    return {
      inbox: inboxCount || 0,
      inboxNonLus: unreadCount || 0,
      sent: sentCount || 0,
      drafts: draftsCount || 0,
      trash: (trashInboxCount || 0) + (trashCampaignCount || 0),
    };
  }
}

// Export singleton
export const mailSupabaseService = new MailSupabaseService();
