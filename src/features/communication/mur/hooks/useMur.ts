'use client';

import { useState, useCallback, useMemo } from 'react';
import type {
  IWallPost,
  IWallComment,
  INewPostData,
  PostCategory,
} from '@/features/communication/mur/domain/types';
import { MOCK_POSTS, MOCK_COMMENTS } from '@/features/communication/mur/domain/mock-data';

// ----------------------------------------------------------------------------
// Types du hook
// ----------------------------------------------------------------------------

export type CategoryFilterValue = PostCategory | 'all' | 'pinned' | 'mine';

export interface UseMurReturn {
  // State
  posts: IWallPost[];
  pinnedPosts: IWallPost[];
  selectedPostId: string | null;
  comments: IWallComment[];
  categoryFilter: CategoryFilterValue;
  searchTerm: string;
  isLoading: boolean;
  isEditorOpen: boolean;
  postCounts: Record<string, number>;

  // Actions
  selectPost: (id: string | null) => void;
  setCategoryFilter: (filter: CategoryFilterValue) => void;
  setSearchTerm: (term: string) => void;
  createPost: (data: INewPostData) => void;
  deletePost: (id: string) => void;
  toggleLike: (id: string) => void;
  togglePin: (id: string) => void;
  addComment: (postId: string, content: string) => void;
  openEditor: () => void;
  closeEditor: () => void;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function generateId(): string {
  return `wp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

const CURRENT_USER_ID = 'u1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c';
const CURRENT_USER_NAME = 'Marie Laurent';

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useMur(): UseMurReturn {
  const [allPosts, setAllPosts] = useState<IWallPost[]>(MOCK_POSTS);
  const [allComments, setAllComments] = useState<IWallComment[]>(MOCK_COMMENTS);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterValue>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // -- Filtered posts -------------------------------------------------------

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      // Category filter
      if (categoryFilter === 'pinned') return post.isPinned;
      if (categoryFilter === 'mine') return post.authorId === CURRENT_USER_ID;
      if (categoryFilter !== 'all' && post.category !== categoryFilter) return false;

      // Search filter
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

  const pinnedPosts = useMemo(
    () => filteredPosts.filter((p) => p.isPinned),
    [filteredPosts]
  );

  const posts = useMemo(
    () => filteredPosts.filter((p) => !p.isPinned),
    [filteredPosts]
  );

  // -- Post counts per category ---------------------------------------------

  const postCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allPosts.length };
    for (const post of allPosts) {
      counts[post.category] = (counts[post.category] || 0) + 1;
    }
    counts.pinned = allPosts.filter((p) => p.isPinned).length;
    counts.mine = allPosts.filter((p) => p.authorId === CURRENT_USER_ID).length;
    return counts;
  }, [allPosts]);

  // -- Comments for selected post -------------------------------------------

  const comments = useMemo(() => {
    if (!selectedPostId) return [];
    return allComments
      .filter((c) => c.postId === selectedPostId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allComments, selectedPostId]);

  // -- Actions --------------------------------------------------------------

  const selectPost = useCallback((id: string | null) => {
    setSelectedPostId((prev) => (prev === id ? null : id));
  }, []);

  const createPost = useCallback((data: INewPostData) => {
    const now = new Date().toISOString();
    const newPost: IWallPost = {
      id: generateId(),
      coproprieteId: 'c1a2b3c4-d5e6-4f7a-8b9c-0d1e2f3a4b5c',
      authorId: CURRENT_USER_ID,
      authorName: CURRENT_USER_NAME,
      authorRole: 'syndic',
      title: data.title,
      content: data.content,
      category: data.category,
      isPinned: false,
      isLocked: false,
      attachments: data.attachments || [],
      likesCount: 0,
      commentsCount: 0,
      isLikedByMe: false,
      createdAt: now,
      updatedAt: now,
    };
    setAllPosts((prev) => [newPost, ...prev]);
    setIsEditorOpen(false);
  }, []);

  const deletePost = useCallback((id: string) => {
    setAllPosts((prev) => prev.filter((p) => p.id !== id));
    setAllComments((prev) => prev.filter((c) => c.postId !== id));
    setSelectedPostId((prev) => (prev === id ? null : prev));
  }, []);

  const toggleLike = useCallback((id: string) => {
    setAllPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const liked = !p.isLikedByMe;
        return {
          ...p,
          isLikedByMe: liked,
          likesCount: liked ? p.likesCount + 1 : p.likesCount - 1,
        };
      })
    );
  }, []);

  const togglePin = useCallback((id: string) => {
    setAllPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return { ...p, isPinned: !p.isPinned };
      })
    );
  }, []);

  const addComment = useCallback((postId: string, content: string) => {
    const now = new Date().toISOString();
    const newComment: IWallComment = {
      id: `wc-${Date.now()}`,
      postId,
      authorId: CURRENT_USER_ID,
      authorName: CURRENT_USER_NAME,
      authorRole: 'syndic',
      content,
      parentId: null,
      likesCount: 0,
      isLikedByMe: false,
      createdAt: now,
      updatedAt: now,
    };
    setAllComments((prev) => [...prev, newComment]);
    setAllPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return { ...p, commentsCount: p.commentsCount + 1 };
      })
    );
  }, []);

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
