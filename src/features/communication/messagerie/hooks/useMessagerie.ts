'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import type {
  IConversation,
  IConversationPreview,
  IMessage,
  ConversationFilter,
  ConversationType,
  UserRole,
} from '@/features/communication/messagerie/domain/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ID utilisateur courant (syndic) — remplacé par auth.uid() quand l'auth sera active
const CURRENT_USER_ID = 'f76855bb-62c3-4040-8fc6-7586080be9fb';
const CURRENT_USER_NAME = 'Admin CoProFlex';

// ----------------------------------------------------------------------------
// Types du hook
// ----------------------------------------------------------------------------

export interface UseMessagerieReturn {
  conversations: IConversationPreview[];
  activeConversation: IConversation | null;
  messages: IMessage[];
  searchTerm: string;
  filter: ConversationFilter;
  isLoading: boolean;
  totalUnread: number;
  currentUserId: string;
  selectConversation: (id: string) => void;
  setSearchTerm: (term: string) => void;
  setFilter: (filter: ConversationFilter) => void;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
}

// ----------------------------------------------------------------------------
// Mappers
// ----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversationPreview(row: any): IConversationPreview {
  return {
    id: row.id,
    type: (row.is_group ? 'group' : 'direct') as ConversationType,
    title: row.subject ?? 'Conversation',
    avatar: null,
    lastMessage: row.last_message_preview ?? '',
    lastMessageAt: row.last_message_at ?? row.created_at,
    lastSenderName: '',
    unreadCount: row.unread_count ?? 0,
    memberCount: 2,
    isArchived: row.is_archived ?? false,
    isMuted: false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapConversationFull(row: any, members: any[], msgs: IMessage[]): IConversation {
  return {
    id: row.id,
    coproprieteId: row.copro_id,
    type: (row.is_group ? 'group' : 'direct') as ConversationType,
    title: row.subject ?? null,
    avatar: null,
    isArchived: row.is_archived ?? false,
    isMuted: false,
    lastMessageAt: row.last_message_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    members: members.map((m) => ({
      id: m.id,
      conversationId: m.conversation_id,
      userId: m.user_id,
      userName: m.user_name ?? 'Membre',
      userRole: (m.user_role ?? 'copro') as UserRole,
      isAdmin: m.is_admin,
      lastReadAt: m.last_read_at ?? null,
      joinedAt: m.joined_at,
    })),
    messages: msgs,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(row: any): IMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.author_id,
    senderName: row.sender_name ?? 'Inconnu',
    senderRole: 'copro' as UserRole,
    type: (row.message_type ?? 'text') as IMessage['type'],
    content: row.content,
    attachments: row.attachments ?? [],
    isEdited: row.is_edited ?? false,
    isDeleted: false,
    replyToId: row.reply_to_id ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.created_at,
  };
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useMessagerie(): UseMessagerieReturn {
  const { currentCoproId } = useCopro();
  const supabase = useMemo(() => createUntypedClient(), []);

  const [previews, setPreviews] = useState<IConversationPreview[]>([]);
  const [activeConversation, setActiveConversation] = useState<IConversation | null>(null);
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [isLoading, setIsLoading] = useState(false);

  const activeIdRef = useRef<string | null>(null);
  const fetchConvsRef = useRef<(() => Promise<void>) | null>(null);
  const fetchMsgsRef = useRef<((id: string) => Promise<void>) | null>(null);

  // ── Charger la liste des conversations ─────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    if (!currentCoproId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!error && data) {
        setPreviews(data.map(mapConversationPreview));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  fetchConvsRef.current = fetchConversations;

  useEffect(() => {
    fetchConvsRef.current?.();
  }, [currentCoproId]);

  // ── Charger les messages d'une conversation ────────────────────────────────

  const fetchMessages = useCallback(async (conversationId: string) => {
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    const { data: members } = await supabase
      .from('conversation_members')
      .select('*')
      .eq('conversation_id', conversationId);

    const { data: msgs, error: msgsErr } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (!convErr && !msgsErr && conv) {
      const mappedMsgs = (msgs ?? []).map(mapMessage);
      setMessages(mappedMsgs);
      setActiveConversation(mapConversationFull(conv, members ?? [], mappedMsgs));
    }
  }, [supabase]);

  fetchMsgsRef.current = fetchMessages;

  // ── Realtime sur les messages de la conversation active ────────────────────

  useEffect(() => {
    const convId = activeIdRef.current;
    if (!convId) return;

    const channel = supabase
      .channel(`messages-${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        (payload: { new: unknown }) => {
          const newMsg = mapMessage(payload.new);
          setMessages((prev) => [...prev, newMsg]);
          setActiveConversation((prev) =>
            prev ? { ...prev, messages: [...prev.messages, newMsg] } : prev
          );
          // Mettre à jour le preview dans la liste
          setPreviews((prev) =>
            prev.map((p) =>
              p.id === convId
                ? {
                    ...p,
                    lastMessage: newMsg.content,
                    lastMessageAt: newMsg.createdAt,
                    lastSenderName: newMsg.senderName,
                  }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversation?.id, supabase]);

  // ── Conversations filtrées ─────────────────────────────────────────────────

  const conversations = useMemo(() => {
    let list = previews;

    if (filter === 'unread') {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filter === 'archived') {
      list = list.filter((c) => c.isArchived);
    } else if (filter === 'direct' || filter === 'group' || filter === 'prestataire') {
      list = list.filter((c) => c.type === filter);
    } else {
      list = list.filter((c) => !c.isArchived);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.lastMessage.toLowerCase().includes(term)
      );
    }

    return list;
  }, [previews, filter, searchTerm]);

  const totalUnread = useMemo(
    () => previews.reduce((sum, c) => sum + c.unreadCount, 0),
    [previews]
  );

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectConversation = useCallback(
    (id: string) => {
      activeIdRef.current = id;
      setPreviews((prev) => prev.map((p) => (p.id === id ? { ...p, unreadCount: 0 } : p)));
      fetchMsgsRef.current?.(id);
    },
    []
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const convId = activeIdRef.current;
      if (!convId || !content.trim() || !currentCoproId) return;

      const now = new Date().toISOString();

      // Optimistic update
      const optimisticMsg: IMessage = {
        id: `optimistic-${Date.now()}`,
        conversationId: convId,
        senderId: CURRENT_USER_ID,
        senderName: CURRENT_USER_NAME,
        senderRole: 'syndic',
        type: 'text',
        content: content.trim(),
        attachments: [],
        isEdited: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      const { data, error } = await supabase.from('messages').insert({
        copro_id: currentCoproId,
        conversation_id: convId,
        author_id: CURRENT_USER_ID,
        sender_name: CURRENT_USER_NAME,
        content: content.trim(),
        message_type: 'text',
        attachments: null,
        reply_to_id: null,
        is_edited: false,
        read_by: [CURRENT_USER_ID],
        attachment_id: null,
      }).select().single();

      if (!error && data) {
        // Remplacer l'optimistic par le vrai message
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMsg.id ? mapMessage(data) : m))
        );
      }

      // Mettre à jour le dernier message dans la conversation
      await supabase
        .from('conversations')
        .update({
          last_message_at: now,
          last_message_preview: content.trim().slice(0, 100),
        })
        .eq('id', convId);

      setPreviews((prev) =>
        prev.map((p) =>
          p.id === convId
            ? { ...p, lastMessage: content.trim(), lastMessageAt: now, lastSenderName: CURRENT_USER_NAME }
            : p
        )
      );
    },
    [currentCoproId, supabase]
  );

  const markAsRead = useCallback((conversationId: string) => {
    setPreviews((prev) =>
      prev.map((p) => (p.id === conversationId ? { ...p, unreadCount: 0 } : p))
    );
  }, []);

  const archiveConversation = useCallback(
    async (conversationId: string) => {
      setPreviews((prev) =>
        prev.map((p) => (p.id === conversationId ? { ...p, isArchived: true } : p))
      );
      if (activeIdRef.current === conversationId) {
        activeIdRef.current = null;
        setActiveConversation(null);
        setMessages([]);
      }
      await supabase
        .from('conversations')
        .update({ is_archived: true })
        .eq('id', conversationId);
    },
    [supabase]
  );

  return {
    conversations,
    activeConversation,
    messages,
    searchTerm,
    filter,
    isLoading,
    totalUnread,
    currentUserId: CURRENT_USER_ID,
    selectConversation,
    setSearchTerm,
    setFilter,
    sendMessage,
    markAsRead,
    archiveConversation,
  };
}
