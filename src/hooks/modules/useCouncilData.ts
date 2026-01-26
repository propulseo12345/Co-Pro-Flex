'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as councilApi from '@/lib/council/api';

// ============================================================================
// GENERIC HOOK FOR DATA FETCHING
// ============================================================================

interface UseDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useCouncilQuery<T>(
  queryFn: (coproId: string) => Promise<councilApi.ApiResult<T>>,
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
  CouncilRole,
  CouncilDecisionStatus,
  CouncilVoteChoice,
  CouncilMember,
  CouncilDecision,
  CouncilVote,
  CouncilDocument,
  DecisionResult,
} from '@/lib/council/api';

// ============================================================================
// COUNCIL MEMBERS HOOKS
// ============================================================================

export function useCouncilMembers(activeOnly: boolean = true) {
  const queryFn = activeOnly ? councilApi.getActiveCouncilMembers : councilApi.listCouncilMembers;
  return useCouncilQuery(queryFn);
}

export function useMyCouncilRole() {
  const { currentCoproId } = useCopro();
  const [data, setData] = useState<{
    isMember: boolean;
    role: councilApi.CouncilRole | null;
    membership: councilApi.CouncilMember | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await councilApi.getMyCouncilRole(currentCoproId);

    if (result.error) {
      setError(result.error);
      setData(null);
    } else {
      setData(result.data);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isPresident = data?.role === 'president';
  const isCouncilMember = data?.isMember ?? false;

  return { data, isLoading, error, refresh, isPresident, isCouncilMember };
}

// ============================================================================
// DECISIONS HOOKS
// ============================================================================

export interface DecisionFilters {
  search: string;
  status: councilApi.CouncilDecisionStatus | 'ALL';
}

const DEFAULT_DECISION_FILTERS: DecisionFilters = {
  search: '',
  status: 'ALL',
};

export function useCouncilDecisions(initialFilters?: Partial<DecisionFilters>) {
  const { currentCoproId } = useCopro();
  const [decisions, setDecisions] = useState<councilApi.CouncilDecision[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DecisionFilters>({
    ...DEFAULT_DECISION_FILTERS,
    ...initialFilters,
  });

  const loadDecisions = useCallback(async () => {
    if (!currentCoproId) {
      setDecisions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await councilApi.listDecisions(currentCoproId);

    if (result.error) {
      setError(result.error);
      setDecisions([]);
    } else {
      setDecisions(result.data || []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    loadDecisions();
  }, [loadDecisions]);

  // Filter decisions
  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          d.title.toLowerCase().includes(search) ||
          d.description?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Status filter
      if (filters.status !== 'ALL' && d.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [decisions, filters]);

  // Stats
  const stats = useMemo(() => ({
    total: decisions.length,
    draft: decisions.filter((d) => d.status === 'draft').length,
    submitted: decisions.filter((d) => d.status === 'submitted').length,
    approved: decisions.filter((d) => d.status === 'approved').length,
    rejected: decisions.filter((d) => d.status === 'rejected').length,
    archived: decisions.filter((d) => d.status === 'archived').length,
    pendingVote: decisions.filter((d) => d.status === 'submitted').length,
  }), [decisions]);

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status: councilApi.CouncilDecisionStatus | 'ALL') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_DECISION_FILTERS);
  }, []);

  return {
    decisions,
    filteredDecisions,
    isLoading,
    error,
    stats,
    filters,
    setSearch,
    setStatusFilter,
    resetFilters,
    refresh: loadDecisions,
  };
}

export function useCouncilDecision(decisionId: string | null) {
  const [decision, setDecision] = useState<councilApi.CouncilDecision | null>(null);
  const [votes, setVotes] = useState<councilApi.CouncilVote[]>([]);
  const [results, setResults] = useState<councilApi.DecisionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDecision = useCallback(async () => {
    if (!decisionId) {
      setDecision(null);
      setVotes([]);
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Load decision and results in parallel
      const [decisionResult, resultsResult] = await Promise.all([
        councilApi.getDecision(decisionId),
        councilApi.getDecisionResults(decisionId),
      ]);

      if (decisionResult.error) {
        setError(decisionResult.error);
      } else {
        setDecision(decisionResult.data);
      }

      if (!resultsResult.error && resultsResult.data) {
        setResults(resultsResult.data.results);
        setVotes(resultsResult.data.votes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    loadDecision();
  }, [loadDecision]);

  return {
    decision,
    votes,
    results,
    isLoading,
    error,
    refresh: loadDecision,
  };
}

// ============================================================================
// DOCUMENTS HOOKS
// ============================================================================

export function useCouncilDocuments() {
  return useCouncilQuery(councilApi.listCouncilDocuments);
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

interface MutationState {
  isLoading: boolean;
  error: string | null;
}

export function useCreateDecision() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<councilApi.CreateDecisionPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await councilApi.createDecision({
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

export function useCastCouncilVote() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: councilApi.CastVotePayload) => {
      setState({ isLoading: true, error: null });

      const result = await councilApi.castVote(payload);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useUpdateDecisionStatus() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: councilApi.UpdateDecisionStatusPayload) => {
      setState({ isLoading: true, error: null });

      const result = await councilApi.updateDecisionStatus(payload);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useUpdateDecision() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (decisionId: string, updates: { title?: string; description?: string }) => {
      setState({ isLoading: true, error: null });

      const result = await councilApi.updateDecision(decisionId, updates);

      setState({ isLoading: false, error: result.error });

      return result;
    },
    []
  );

  return { ...state, execute };
}

export function useDeleteDecision() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (decisionId: string) => {
    setState({ isLoading: true, error: null });

    const result = await councilApi.deleteDecision(decisionId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}

export function useAttachDocument() {
  const { currentCoproId } = useCopro();
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(
    async (payload: Omit<councilApi.AttachDocumentPayload, 'coproId'>) => {
      if (!currentCoproId) {
        return { data: null, error: 'Aucune copropriété sélectionnée' };
      }

      setState({ isLoading: true, error: null });

      const result = await councilApi.attachDocument({
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

export function useRemoveCouncilDocument() {
  const [state, setState] = useState<MutationState>({ isLoading: false, error: null });

  const execute = useCallback(async (documentId: string) => {
    setState({ isLoading: true, error: null });

    const result = await councilApi.removeCouncilDocument(documentId);

    setState({ isLoading: false, error: result.error });

    return result;
  }, []);

  return { ...state, execute };
}
