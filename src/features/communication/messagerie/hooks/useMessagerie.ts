'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  IConversation,
  IConversationPreview,
  IMessage,
  ConversationFilter,
} from '@/features/communication/messagerie/domain/types';
import {
  MOCK_CONVERSATIONS,
  MOCK_CONVERSATION_PREVIEWS,
} from '@/features/communication/messagerie/domain/mock-data';

// ----------------------------------------------------------------------------
// Current user (syndic) — will come from auth context later
// ----------------------------------------------------------------------------

const CURRENT_USER_ID = 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const CURRENT_USER_NAME = 'Marie Laurent';

// ----------------------------------------------------------------------------
// Hook
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
  sendMessage: (content: string) => void;
  markAsRead: (conversationId: string) => void;
  archiveConversation: (conversationId: string) => void;
}

export function useMessagerie(): UseMessagerieReturn {
  const [allConversations, setAllConversations] = useState<IConversation[]>(MOCK_CONVERSATIONS);
  const [previews, setPreviews] = useState<IConversationPreview[]>(MOCK_CONVERSATION_PREVIEWS);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<ConversationFilter>('all');
  const [isLoading] = useState(false);

  // -- Derived: active conversation + messages --
  const activeConversation = useMemo(
    () => allConversations.find((c) => c.id === activeConversationId) ?? null,
    [allConversations, activeConversationId],
  );

  const messages = useMemo(
    () => activeConversation?.messages ?? [],
    [activeConversation],
  );

  // -- Derived: filtered conversations --
  const conversations = useMemo(() => {
    let list = previews;

    // Filter by type / status
    if (filter === 'unread') {
      list = list.filter((c) => c.unreadCount > 0);
    } else if (filter === 'archived') {
      list = list.filter((c) => c.isArchived);
    } else if (filter === 'direct' || filter === 'group' || filter === 'prestataire') {
      list = list.filter((c) => c.type === filter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          c.lastMessage.toLowerCase().includes(term),
      );
    }

    return list;
  }, [previews, filter, searchTerm]);

  // -- Derived: total unread --
  const totalUnread = useMemo(
    () => previews.reduce((sum, c) => sum + c.unreadCount, 0),
    [previews],
  );

  // -- Actions --

  const selectConversation = useCallback(
    (id: string) => {
      setActiveConversationId(id);
      // Mark as read
      setPreviews((prev) =>
        prev.map((p) => (p.id === id ? { ...p, unreadCount: 0 } : p)),
      );
    },
    [],
  );

  const sendMessage = useCallback(
    (content: string) => {
      if (!activeConversationId || !content.trim()) return;

      const now = new Date().toISOString();
      const newMessage: IMessage = {
        id: `msg-new-${Date.now()}`,
        conversationId: activeConversationId,
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

      // Add message to conversation
      setAllConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: [...c.messages, newMessage], lastMessageAt: now, updatedAt: now }
            : c,
        ),
      );

      // Update preview
      setPreviews((prev) =>
        prev.map((p) =>
          p.id === activeConversationId
            ? { ...p, lastMessage: content.trim(), lastMessageAt: now, lastSenderName: CURRENT_USER_NAME }
            : p,
        ),
      );
    },
    [activeConversationId],
  );

  const markAsRead = useCallback((conversationId: string) => {
    setPreviews((prev) =>
      prev.map((p) => (p.id === conversationId ? { ...p, unreadCount: 0 } : p)),
    );
  }, []);

  const archiveConversation = useCallback((conversationId: string) => {
    setAllConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, isArchived: true } : c)),
    );
    setPreviews((prev) =>
      prev.map((p) => (p.id === conversationId ? { ...p, isArchived: true } : p)),
    );
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

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
