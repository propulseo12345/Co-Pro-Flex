'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import type {
  IWallPost,
  IWallComment,
  INewPostData,
  PostCategory,
  AuthorRole,
} from '@/features/communication/mur/domain/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ID utilisateur courant (syndic) — remplacé par auth.uid() quand l'auth sera active
const CURRENT_USER_ID = 'f76855bb-62c3-4040-8fc6-7586080be9fb';
const CURRENT_USER_NAME = 'Admin CoProFlex';
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
    authorName: row.author_name ?? 'Utilisateur',
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
      const { data, error } = await supabase
        .from('wall_posts')
        .select('*')
        .eq('copro_id', currentCoproId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Charger les likes de l'utilisateur courant en une requête
        const { data: likes } = await supabase
          .from('wall_likes')
          .select('post_id')
          .eq('copro_id', currentCoproId)
          .eq('user_id', CURRENT_USER_ID);

        const likedIds = new Set((likes ?? []).map((l: { post_id: string }) => l.post_id));

        setAllPosts(
          data.map((row: unknown) => ({
            ...mapPost(row),
            isLikedByMe: likedIds.has((row as { id: string }).id),
          }))
        );
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

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      if (categoryFilter === 'pinned') return post.isPinned;
      if (categoryFilter === 'mine') return post.authorId === CURRENT_USER_ID;
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
  }, [allPosts, categoryFilter, searchTerm]);

  const pinnedPosts = useMemo(() => filteredPosts.filter((p) => p.isPinned), [filteredPosts]);
  const posts = useMemo(() => filteredPosts.filter((p) => !p.isPinned), [filteredPosts]);

  const postCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPosts.length };
    for (const post of allPosts) {
      counts[post.category] = (counts[post.category] || 0) + 1;
    }
    counts.pinned = allPosts.filter((p) => p.isPinned).length;
    counts.mine = allPosts.filter((p) => p.authorId === CURRENT_USER_ID).length;
    return counts;
  }, [allPosts]);

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
    if (!currentCoproId) return;

    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from('wall_posts')
      .insert({
        copro_id: currentCoproId,
        author_id: CURRENT_USER_ID,
        author_name: CURRENT_USER_NAME,
        author_role: CURRENT_USER_ROLE,
        title: data.title,
        content: data.content,
        category: data.category,
        visibility: 'all_members',
        is_pinned: data.isPinned,
        is_locked: false,
        likes_count: 0,
        comments_count: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && inserted) {
      setAllPosts((prev) => [{ ...mapPost(inserted), isLikedByMe: false }, ...prev]);
    }
    setIsEditorOpen(false);
  }, [currentCoproId, supabase]);

  const deletePost = useCallback(async (id: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== id));
    setAllComments((prev) => prev.filter((c) => c.postId !== id));
    setSelectedPostId((prev) => (prev === id ? null : prev));
    await supabase.from('wall_posts').delete().eq('id', id);
  }, [supabase]);

  const toggleLike = useCallback(async (id: string) => {
    if (!currentCoproId) return;

    const post = allPosts.find((p) => p.id === id);
    if (!post) return;

    const liked = !post.isLikedByMe;

    // Optimistic update
    setAllPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isLikedByMe: liked, likesCount: liked ? p.likesCount + 1 : p.likesCount - 1 }
          : p
      )
    );

    if (liked) {
      await supabase.from('wall_likes').insert({
        copro_id: currentCoproId,
        post_id: id,
        user_id: CURRENT_USER_ID,
      });
      await supabase
        .from('wall_posts')
        .update({ likes_count: post.likesCount + 1 })
        .eq('id', id);
    } else {
      await supabase
        .from('wall_likes')
        .delete()
        .eq('post_id', id)
        .eq('user_id', CURRENT_USER_ID);
      await supabase
        .from('wall_posts')
        .update({ likes_count: Math.max(0, post.likesCount - 1) })
        .eq('id', id);
    }
  }, [allPosts, currentCoproId, supabase]);

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
    if (!currentCoproId) return;

    const now = new Date().toISOString();
    const { data: inserted, error } = await supabase
      .from('wall_comments')
      .insert({
        copro_id: currentCoproId,
        post_id: postId,
        author_id: CURRENT_USER_ID,
        author_name: CURRENT_USER_NAME,
        content,
        parent_comment_id: null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (!error && inserted) {
      setAllComments((prev) => [...prev, mapComment(inserted)]);
      setAllPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p))
      );
      // Synchroniser le compteur en DB
      const post = allPosts.find((p) => p.id === postId);
      if (post) {
        await supabase
          .from('wall_posts')
          .update({ comments_count: post.commentsCount + 1 })
          .eq('id', postId);
      }
    }
  }, [allPosts, currentCoproId, supabase]);

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
