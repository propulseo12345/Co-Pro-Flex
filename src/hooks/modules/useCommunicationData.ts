'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as commApi from '@/lib/communication/api';

// ============================================================================
// GENERIC HOOK FOR DATA FETCHING
// ============================================================================

interface UseDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useCommunicationQuery<T>(
  queryFn: (coproId: string) => Promise<commApi.ApiResult<T>>,
  enabled: boolean = true
): UseDataResult<T> {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId || !enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await queryFn(currentCoproId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId, queryFn, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh };
}

// ============================================================================
// RE-EXPORT TYPES
// ============================================================================

export type {
  PostCategory,
  ContentVisibility,
  EventType,
  WallPost,
  WallComment,
  CalendarEvent,
  Conversation,
  ConversationMember,
  Message,
} from '@/lib/communication/api';

// ============================================================================
// WALL POSTS HOOKS
// ============================================================================

export interface PostFilters {
  search: string;
  category: commApi.PostCategory | 'ALL';
  showPinnedOnly: boolean;
}

const DEFAULT_POST_FILTERS: PostFilters = {
  search: '',
  category: 'ALL',
  showPinnedOnly: false,
};

export function useWallPosts(initialFilters?: Partial<PostFilters>) {
  const { currentCoproId } = useCopro();
  const [posts, setPosts] = useState<commApi.WallPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PostFilters>({
    ...DEFAULT_POST_FILTERS,
    ...initialFilters,
  });

  const loadPosts = useCallback(async () => {
    if (!currentCoproId) {
      setPosts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await commApi.listWallPosts(currentCoproId);

    if (result.error) {
      setError(result.error);
      setPosts([]);
    } else {
      setPosts(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          p.title.toLowerCase().includes(search) ||
          p.content.toLowerCase().includes(search) ||
          p.author_name?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Category filter
      if (filters.category !== 'ALL' && p.category !== filters.category) {
        return false;
      }

      // Pinned filter
      if (filters.showPinnedOnly && !p.is_pinned) {
        return false;
      }

      return true;
    });
  }, [posts, filters]);

  // Split pinned and regular posts
  const pinnedPosts = useMemo(() => posts.filter((p) => p.is_pinned), [posts]);
  const regularPosts = useMemo(() => filteredPosts.filter((p) => !p.is_pinned), [filteredPosts]);

  // Stats
  const stats = useMemo(() => ({
    total: posts.length,
    pinned: pinnedPosts.length,
    information: posts.filter((p) => p.category === 'information').length,
    question: posts.filter((p) => p.category === 'question').length,
    suggestion: posts.filter((p) => p.category === 'suggestion').length,
    urgent: posts.filter((p) => p.category === 'urgent').length,
  }), [posts, pinnedPosts]);

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setCategoryFilter = useCallback((category: commApi.PostCategory | 'ALL') => {
    setFilters((prev) => ({ ...prev, category }));
  }, []);

  const setShowPinnedOnly = useCallback((showPinnedOnly: boolean) => {
    setFilters((prev) => ({ ...prev, showPinnedOnly }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_POST_FILTERS);
  }, []);

  return {
    posts,
    filteredPosts,
    pinnedPosts,
    regularPosts,
    isLoading,
    error,
    stats,
    filters,
    setSearch,
    setCategoryFilter,
    setShowPinnedOnly,
    resetFilters,
    refresh: loadPosts,
  };
}

export function useWallPost(postId: string | null) {
  const [post, setPost] = useState<commApi.WallPost | null>(null);
  const [comments, setComments] = useState<commApi.WallComment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!postId) {
      setPost(null);
      setComments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [postResult, commentsResult] = await Promise.all([
        commApi.getWallPost(postId),
        commApi.listPostComments(postId),
      ]);

      if (postResult.error) {
        setError(postResult.error);
      } else {
        setPost(postResult.data);
      }

      if (!commentsResult.error) {
        setComments(commentsResult.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const refreshComments = useCallback(async () => {
    if (!postId) return;
    const result = await commApi.listPostComments(postId);
    if (!result.error) {
      setComments(result.data || []);
    }
  }, [postId]);

  return {
    post,
    comments,
    isLoading,
    error,
    refresh: loadPost,
    refreshComments,
  };
}

// ============================================================================
// EVENTS HOOKS
// ============================================================================

export interface EventFilters {
  search: string;
  eventType: commApi.EventType | 'ALL';
  period: 'upcoming' | 'past' | 'ALL';
}

const DEFAULT_EVENT_FILTERS: EventFilters = {
  search: '',
  eventType: 'ALL',
  period: 'upcoming',
};

export function useEvents(initialFilters?: Partial<EventFilters>) {
  const { currentCoproId } = useCopro();
  const [events, setEvents] = useState<commApi.CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    ...DEFAULT_EVENT_FILTERS,
    ...initialFilters,
  });

  const loadEvents = useCallback(async () => {
    if (!currentCoproId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await commApi.listEvents(currentCoproId);

    if (result.error) {
      setError(result.error);
      setEvents([]);
    } else {
      setEvents(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Filter events
  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          e.title.toLowerCase().includes(search) ||
          e.description?.toLowerCase().includes(search) ||
          e.location?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Event type filter
      if (filters.eventType !== 'ALL' && e.event_type !== filters.eventType) {
        return false;
      }

      // Period filter
      if (filters.period !== 'ALL') {
        const eventDate = new Date(e.starts_at);
        if (filters.period === 'upcoming' && eventDate < now) return false;
        if (filters.period === 'past' && eventDate >= now) return false;
      }

      return true;
    });
  }, [events, filters]);

  // Upcoming events (next 5)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => new Date(e.starts_at) >= now)
      .slice(0, 5);
  }, [events]);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: events.length,
      upcoming: events.filter((e) => new Date(e.starts_at) >= now).length,
      past: events.filter((e) => new Date(e.starts_at) < now).length,
      ag: events.filter((e) => e.event_type === 'ag').length,
      reunionCs: events.filter((e) => e.event_type === 'reunion_cs').length,
      intervention: events.filter((e) => e.event_type === 'intervention').length,
      travaux: events.filter((e) => e.event_type === 'travaux').length,
    };
  }, [events]);

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setEventTypeFilter = useCallback((eventType: commApi.EventType | 'ALL') => {
    setFilters((prev) => ({ ...prev, eventType }));
  }, []);

  const setPeriodFilter = useCallback((period: 'upcoming' | 'past' | 'ALL') => {
    setFilters((prev) => ({ ...prev, period }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_EVENT_FILTERS);
  }, []);

  return {
    events,
    filteredEvents,
    upcomingEvents,
    isLoading,
    error,
    stats,
    filters,
    setSearch,
    setEventTypeFilter,
    setPeriodFilter,
    resetFilters,
    refresh: loadEvents,
  };
}

export function useEvent(eventId: string | null) {
  const [event, setEvent] = useState<commApi.CalendarEvent | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    if (!eventId) {
      setEvent(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await commApi.getEvent(eventId);

    if (result.error) {
      setError(result.error);
      setEvent(null);
    } else {
      setEvent(result.data);
    }

    setIsLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  return {
    event,
    isLoading,
    error,
    refresh: loadEvent,
  };
}

export function useUpcomingEvents(limit: number = 5) {
  const { currentCoproId } = useCopro();
  const [events, setEvents] = useState<commApi.CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!currentCoproId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await commApi.getUpcomingEvents(currentCoproId, limit);

    if (result.error) {
      setError(result.error);
      setEvents([]);
    } else {
      setEvents(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId, limit]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    isLoading,
    error,
    refresh: loadEvents,
  };
}

// ============================================================================
// CONVERSATIONS HOOKS
// ============================================================================

export function useConversations() {
  const result = useCommunicationQuery(commApi.listConversations);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return (result.data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [result.data]);

  return {
    ...result,
    conversations: result.data,
    unreadCount,
  };
}

export function useConversation(conversationId: string | null) {
  const [conversation, setConversation] = useState<commApi.Conversation | null>(null);
  const [messages, setMessages] = useState<commApi.Message[]>([]);
  const [members, setMembers] = useState<commApi.ConversationMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      setMembers([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [convResult, messagesResult, membersResult] = await Promise.all([
        commApi.getConversation(conversationId),
        commApi.listConversationMessages(conversationId),
        commApi.listConversationMembers(conversationId),
      ]);

      if (convResult.error) {
        setError(convResult.error);
      } else {
        setConversation(convResult.data);
      }

      if (!messagesResult.error) {
        setMessages(messagesResult.data || []);
      }

      if (!membersResult.error) {
        setMembers(membersResult.data || []);
      }

      // Mark as read
      await commApi.markConversationRead({ conversationId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const refreshMessages = useCallback(async () => {
    if (!conversationId) return;
    const result = await commApi.listConversationMessages(conversationId);
    if (!result.error) {
      setMessages(result.data || []);
    }
  }, [conversationId]);

  return {
    conversation,
    messages,
    members,
    isLoading,
    error,
    refresh: loadConversation,
    refreshMessages,
  };
}

// ============================================================================
// MUTATION HOOKS - WALL
// ============================================================================

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

export function useCreatePost() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<commApi.CreatePostPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.createPost({
        ...payload,
        coproId: currentCoproId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useCreateComment() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (postId: string, content: string) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.createComment({
        coproId: currentCoproId,
        postId,
        content,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useToggleLike() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (postId: string) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.toggleLike({
        coproId: currentCoproId,
        postId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useTogglePin() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (postId: string) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.togglePin({
        coproId: currentCoproId,
        postId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useDeletePost() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (postId: string) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.deletePost({
        coproId: currentCoproId,
        postId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useUpdatePost() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (postId: string, updates: { title?: string; content?: string; category?: commApi.PostCategory }) => {
      setState({ isLoading: true, error: null });

      const result = await commApi.updatePost(postId, updates);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

// ============================================================================
// MUTATION HOOKS - EVENTS
// ============================================================================

export function useCreateEvent() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<commApi.CreateEventPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.createEvent({
        ...payload,
        coproId: currentCoproId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useUpdateEvent() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: commApi.UpdateEventPayload) => {
      setState({ isLoading: true, error: null });

      const result = await commApi.updateEvent(payload);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useDeleteEvent() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (eventId: string) => {
    setState({ isLoading: true, error: null });

    const result = await commApi.deleteEvent({ eventId });

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

// ============================================================================
// MUTATION HOOKS - CONVERSATIONS
// ============================================================================

export function useCreateConversation() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<commApi.CreateConversationPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.createConversation({
        ...payload,
        coproId: currentCoproId,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useSendMessage() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (conversationId: string, content: string, attachmentIds?: string[]) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await commApi.sendMessage({
        coproId: currentCoproId,
        conversationId,
        content,
        attachmentIds,
      });

      setState({ isLoading: false, error: result.error });

      return result;
    },
    [currentCoproId]
  );

  return { ...state, execute };
}

export function useLeaveConversation() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (conversationId: string) => {
    setState({ isLoading: true, error: null });

    const result = await commApi.leaveConversation({ conversationId });

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useAddConversationMember() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (conversationId: string, userId: string) => {
    setState({ isLoading: true, error: null });

    const result = await commApi.addConversationMember({ conversationId, userId });

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}
