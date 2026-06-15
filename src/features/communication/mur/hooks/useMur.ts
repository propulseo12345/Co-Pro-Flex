'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { useSupabase } from '@/hooks/useSupabase';
import type {
  IWallPost,
  IWallComment,
  INewPostData,
  PostCategory,
  AuthorRole,
} from '@/features/communication/mur/domain/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// Rôle d'auteur par défaut (le câblage rôle réel relève de J2.5 communication).
const CURRENT_USER_ROLE: AuthorRole = 'syndic';

// ----------------------------------------------------------------------------
// Types du hook
// ----------------------------------------------------------------------------

export type CategoryFilterValue = PostCategory | 'all' | 'pinned' | 'mine';

export interface UseMurReturn {
  posts: IWallPost[];
  pinnedPosts: IWallPost[];
  selectedPostId: string | null;
  comments: IWallComment[];
  categoryFilter: CategoryFilterValue;
  searchTerm: string;
  isLoading: boolean;
  isEditorOpen: boolean;
  postCounts: Record<string, number>;
  selectPost: (id: string | null) => void;
  setCategoryFilter: (filter: CategoryFilterValue) => void;
  setSearchTerm: (term: string) => void;
  createPost: (data: INewPostData) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  toggleLike: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  openEditor: () => void;
  closeEditor: () => void;
}

// ----------------------------------------------------------------------------
// Mappers
// ----------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPost(row: any): IWallPost {
  return {
    id: row.id,
    coproprieteId: row.copro_id,
    authorId: row.author_id,
    authorName: row.author_name ?? 'Utilisateur',
    authorRole: (row.author_role ?? 'copro') as AuthorRole,
    title: row.title,
    content: row.content,
    category: row.category as PostCategory,
    isPinned: row.is_pinned ?? false,
    isLocked: row.is_locked ?? false,
    attachments: [],
    likesCount: row.likes_count ?? 0,
    commentsCount: row.comments_count ?? 0,
    isLikedByMe: row.is_liked_by_me ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapComment(row: any): IWallComment {
  return {
    id: row.id,
    postId: row.post_id,
    authorId: row.author_id,
    // wall_comments ne stocke pas le nom (snapshot supprimé en 0022, jointure profiles) :
    // le nom est posé localement à la création ; au fetch on retombe sur le fallback.
    authorName: 'Utilisateur',
    authorRole: 'copro' as AuthorRole,
    content: row.content,
    parentId: row.parent_comment_id ?? null,
    likesCount: 0,
    isLikedByMe: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useMur(): UseMurReturn {
  const { currentCoproId } = useCopro();
  const { user } = useSupabase();
  const currentUserId = user?.id ?? null;
  const currentUserName =
    (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Utilisateur';
  const supabase = useMemo(() => createUntypedClient(), []);

  const [allPosts, setAllPosts] = useState<IWallPost[]>([]);
  const [allComments, setAllComments] = useState<IWallComment[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const fetchPostsRef = useRef<(() => Promise<void>) | null>(null);
  const fetchCommentsRef = useRef<((id: string) => Promise<void>) | null>(null);

  // ── Chargement des posts ───────────────────────────────────────────────────

  const fetchPosts = useCallback(async () => {
    if (!currentCoproId) return;
    setIsLoading(true);
    try {
      // v_wall_feed (0049) : auteur résolu (profiles), rôle dérivé (memberships),
      // is_liked_by_me contextuel (auth.uid()), compteurs dénormalisés (triggers 0032).
      const { data, error } = await supabase
        .from('v_wall_feed')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAllPosts(data.map(mapPost));
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, supabase]);

  fetchPostsRef.current = fetchPosts;

  useEffect(() => {
    fetchPostsRef.current?.();
  }, [currentCoproId]);

  // ── Chargement des commentaires ────────────────────────────────────────────

  const fetchComments = useCallback(async (postId: string) => {
    const { data, error } = await supabase
      .from('wall_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setAllComments((prev) => {
        const others = prev.filter((c) => c.postId !== postId);
        return [...others, ...data.map(mapComment)];
      });
    }
  }, [supabase]);

  fetchCommentsRef.current = fetchComments;

  // ── Resynchronisation ciblée des compteurs ───────────────────────────────────
  // Les triggers SQL (0032) maintiennent likes_count/comments_count : on ne les
  // incrémente jamais côté front (sinon double-comptage). Après une action, on relit
  // la valeur réelle de la ligne via v_wall_feed et on remplace le compteur local.

  const refetchPostCounts = useCallback(async (postId: string) => {
    const { data, error } = await supabase
      .from('v_wall_feed')
      .select('likes_count, comments_count')
      .eq('id', postId)
      .single();

    if (error || !data) return;

    setAllPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likesCount: data.likes_count ?? p.likesCount,
              commentsCount: data.comments_count ?? p.commentsCount,
            }
          : p
      )
    );
  }, [supabase]);

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      if (categoryFilter === 'pinned') return post.isPinned;
      if (categoryFilter === 'mine') return post.authorId === currentUserId;
      if (categoryFilter !== 'all' && post.category !== categoryFilter) return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        return (
          post.title.toLowerCase().includes(query) ||
          post.content.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [allPosts, categoryFilter, searchTerm, currentUserId]);

  const pinnedPosts = useMemo(() => filteredPosts.filter((p) => p.isPinned), [filteredPosts]);
  const posts = useMemo(() => filteredPosts.filter((p) => !p.isPinned), [filteredPosts]);

  const postCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPosts.length };
    for (const post of allPosts) {
      counts[post.category] = (counts[post.category] || 0) + 1;
    }
    counts.pinned = allPosts.filter((p) => p.isPinned).length;
    counts.mine = allPosts.filter((p) => p.authorId === currentUserId).length;
    return counts;
  }, [allPosts, currentUserId]);

  const comments = useMemo(() => {
    if (!selectedPostId) return [];
    return allComments
      .filter((c) => c.postId === selectedPostId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allComments, selectedPostId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const selectPost = useCallback((id: string | null) => {
    setSelectedPostId((prev) => (prev === id ? null : id));
    if (id) fetchCommentsRef.current?.(id);
  }, []);

  const createPost = useCallback(async (data: INewPostData) => {
    if (!currentCoproId || !currentUserId) return;

    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from('wall_posts')
      .insert({
        copro_id: currentCoproId,
        author_id: currentUserId,
        title: data.title,
        content: data.content,
        category: data.category,
        visibility: 'all_members',
        is_pinned: data.isPinned,
        is_locked: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && inserted) {
      // author_name/author_role ne sont pas stockés (dérivés par v_wall_feed) : on les pose
      // localement depuis la session pour l'affichage optimiste immédiat.
      setAllPosts((prev) => [
        {
          ...mapPost(inserted),
          authorName: currentUserName,
          authorRole: CURRENT_USER_ROLE,
          isLikedByMe: false,
        },
        ...prev,
      ]);
    }
    setIsEditorOpen(false);
  }, [currentCoproId, currentUserId, currentUserName, supabase]);

  const deletePost = useCallback(async (id: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== id));
    setAllComments((prev) => prev.filter((c) => c.postId !== id));
    setSelectedPostId((prev) => (prev === id ? null : prev));
    await supabase.from('wall_posts').delete().eq('id', id);
  }, [supabase]);

  const toggleLike = useCallback(async (id: string) => {
    if (!currentCoproId || !currentUserId) return;

    const post = allPosts.find((p) => p.id === id);
    if (!post) return;

    const liked = !post.isLikedByMe;

    // Optimistic update : on ne bascule QUE l'état visuel du bouton (liked/pas liké).
    // likesCount n'est PAS touché ici — le trigger trg_wall_likes_count (0032) s'en charge,
    // un +1/-1 local doublerait le compteur. La valeur réelle est resynchronisée après.
    setAllPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isLikedByMe: liked } : p))
    );

    if (liked) {
      await supabase.from('wall_likes').insert({
        copro_id: currentCoproId,
        post_id: id,
        user_id: currentUserId,
      });
    } else {
      await supabase
        .from('wall_likes')
        .delete()
        .eq('post_id', id)
        .eq('user_id', currentUserId);
    }

    // Compteur réel (trigger appliqué) relu depuis la source.
    await refetchPostCounts(id);
  }, [allPosts, currentCoproId, currentUserId, supabase, refetchPostCounts]);

  const togglePin = useCallback(async (id: string) => {
    const post = allPosts.find((p) => p.id === id);
    if (!post) return;
    const newVal = !post.isPinned;
    setAllPosts((prev) => prev.map((p) => (p.id === id ? { ...p, isPinned: newVal } : p)));
    await supabase
      .from('wall_posts')
      .update({ is_pinned: newVal, pinned_at: newVal ? new Date().toISOString() : null })
      .eq('id', id);
  }, [allPosts, supabase]);

  const addComment = useCallback(async (postId: string, content: string) => {
    if (!currentCoproId || !currentUserId) return;

    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from('wall_comments')
      .insert({
        copro_id: currentCoproId,
        post_id: postId,
        author_id: currentUserId,
        content,
        parent_comment_id: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && inserted) {
      // author_name dérivé (non stocké) : posé depuis la session pour l'affichage optimiste.
      setAllComments((prev) => [...prev, { ...mapComment(inserted), authorName: currentUserName }]);
      // comments_count est incrémenté par le trigger trg_wall_comments_count (0032) :
      // pas de +1 local (double-comptage) — on relit la valeur réelle depuis la source.
      await refetchPostCounts(postId);
    }
  }, [currentCoproId, currentUserId, currentUserName, supabase, refetchPostCounts]);

  const openEditor = useCallback(() => setIsEditorOpen(true), []);
  const closeEditor = useCallback(() => setIsEditorOpen(false), []);

  return {
    posts,
    pinnedPosts,
    selectedPostId,
    comments,
    categoryFilter,
    searchTerm,
    isLoading,
    isEditorOpen,
    postCounts,
    selectPost,
    setCategoryFilter,
    setSearchTerm,
    createPost,
    deletePost,
    toggleLike,
    togglePin,
    addComment,
    openEditor,
    closeEditor,
  };
}
