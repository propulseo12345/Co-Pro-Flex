'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { PublicationDetail, Comment, RoleBadge } from '../types';

interface UseWallDetailPageParams {
  publicationId: string;
}

interface WallPostDetail {
  id: string;
  copro_id: string | null;
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

interface WallCommentRow {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

export function useWallDetailPage({ publicationId }: UseWallDetailPageParams) {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [publication, setPublication] = useState<PublicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Fetch post detail from Supabase
  useEffect(() => {
    const fetchPost = async () => {
      if (!currentCoproId || !publicationId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Fetch post
        const { data: post, error: postError } = await supabase
          .from('v_wall_feed')
          .select('*')
          .eq('id', publicationId)
          .eq('copro_id', currentCoproId)
          .single();

        if (postError || !post) {
          console.error('Error fetching post:', postError);
          setPublication(null);
          setLoading(false);
          return;
        }

        // Fetch comments for this post
        const { data: commentsData } = await supabase
          .from('wall_comments')
          .select(`
            id,
            author_id,
            content,
            created_at,
            parent_comment_id,
            profiles:author_id (full_name)
          `)
          .eq('post_id', publicationId)
          .eq('copro_id', currentCoproId)
          .order('created_at', { ascending: true });

        const mappedComments: Comment[] = (commentsData || []).map((c: WallCommentRow) => ({
          id: c.id,
          author: c.profiles?.full_name || 'Anonyme',
          authorRole: 'copropriétaire',
          content: c.content,
          date: c.created_at,
          likes: 0, // Comment likes not supported yet
          isLiked: false,
          parentId: c.parent_comment_id,
        }));

        const pub: PublicationDetail = {
          id: post.id || '',
          author: post.author_name || 'Anonyme',
          authorRole: (post.author_role || 'copropriétaire') as 'syndic' | 'copropriétaire' | 'conseil',
          title: post.title || '',
          content: post.content || '',
          category: post.category || 'annonce',
          date: post.created_at || new Date().toISOString(),
          isPinned: post.is_pinned || false,
          isLocked: false,
          likes: post.likes_count || 0,
          hasAttachment: !!post.attachment_id,
          isLiked: post.is_liked_by_me || false,
          tags: [],
          attachments: [],
          comments: mappedComments,
        };

        setPublication(pub);
        setIsLiked(pub.isLiked || false);
        setLikesCount(pub.likes || 0);
        setComments(mappedComments);
      } catch (err) {
        console.error('Unexpected error:', err);
        setPublication(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [publicationId, currentCoproId]);

  const getCategoryColor = useCallback((category: string) => {
    const colors: Record<string, string> = { travaux: '#f59e0b', social: '#8b5cf6', securite: '#ef4444', evenements: '#3b82f6', annonce: '#10b981' };
    return colors[category] || '#6b7280';
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = { travaux: 'Travaux', social: 'Social', securite: 'Sécurité', evenements: 'Événements', annonce: 'Annonce' };
    return labels[category] || category;
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

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleLike = useCallback(async () => {
    if (!currentCoproId || !publicationId) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      if (isLiked) {
        // Unlike - delete the like
        await supabase
          .from('wall_likes')
          .delete()
          .eq('copro_id', currentCoproId)
          .eq('post_id', publicationId)
          .eq('user_id', user.id);
      } else {
        // Like - insert new like
        await supabase
          .from('wall_likes')
          .insert({
            copro_id: currentCoproId,
            post_id: publicationId,
            user_id: user.id,
          });
      }

      // Update local state optimistically
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  }, [isLiked, currentCoproId, publicationId]);

  const handleLikeComment = useCallback((commentId: string) => {
    // Will be implemented in WRITE phase
    console.log('Like comment:', commentId);
  }, []);

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(replyingTo === commentId ? null : commentId);
    setReplyContent('');
  }, [replyingTo]);

  // Helper to refetch comments
  const refetchComments = useCallback(async () => {
    if (!currentCoproId || !publicationId) return;

    const supabase = createClient();
    const { data: commentsData } = await supabase
      .from('wall_comments')
      .select(`
        id,
        author_id,
        content,
        created_at,
        parent_comment_id,
        profiles:author_id (full_name)
      `)
      .eq('post_id', publicationId)
      .eq('copro_id', currentCoproId)
      .order('created_at', { ascending: true });

    const mappedComments: Comment[] = (commentsData || []).map((c: WallCommentRow) => ({
      id: c.id,
      author: c.profiles?.full_name || 'Anonyme',
      authorRole: 'copropriétaire',
      content: c.content,
      date: c.created_at,
      likes: 0,
      isLiked: false,
      parentId: c.parent_comment_id,
    }));

    setComments(mappedComments);
  }, [currentCoproId, publicationId]);

  const handleSubmitReply = useCallback(async (parentCommentId: string) => {
    if (!replyContent.trim() || !currentCoproId || !publicationId) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('wall_comments')
        .insert({
          copro_id: currentCoproId,
          post_id: publicationId,
          author_id: user.id,
          content: replyContent.trim(),
          parent_comment_id: parentCommentId,
        });

      if (insertError) {
        console.error('Error submitting reply:', insertError);
      } else {
        await refetchComments();
        setReplyContent('');
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Unexpected error submitting reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [replyContent, currentCoproId, publicationId, refetchComments]);

  const handleCommentSubmit = useCallback(async () => {
    if (!newComment.trim() || !currentCoproId || !publicationId) return;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('wall_comments')
        .insert({
          copro_id: currentCoproId,
          post_id: publicationId,
          author_id: user.id,
          content: newComment.trim(),
          parent_comment_id: null,
        });

      if (insertError) {
        console.error('Error submitting comment:', insertError);
      } else {
        await refetchComments();
        setNewComment('');
      }
    } catch (err) {
      console.error('Unexpected error submitting comment:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, currentCoproId, publicationId, refetchComments]);

  const handleDeletePublication = useCallback(async () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publication ?')) {
      const supabase = createClient();
      const { error } = await supabase
        .from('wall_posts')
        .delete()
        .eq('id', publicationId);

      if (!error) {
        router.push('/communication/mur');
      }
    }
    setShowActions(false);
  }, [router, publicationId]);

  const handleEditPublication = useCallback(() => {
    router.push(`/communication/mur/nouveau?edit=${publicationId}`);
    setShowActions(false);
  }, [router, publicationId]);

  const handleShare = useCallback((type: 'copy' | 'email') => {
    if (type === 'copy') {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié !');
    } else if (type === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(publication?.title || '')}&body=${encodeURIComponent(window.location.href)}`;
    }
    setShowShareMenu(false);
  }, [publication]);

  return {
    publication,
    loading,
    isLiked,
    likesCount,
    comments,
    newComment,
    setNewComment,
    isSubmitting,
    showActions,
    setShowActions,
    showShareMenu,
    setShowShareMenu,
    replyingTo,
    replyContent,
    setReplyContent,
    getCategoryColor,
    getCategoryLabel,
    getRoleBadge,
    formatDate,
    handleLike,
    handleLikeComment,
    handleReply,
    handleSubmitReply,
    handleCommentSubmit,
    handleDeletePublication,
    handleEditPublication,
    handleShare,
  };
}
