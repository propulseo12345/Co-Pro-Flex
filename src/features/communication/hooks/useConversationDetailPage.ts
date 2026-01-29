'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';

export interface ConversationMessage {
  id: string;
  conversation_id: string | null;
  copro_id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_avatar: string | null;
  content: string | null;
  attachment_id: string | null;
  is_mine: boolean | null;
  created_at: string | null;
  edited_at: string | null;
}

export interface ConversationDetails {
  id: string;
  copro_id: string;
  subject: string | null;
  is_group: boolean;
  last_message_at: string | null;
  other_members: Array<{
    user_id: string;
    name: string | null;
    avatar: string | null;
  }> | null;
  my_unread_count: number;
  created_at: string;
}

export interface ConversationMember {
  user_id: string;
  user_name: string | null;
  is_admin: boolean;
}

export function useConversationDetailPage(conversationId: string) {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversation details
  const fetchConversation = useCallback(async () => {
    if (!currentCoproId || !conversationId) return;

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('v_conversations_overview')
        .select('*')
        .eq('id', conversationId)
        .eq('copro_id', currentCoproId)
        .single();

      if (fetchError) {
        console.error('Error fetching conversation:', fetchError);
        setError('Conversation non trouvée');
        return;
      }

      setConversation(data as ConversationDetails);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
    }
  }, [currentCoproId, conversationId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!currentCoproId || !conversationId) return;

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('v_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching messages:', fetchError);
        return;
      }

      setMessages((data || []) as ConversationMessage[]);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, [currentCoproId, conversationId]);

  // Fetch members
  const fetchMembers = useCallback(async () => {
    if (!currentCoproId || !conversationId) return;

    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('conversation_members')
        .select(`
          user_id,
          is_admin,
          profiles:user_id (full_name)
        `)
        .eq('conversation_id', conversationId)
        .is('left_at', null);

      if (fetchError) {
        console.error('Error fetching members:', fetchError);
        return;
      }

      const mappedMembers = (data || []).map((m: Record<string, unknown>) => ({
        user_id: m.user_id as string,
        user_name: (m.profiles as { full_name: string } | null)?.full_name || null,
        is_admin: m.is_admin as boolean,
      }));

      setMembers(mappedMembers);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, [currentCoproId, conversationId]);

  // Mark conversation as read
  const markAsRead = useCallback(async () => {
    if (!conversationId) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update last_read_at and reset unread_count
      await supabase
        .from('conversation_members')
        .update({
          last_read_at: new Date().toISOString(),
          unread_count: 0,
        })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchConversation(), fetchMessages(), fetchMembers()]);
      setIsLoading(false);
      // Mark as read after loading
      await markAsRead();
    };

    loadData();
  }, [fetchConversation, fetchMessages, fetchMembers, markAsRead]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!currentCoproId || !conversationId) return;

    const supabase = createClient();

    const subscription = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          // Refetch messages on new message
          await fetchMessages();
          // Mark as read
          await markAsRead();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentCoproId, conversationId, fetchMessages, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentCoproId || !conversationId) return;

    setIsSending(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        setIsSending(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          copro_id: currentCoproId,
          conversation_id: conversationId,
          author_id: user.id,
          content: newMessage.trim(),
        });

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Erreur lors de l\'envoi');
      } else {
        setNewMessage('');
        // Refetch messages
        await fetchMessages();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
    } finally {
      setIsSending(false);
    }
  }, [newMessage, currentCoproId, conversationId, fetchMessages]);

  // Get display name for conversation
  const getConversationDisplayName = useCallback(() => {
    if (!conversation) return 'Conversation';
    if (conversation.is_group && conversation.subject) {
      return conversation.subject;
    }
    if (conversation.other_members && conversation.other_members.length > 0) {
      return conversation.other_members.map((m) => m.name || 'Utilisateur').join(', ');
    }
    return 'Conversation';
  }, [conversation]);

  // Format date
  const formatMessageDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }, []);

  // Go back
  const goBack = useCallback(() => {
    router.push('/social/messages');
  }, [router]);

  return {
    conversation,
    messages,
    members,
    newMessage,
    setNewMessage,
    isLoading,
    isSending,
    error,
    messagesEndRef,
    getConversationDisplayName,
    formatMessageDate,
    sendMessage,
    goBack,
    refetch: fetchMessages,
  };
}
