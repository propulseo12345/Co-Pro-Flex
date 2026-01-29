'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';

// Helper for untyped queries (tables not in generated types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export type ForumCategory = 'general' | 'travaux' | 'voisinage' | 'juridique' | 'autre';
export type ForumTopicStatus = 'open' | 'closed' | 'archived';

export interface ForumTopic {
  id: string;
  copro_id: string;
  title: string;
  preview: string | null;
  category: ForumCategory;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  status: ForumTopicStatus;
  is_pinned: boolean;
  pinned_at: string | null;
  pinned_by_name: string | null;
  replies_count: number;
  views_count: number;
  last_reply_at: string | null;
  last_reply_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export const FORUM_CATEGORIES: { id: ForumCategory; label: string; color: string }[] = [
  { id: 'general', label: 'Général', color: '#6b7280' },
  { id: 'travaux', label: 'Travaux', color: '#f59e0b' },
  { id: 'voisinage', label: 'Voisinage', color: '#10b981' },
  { id: 'juridique', label: 'Juridique', color: '#8b5cf6' },
  { id: 'autre', label: 'Autre', color: '#3b82f6' },
];

export function useForumPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch topics from Supabase
  const fetchTopics = useCallback(async () => {
    if (!currentCoproId) {
      setTopics([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      let query = supabase
        .from('v_forum_topics_overview')
        .select('*')
        .eq('copro_id', currentCoproId)
        .neq('status', 'archived');

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error('Error fetching forum topics:', fetchError);
        setError('Erreur lors du chargement des sujets');
        setTopics([]);
      } else {
        setTopics((data || []) as ForumTopic[]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
      setTopics([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, selectedCategory]);

  // Initial fetch
  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  // Filtered topics by search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return topics;

    const query = searchQuery.toLowerCase();
    return topics.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.preview?.toLowerCase().includes(query) ||
        t.author_name?.toLowerCase().includes(query)
    );
  }, [topics, searchQuery]);

  // Pinned topics first
  const sortedTopics = useMemo(() => {
    return [...filteredTopics].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return 0;
    });
  }, [filteredTopics]);

  // Get category info
  const getCategoryInfo = useCallback((category: ForumCategory) => {
    return FORUM_CATEGORIES.find((c) => c.id === category) || FORUM_CATEGORIES[0];
  }, []);

  // Format date
  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Aujourd\'hui ' + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Hier';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  }, []);

  // Navigate to topic
  const openTopic = useCallback((topicId: string) => {
    router.push(`/social/forum/${topicId}`);
  }, [router]);

  // Navigate to create new topic
  const createNewTopic = useCallback(() => {
    router.push('/social/forum/new');
  }, [router]);

  return {
    topics: sortedTopics,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    categories: FORUM_CATEGORIES,
    getCategoryInfo,
    formatDate,
    openTopic,
    createNewTopic,
    refetch: fetchTopics,
  };
}
