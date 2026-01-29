'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';

// Helper for untyped queries (tables not in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;
import type { ForumTopic, ForumCategory } from './useForumPage';
import { FORUM_CATEGORIES } from './useForumPage';

export interface ForumMessage {
  id: string;
  copro_id: string;
  topic_id: string;
  content: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  reply_to_id: string | null;
  reply_to_author_name: string | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForumTopicDetail extends ForumTopic {
  content: string;
}

export function useForumDetailPage(topicId: string) {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [topic, setTopic] = useState<ForumTopicDetail | null>(null);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch topic details
  const fetchTopic = useCallback(async () => {
    if (!currentCoproId || !topicId) return;

    try {
      const supabase = createUntypedClient();

      // Get topic with full content
      const { data: topicData, error: topicError } = await supabase
        .from('forum_topics')
        .select(`
          *,
          profiles:author_id (full_name, avatar_url)
        `)
        .eq('id', topicId)
        .eq('copro_id', currentCoproId)
        .single();

      if (topicError) {
        console.error('Error fetching topic:', topicError);
        setError('Sujet non trouvé');
        return;
      }

      // Map to ForumTopicDetail
      const mappedTopic: ForumTopicDetail = {
        id: topicData.id,
        copro_id: topicData.copro_id,
        title: topicData.title,
        content: topicData.content,
        preview: topicData.content.substring(0, 200),
        category: topicData.category as ForumCategory,
        author_id: topicData.author_id,
        author_name: (topicData.profiles as { full_name: string } | null)?.full_name || null,
        author_avatar: (topicData.profiles as { avatar_url: string } | null)?.avatar_url || null,
        status: topicData.status,
        is_pinned: topicData.is_pinned,
        pinned_at: topicData.pinned_at,
        pinned_by_name: null,
        replies_count: topicData.replies_count,
        views_count: topicData.views_count,
        last_reply_at: topicData.last_reply_at,
        last_reply_by_name: null,
        created_at: topicData.created_at,
        updated_at: topicData.updated_at,
      };

      setTopic(mappedTopic);

      // Increment view count
      await supabase
        .from('forum_topics')
        .update({ views_count: topicData.views_count + 1 })
        .eq('id', topicId);

    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
    }
  }, [currentCoproId, topicId]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!currentCoproId || !topicId) return;

    try {
      const supabase = createUntypedClient();

      const { data, error: fetchError } = await supabase
        .from('v_forum_messages_detail')
        .select('*')
        .eq('topic_id', topicId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('Error fetching messages:', fetchError);
        return;
      }

      setMessages((data || []) as ForumMessage[]);
    } catch (err) {
      console.error('Unexpected error:', err);
    }
  }, [currentCoproId, topicId]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchTopic(), fetchMessages()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchTopic, fetchMessages]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!currentCoproId || !topicId) return;

    const supabase = createClient();

    const subscription = supabase
      .channel(`forum-messages-${topicId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'forum_messages',
          filter: `topic_id=eq.${topicId}`,
        },
        () => {
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentCoproId, topicId, fetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !currentCoproId || !topicId) return;

    setIsSending(true);

    try {
      const supabase = createUntypedClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        setIsSending(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('forum_messages')
        .insert({
          copro_id: currentCoproId,
          topic_id: topicId,
          author_id: user.id,
          content: newMessage.trim(),
        });

      if (insertError) {
        console.error('Error sending message:', insertError);
        setError('Erreur lors de l\'envoi');
      } else {
        setNewMessage('');
        await fetchMessages();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
    } finally {
      setIsSending(false);
    }
  }, [newMessage, currentCoproId, topicId, fetchMessages]);

  // Get category info
  const getCategoryInfo = useCallback((category: ForumCategory) => {
    return FORUM_CATEGORIES.find((c) => c.id === category) || FORUM_CATEGORIES[0];
  }, []);

  // Format date
  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  // Go back
  const goBack = useCallback(() => {
    router.push('/social/forum');
  }, [router]);

  return {
    topic,
    messages,
    newMessage,
    setNewMessage,
    isLoading,
    isSending,
    error,
    messagesEndRef,
    getCategoryInfo,
    formatDate,
    sendMessage,
    goBack,
    refetch: fetchMessages,
  };
}
