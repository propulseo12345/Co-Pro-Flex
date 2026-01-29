'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';

export interface ConversationOverview {
  id: string;
  copro_id: string;
  subject: string | null;
  is_group: boolean;
  last_message_at: string | null;
  last_message_preview: string | null;
  my_unread_count: number;
  my_last_read_at: string | null;
  other_members: Array<{
    user_id: string;
    name: string | null;
    avatar: string | null;
  }> | null;
  created_at: string;
}

export function useConversationsPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [conversations, setConversations] = useState<ConversationOverview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations from Supabase
  const fetchConversations = useCallback(async () => {
    if (!currentCoproId) {
      setConversations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('v_conversations_overview')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (fetchError) {
        console.error('Error fetching conversations:', fetchError);
        setError('Erreur lors du chargement des conversations');
        setConversations([]);
      } else {
        setConversations((data || []) as ConversationOverview[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to realtime updates on messages
  useEffect(() => {
    if (!currentCoproId) return;

    const supabase = createClient();

    const subscription = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `copro_id=eq.${currentCoproId}`,
        },
        () => {
          // Refetch conversations when messages change
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentCoproId, fetchConversations]);

  // Total unread count
  const totalUnread = useMemo(() => {
    return conversations.reduce((sum, c) => sum + (c.my_unread_count || 0), 0);
  }, [conversations]);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      // Search in subject
      if (conv.subject?.toLowerCase().includes(query)) return true;
      // Search in participant names
      if (conv.other_members?.some((m) => m.name?.toLowerCase().includes(query))) return true;
      // Search in last message preview
      if (conv.last_message_preview?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [conversations, searchQuery]);

  // Get display name for a conversation
  const getConversationDisplayName = useCallback((conv: ConversationOverview) => {
    if (conv.is_group && conv.subject) {
      return conv.subject;
    }
    if (conv.other_members && conv.other_members.length > 0) {
      return conv.other_members.map((m) => m.name || 'Utilisateur').join(', ');
    }
    return 'Conversation';
  }, []);

  // Format date for display
  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    }
  }, []);

  // Navigate to conversation
  const openConversation = useCallback((conversationId: string) => {
    router.push(`/social/messages/${conversationId}`);
  }, [router]);

  // Navigate to new conversation
  const createNewConversation = useCallback(() => {
    router.push('/social/messages/new');
  }, [router]);

  return {
    conversations: filteredConversations,
    allConversations: conversations,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    totalUnread,
    getConversationDisplayName,
    formatDate,
    openConversation,
    createNewConversation,
    refetch: fetchConversations,
  };
}
