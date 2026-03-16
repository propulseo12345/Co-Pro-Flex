'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { Publication, PublicationDraft, RoleBadge } from '../types';
import { WALL_CATEGORY_MAP } from '../types';

export const WALL_CATEGORIES = [
  { id: 'tous', label: 'Tous', icon: 'MessageSquare' },
  { id: 'information', label: 'Information', icon: 'Info' },
  { id: 'urgent', label: 'Urgent', icon: 'AlertCircle' },
  { id: 'question', label: 'Question', icon: 'HelpCircle' },
  { id: 'event', label: 'Événement', icon: 'Calendar' },
  { id: 'other', label: 'Autre', icon: 'MoreHorizontal' }
];

interface WallPostRow {
  id: string | null;
  author_id: string | null;
  author_name: string | null;
  author_role: string | null;
  title: string | null;
  content: string | null;
  category: string | null;
  is_pinned: boolean | null;
  likes_count: number | null;
  comments_count: number | null;
  is_liked_by_me: boolean | null;
  attachment_id: string | null;
  created_at: string | null;
}

function mapPostToPublication(post: WallPostRow): Publication {
  return {
    id: post.id || '',
    author: post.author_name || 'Anonyme',
    authorRole: post.author_role || 'copropriétaire',
    title: post.title || '',
    content: post.content || '',
    category: post.category || 'information',
    date: post.created_at || new Date().toISOString(),
    isPinned: post.is_pinned || false,
    isLocked: false,
    likes: post.likes_count || 0,
    comments: post.comments_count || 0,
    hasAttachment: !!post.attachment_id,
    tags: [],
    isLikedByMe: post.is_liked_by_me || false,
  };
}

export function useWallPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [publications, setPublications] = useState<Publication[]>([]);
  const [drafts] = useState<PublicationDraft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch posts from Supabase
  const fetchPosts = useCallback(async () => {
    if (!currentCoproId) {
      setPublications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('v_wall_feed')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('Error fetching wall posts:', fetchError);
        setError('Erreur lors du chargement du mur');
        setPublications([]);
      } else {
        setPublications((data || []).map(mapPostToPublication));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Erreur inattendue');
      setPublications([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Like/Unlike a post
  const handleLikePublication = useCallback(async (id: string) => {
    if (!currentCoproId) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const post = publications.find(p => p.id === id);
    if (!post) return;

    try {
      if (post.isLikedByMe) {
        // Unlike - delete the like
        await supabase
          .from('wall_likes')
          .delete()
          .eq('copro_id', currentCoproId)
          .eq('post_id', id)
          .eq('user_id', user.id);
      } else {
        // Like - insert new like (ignore duplicate key error)
        await supabase
          .from('wall_likes')
          .insert({
            copro_id: currentCoproId,
            post_id: id,
            user_id: user.id,
          });
      }

      // Refetch to update counts and is_liked_by_me
      await fetchPosts();
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }, [currentCoproId, publications, fetchPosts]);

  // Toggle pin on a post
  const handleTogglePin = useCallback(async (id: string) => {
    const post = publications.find(p => p.id === id);
    if (!post) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newPinnedState = !post.isPinned;

    try {
      await supabase
        .from('wall_posts')
        .update({
          is_pinned: newPinnedState,
          pinned_at: newPinnedState ? new Date().toISOString() : null,
          pinned_by: newPinnedState ? user.id : null,
        })
        .eq('id', id);

      await fetchPosts();
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  }, [publications, fetchPosts]);

  // Delete a post
  const handleDeletePublication = useCallback(async (id: string) => {
    if (!currentCoproId) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) return;

    const supabase = createClient();

    try {
      const { error: deleteError } = await supabase
        .from('wall_posts')
        .delete()
        .eq('id', id)
        .eq('copro_id', currentCoproId);

      if (!deleteError) {
        setPublications(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }, [currentCoproId]);

  const handleDeleteDraft = useCallback((id: string) => {
    // Delete draft (no-op)
  }, []);

  const handleEditPublication = useCallback((id: string) => {
    router.push(`/communication/mur/nouveau?edit=${id}`);
  }, [router]);

  const filteredPublications = useMemo(() => {
    return publications.filter(pub => {
      const matchesCategory = selectedCategory === 'tous' || pub.category === selectedCategory;
      const matchesSearch =
        pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pub.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pub.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [publications, selectedCategory, searchQuery]);

  const pinnedPubs = useMemo(() => filteredPublications.filter(pub => pub.isPinned), [filteredPublications]);
  const regularPubs = useMemo(() => filteredPublications.filter(pub => !pub.isPinned), [filteredPublications]);

  const getCategoryColor = useCallback((category: string) => {
    return WALL_CATEGORY_MAP[category]?.color || '#6b7280';
  }, []);

  const getRoleBadge = useCallback((role: string): RoleBadge => {
    const badges: Record<string, RoleBadge> = {
      syndic: { label: 'Syndic', color: '#4f46e5' },
      conseil: { label: 'Conseil Syndical', color: '#059669' },
      copropriétaire: { label: 'Copropriétaire', color: '#6b7280' },
      gestionnaire: { label: 'Gestionnaire', color: '#4f46e5' },
      admin: { label: 'Admin', color: '#ef4444' }
    };
    return badges[role] || badges.copropriétaire;
  }, []);

  return {
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    publications,
    drafts,
    showDrafts,
    setShowDrafts,
    filteredPublications,
    pinnedPubs,
    regularPubs,
    categories: WALL_CATEGORIES,
    getCategoryColor,
    getRoleBadge,
    handleDeletePublication,
    handleLikePublication,
    handleTogglePin,
    handleDeleteDraft,
    handleEditPublication,
    isLoading,
    error,
    refetch: fetchPosts,
  };
}
