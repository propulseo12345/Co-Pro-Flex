'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as mailApi from '@/lib/mail/api';

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type {
  CampaignStatus,
  RecipientType,
  DeliveryStatus,
  MailTemplate,
  MailFolder,
  MailCampaign,
  MailRecipient,
  MailInbox,
} from '@/lib/mail/api';

// ============================================================================
// TEMPLATES HOOKS
// ============================================================================

export function useMailTemplates() {
  const { currentCoproId } = useCopro();
  const [templates, setTemplates] = useState<mailApi.MailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!currentCoproId) {
      setTemplates([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await mailApi.listTemplates(currentCoproId);

    if (result.error) {
      setError(result.error);
      setTemplates([]);
    } else {
      setTemplates(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Split system and custom templates
  const systemTemplates = useMemo(
    () => templates.filter((t) => t.is_system),
    [templates]
  );

  const customTemplates = useMemo(
    () => templates.filter((t) => !t.is_system),
    [templates]
  );

  return {
    templates,
    systemTemplates,
    customTemplates,
    isLoading,
    error,
    refresh: loadTemplates,
  };
}

// ============================================================================
// FOLDERS HOOKS
// ============================================================================

export function useMailFolders() {
  const [folders, setFolders] = useState<mailApi.MailFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await mailApi.listFolders();

    if (result.error) {
      setError(result.error);
      setFolders([]);
    } else {
      setFolders(result.data || []);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  // Split system and custom folders
  const systemFolders = useMemo(
    () => folders.filter((f) => f.is_system),
    [folders]
  );

  const customFolders = useMemo(
    () => folders.filter((f) => !f.is_system),
    [folders]
  );

  // Get folder by system type
  const getFolderByType = useCallback(
    (type: string) => folders.find((f) => f.system_type === type),
    [folders]
  );

  return {
    folders,
    systemFolders,
    customFolders,
    getFolderByType,
    isLoading,
    error,
    refresh: loadFolders,
  };
}

// ============================================================================
// CAMPAIGNS HOOKS
// ============================================================================

export interface CampaignFilters {
  search: string;
  status: mailApi.CampaignStatus | 'ALL';
}

const DEFAULT_CAMPAIGN_FILTERS: CampaignFilters = {
  search: '',
  status: 'ALL',
};

export function useMailCampaigns(initialFilters?: Partial<CampaignFilters>) {
  const { currentCoproId } = useCopro();
  const [campaigns, setCampaigns] = useState<mailApi.MailCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CampaignFilters>({
    ...DEFAULT_CAMPAIGN_FILTERS,
    ...initialFilters,
  });

  const loadCampaigns = useCallback(async () => {
    if (!currentCoproId) {
      setCampaigns([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await mailApi.listCampaigns(currentCoproId);

    if (result.error) {
      setError(result.error);
      setCampaigns([]);
    } else {
      setCampaigns(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          c.subject.toLowerCase().includes(search) ||
          c.preview?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Status filter
      if (filters.status !== 'ALL' && c.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [campaigns, filters]);

  // Stats
  const stats = useMemo(
    () => ({
      total: campaigns.length,
      draft: campaigns.filter((c) => c.status === 'draft').length,
      scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
      sent: campaigns.filter((c) => c.status === 'sent').length,
      failed: campaigns.filter((c) => c.status === 'failed').length,
    }),
    [campaigns]
  );

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status: mailApi.CampaignStatus | 'ALL') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_CAMPAIGN_FILTERS);
  }, []);

  return {
    campaigns,
    filteredCampaigns,
    isLoading,
    error,
    stats,
    filters,
    setSearch,
    setStatusFilter,
    resetFilters,
    refresh: loadCampaigns,
  };
}

export function useMailCampaign(campaignId: string | null) {
  const [campaign, setCampaign] = useState<mailApi.MailCampaign | null>(null);
  const [recipients, setRecipients] = useState<mailApi.MailRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    if (!campaignId) {
      setCampaign(null);
      setRecipients([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [campaignResult, recipientsResult] = await Promise.all([
        mailApi.getCampaign(campaignId),
        mailApi.getCampaignRecipients(campaignId),
      ]);

      if (campaignResult.error) {
        setError(campaignResult.error);
      } else {
        setCampaign(campaignResult.data);
      }

      if (!recipientsResult.error) {
        setRecipients(recipientsResult.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaign();
  }, [loadCampaign]);

  // Recipient stats
  const recipientStats = useMemo(() => {
    const total = recipients.length;
    return {
      total,
      pending: recipients.filter((r) => r.delivery_status === 'pending').length,
      sent: recipients.filter((r) => r.delivery_status === 'sent').length,
      delivered: recipients.filter((r) => r.delivery_status === 'delivered').length,
      opened: recipients.filter((r) => r.delivery_status === 'opened').length,
      clicked: recipients.filter((r) => r.delivery_status === 'clicked').length,
      bounced: recipients.filter((r) => r.delivery_status === 'bounced').length,
      failed: recipients.filter((r) => r.delivery_status === 'failed').length,
    };
  }, [recipients]);

  return {
    campaign,
    recipients,
    recipientStats,
    isLoading,
    error,
    refresh: loadCampaign,
  };
}

// ============================================================================
// INBOX HOOKS
// ============================================================================

export type InboxTab = 'inbox' | 'sent' | 'drafts' | 'archived' | 'trash';

export function useMailInbox(folderId?: string | null) {
  const { currentCoproId } = useCopro();
  const [messages, setMessages] = useState<mailApi.MailInbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadMessages = useCallback(async () => {
    if (!currentCoproId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await mailApi.listInbox(currentCoproId, folderId);

    if (result.error) {
      setError(result.error);
      setMessages([]);
    } else {
      setMessages(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId, folderId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Filter messages by search
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;

    const search = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.subject.toLowerCase().includes(search) ||
        m.from_name?.toLowerCase().includes(search) ||
        m.from_email.toLowerCase().includes(search) ||
        m.preview?.toLowerCase().includes(search)
    );
  }, [messages, searchQuery]);

  // Stats
  const stats = useMemo(
    () => ({
      total: messages.length,
      unread: messages.filter((m) => !m.is_read).length,
      starred: messages.filter((m) => m.is_starred).length,
    }),
    [messages]
  );

  return {
    messages,
    filteredMessages,
    isLoading,
    error,
    stats,
    searchQuery,
    setSearchQuery,
    refresh: loadMessages,
  };
}

export function useUnreadCount() {
  const { currentCoproId } = useCopro();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadCount = useCallback(async () => {
    if (!currentCoproId) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    const result = await mailApi.getUnreadCount(currentCoproId);

    if (!result.error) {
      setCount(result.data || 0);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  return { count, isLoading, refresh: loadCount };
}

// ============================================================================
// MUTATION HOOKS - TEMPLATES
// ============================================================================

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

export function useCreateTemplate() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<mailApi.CreateTemplatePayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await mailApi.createTemplate({
        ...payload,
        coproId: currentCoproId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useUpdateTemplate() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (
      templateId: string,
      updates: Parameters<typeof mailApi.updateTemplate>[1]
    ) => {
      setState({ isLoading: true, error: null });

      const result = await mailApi.updateTemplate(templateId, updates);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useDeleteTemplate() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (templateId: string) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.deleteTemplate(templateId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

// ============================================================================
// MUTATION HOOKS - FOLDERS
// ============================================================================

export function useCreateFolder() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<mailApi.CreateFolderPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await mailApi.createFolder({
        ...payload,
        coproId: currentCoproId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useUpdateFolder() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (
      folderId: string,
      updates: Parameters<typeof mailApi.updateFolder>[1]
    ) => {
      setState({ isLoading: true, error: null });

      const result = await mailApi.updateFolder(folderId, updates);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useDeleteFolder() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (folderId: string) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.deleteFolder(folderId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

// ============================================================================
// MUTATION HOOKS - CAMPAIGNS
// ============================================================================

export function useCreateCampaign() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<mailApi.CreateCampaignPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await mailApi.createCampaign({
        ...payload,
        coproId: currentCoproId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useUpdateCampaign() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (
      campaignId: string,
      updates: Parameters<typeof mailApi.updateCampaign>[1]
    ) => {
      setState({ isLoading: true, error: null });

      const result = await mailApi.updateCampaign(campaignId, updates);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useDeleteCampaign() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (campaignId: string) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.deleteCampaign(campaignId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useSendCampaign() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (campaignId: string) => {
    setState({ isLoading: true, error: null });

    // Generate recipients first
    const genResult = await mailApi.generateRecipients(campaignId);
    if (genResult.error) {
      setState({ isLoading: false, error: genResult.error });
      return genResult;
    }

    // Then send
    const sendResult = await mailApi.sendCampaign(campaignId);

    setState({ isLoading: false, error: sendResult.error });

    return sendResult;
  }, []);

  return { ...state, execute };
}

export function useCancelCampaign() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (campaignId: string) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.cancelCampaign(campaignId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

// ============================================================================
// MUTATION HOOKS - INBOX
// ============================================================================

export function useMarkAsRead() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[]) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.markAsRead(messageIds);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useMarkAsUnread() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[]) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.markAsUnread(messageIds);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useToggleStar() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageId: string) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.toggleStar(messageId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useMoveToFolder() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[], folderId: string | null) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.moveToFolder(messageIds, folderId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useArchiveMessages() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[]) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.archiveMessages(messageIds);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useDeleteMessages() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[]) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.deleteMessages(messageIds);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useRestoreMessages() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[]) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.restoreMessages(messageIds);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function usePermanentlyDeleteMessages() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (messageIds: string[]) => {
    setState({ isLoading: true, error: null });

    const result = await mailApi.permanentlyDeleteMessages(messageIds);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}
