'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useCopro } from '@/providers/CoproContext';
import {
  listAgMeetings,
  getAg,
  listResolutions,
  listAttendance,
  listVotes,
  listEligibleVoters,
  listAgVoters,
  createAg,
  addResolution,
  registerAttendance,
  castVote,
  closeAg,
  startAg,
  markConvoked,
  updateResolution,
  deleteResolution,
  reorderResolutions,
  updateAg,
  removeAttendance,
  signAttendance,
  generateAgDocument,
  listAgDocuments,
  getLatestAgDocument,
  getAgDocumentSignedUrl,
  downloadAgDocument,
  hasAgDocument,
  markPvGenerated,
} from '@/lib/ag/api';
import type {
  AgOverview,
  AgMeeting,
  AgResolutionResult,
  AgAttendanceSummary,
  AgVoteDetailed,
  AgStats,
  AgStatus,
  CreateAgInput,
  AddResolutionInput,
  RegisterAttendanceInput,
  CastVoteInput,
  CloseAgInput,
  CreateAgResponse,
  AddResolutionResponse,
  RegisterAttendanceResponse,
  CastVoteResponse,
  CloseAgResponse,
  AgDocument,
  AgDocumentType,
  GenerateDocumentResponse,
} from '@/lib/ag/types';

// ============================================================================
// useAgMeetings - Liste des AG d'une copropriété
// ============================================================================

export interface AgMeetingsFilters {
  search: string;
  status: AgStatus | 'ALL';
  period: 'upcoming' | 'past' | 'ALL';
}

const DEFAULT_FILTERS: AgMeetingsFilters = {
  search: '',
  status: 'ALL',
  period: 'ALL',
};

export function useAgMeetings(initialFilters?: Partial<AgMeetingsFilters>) {
  const { currentCoproId } = useCopro();

  const [meetings, setMeetings] = useState<AgOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AgMeetingsFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Charger les AG
  const loadMeetings = useCallback(async () => {
    if (!currentCoproId) {
      setMeetings([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listAgMeetings(currentCoproId);
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  // Charger au montage et quand la copro change
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // Filtrer les AG
  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((m) => {
      // Filtre recherche
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          m.title.toLowerCase().includes(search) ||
          m.location?.toLowerCase().includes(search) ||
          m.copro_name.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Filtre status
      if (filters.status !== 'ALL' && m.status !== filters.status) {
        return false;
      }

      // Filtre période
      if (filters.period !== 'ALL') {
        const meetingDate = new Date(m.meeting_date);
        if (filters.period === 'upcoming' && meetingDate < now) return false;
        if (filters.period === 'past' && meetingDate >= now) return false;
      }

      return true;
    });
  }, [meetings, filters]);

  // Prochaine AG (future, la plus proche)
  const nextMeeting = useMemo(() => {
    const now = new Date();
    const upcoming = meetings
      .filter((m) => new Date(m.meeting_date) >= now && m.status !== 'closed' && m.status !== 'pv_generated')
      .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
    return upcoming[0] || null;
  }, [meetings]);

  // AG passées (par date décroissante)
  const pastMeetings = useMemo(() => {
    const now = new Date();
    return meetings
      .filter((m) => m.status === 'closed' || m.status === 'pv_generated' || (new Date(m.meeting_date) < now && m.status !== 'draft'))
      .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());
  }, [meetings]);

  // Calculer les stats
  const stats = useMemo<AgStats>(() => {
    const now = new Date();
    return {
      total: meetings.length,
      draft: meetings.filter((m) => m.status === 'draft').length,
      convoked: meetings.filter((m) => m.status === 'convoked').length,
      inProgress: meetings.filter((m) => m.status === 'in_progress' || m.status === 'session_active').length,
      closed: meetings.filter((m) => m.status === 'closed').length,
      pvGenerated: meetings.filter((m) => m.status === 'pv_generated').length,
      upcoming: meetings.filter((m) => new Date(m.meeting_date) >= now).length,
      past: meetings.filter((m) => new Date(m.meeting_date) < now).length,
    };
  }, [meetings]);

  // Setters filtres
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setStatusFilter = useCallback((status: AgStatus | 'ALL') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setPeriodFilter = useCallback((period: 'upcoming' | 'past' | 'ALL') => {
    setFilters((prev) => ({ ...prev, period }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return {
    // Data
    meetings,
    filteredMeetings,
    nextMeeting,
    pastMeetings,
    isLoading,
    error,
    stats,

    // Filters
    filters,
    setSearch,
    setStatusFilter,
    setPeriodFilter,
    resetFilters,

    // Actions
    refresh: loadMeetings,
  };
}

// ============================================================================
// useAgDetail - Détail d'une AG
// ============================================================================

export function useAgDetail(agId: string | null) {
  const { currentCoproId } = useCopro();

  const [meeting, setMeeting] = useState<AgMeeting | null>(null);
  const [resolutions, setResolutions] = useState<AgResolutionResult[]>([]);
  const [attendance, setAttendance] = useState<AgAttendanceSummary[]>([]);
  const [quorum, setQuorum] = useState<{
    totalTantiemes: number;
    presentTantiemes: number;
    quorumRatio: number;
    attendeesCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données
  const loadData = useCallback(async () => {
    if (!agId) {
      setMeeting(null);
      setResolutions([]);
      setAttendance([]);
      setQuorum(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getAg(agId);
      if (data) {
        setMeeting(data.meeting);
        setResolutions(data.resolutions);
        setAttendance(data.attendance);
        setQuorum(data.quorum);
      } else {
        setError('AG non trouvée');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  // Charger au montage et quand l'ID change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Recharger juste les résolutions
  const refreshResolutions = useCallback(async () => {
    if (!agId) return;
    try {
      const data = await listResolutions(agId);
      setResolutions(data);
    } catch (err) {
      console.error('Error refreshing resolutions:', err);
    }
  }, [agId]);

  // Recharger juste les présences
  const refreshAttendance = useCallback(async () => {
    if (!agId) return;
    try {
      const data = await listAttendance(agId);
      setAttendance(data);
      // Recalculate quorum
      const fullData = await getAg(agId);
      if (fullData?.quorum) {
        setQuorum(fullData.quorum);
      }
    } catch (err) {
      console.error('Error refreshing attendance:', err);
    }
  }, [agId]);

  return {
    // Data
    meeting,
    resolutions,
    attendance,
    quorum,
    isLoading,
    error,

    // Actions
    refresh: loadData,
    refreshResolutions,
    refreshAttendance,
  };
}

// ============================================================================
// useAgVotes - Votes d'une résolution
// ============================================================================

export function useAgVotes(resolutionId: string | null) {
  const [votes, setVotes] = useState<AgVoteDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVotes = useCallback(async () => {
    if (!resolutionId) {
      setVotes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listVotes(resolutionId);
      setVotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [resolutionId]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  // Statistiques des votes
  const voteStats = useMemo(() => {
    const stats = {
      totalVotes: votes.length,
      votesFor: 0,
      votesAgainst: 0,
      votesAbstention: 0,
      tantiemesFor: 0,
      tantiemesAgainst: 0,
      tantiemesAbstention: 0,
    };

    for (const v of votes) {
      if (v.is_excluded) continue;
      if (v.vote === 'for') {
        stats.votesFor++;
        stats.tantiemesFor += v.tantiemes;
      } else if (v.vote === 'against') {
        stats.votesAgainst++;
        stats.tantiemesAgainst += v.tantiemes;
      } else if (v.vote === 'abstention') {
        stats.votesAbstention++;
        stats.tantiemesAbstention += v.tantiemes;
      }
    }

    return stats;
  }, [votes]);

  return {
    votes,
    voteStats,
    isLoading,
    error,
    refresh: loadVotes,
  };
}

// ============================================================================
// useEligibleVoters - Liste des copropriétaires éligibles
// ============================================================================

export function useEligibleVoters() {
  const { currentCoproId } = useCopro();

  const [voters, setVoters] = useState<Array<{
    coproprietaire_id: string;
    name: string;
    email: string | null;
    lot_ids: string[];
    lot_refs: string[];
    tantiemes: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVoters = useCallback(async () => {
    if (!currentCoproId) {
      setVoters([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listEligibleVoters(currentCoproId);
      setVoters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  useEffect(() => {
    loadVoters();
  }, [loadVoters]);

  return {
    voters,
    isLoading,
    error,
    refresh: loadVoters,
  };
}

// ============================================================================
// useAgVoters - Liste des copropriétaires pour une AG spécifique (DB-first)
// ============================================================================

/**
 * Charge les copropriétaires éligibles pour une AG via RPC sécurisée
 * Utilise rpc_get_ag_coproprietaires qui dérive copro_id depuis l'AG
 * C'est la version DB-first recommandée (vs useEligibleVoters qui utilise le contexte)
 */
export function useAgVoters(agId: string | undefined) {
  const [voters, setVoters] = useState<Array<{
    coproprietaire_id: string;
    name: string;
    email: string | null;
    lot_ids: string[];
    lot_refs: string[];
    tantiemes: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVoters = useCallback(async () => {
    if (!agId) {
      setVoters([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listAgVoters(agId);
      setVoters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  useEffect(() => {
    loadVoters();
  }, [loadVoters]);

  return {
    voters,
    isLoading,
    error,
    refresh: loadVoters,
  };
}

// ============================================================================
// MUTATIONS HOOKS
// ============================================================================

export function useCreateAg() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: Omit<CreateAgInput, 'copro_id'>): Promise<CreateAgResponse> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await createAg({ ...input, copro_id: currentCoproId });
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

export function useAddResolution() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: Omit<AddResolutionInput, 'copro_id'>): Promise<AddResolutionResponse> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await addResolution({ ...input, copro_id: currentCoproId });
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

export function useRegisterAttendance() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: Omit<RegisterAttendanceInput, 'copro_id'>): Promise<RegisterAttendanceResponse> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await registerAttendance({ ...input, copro_id: currentCoproId });
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

export function useCastVote() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: Omit<CastVoteInput, 'copro_id'>): Promise<CastVoteResponse> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await castVote({ ...input, copro_id: currentCoproId });
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

export function useCloseAg() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (input: Omit<CloseAgInput, 'copro_id'>): Promise<CloseAgResponse> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await closeAg({ ...input, copro_id: currentCoproId });
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

export function useStartAg() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (agId: string, openingNotes?: string): Promise<{ success: boolean; error?: string }> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await startAg({ ag_id: agId, copro_id: currentCoproId, opening_notes: openingNotes });
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

export function useMarkConvoked() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (agId: string): Promise<{ success: boolean; error?: string }> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await markConvoked(agId, currentCoproId);
        if (!result.success) {
          setError(result.error || 'Erreur inconnue');
        }
        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error };
}

// ============================================================================
// SIMPLE MUTATIONS
// ============================================================================

export function useUpdateResolution() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      resolutionId: string,
      updates: {
        title?: string;
        description?: string;
        resolution_type?: string;
        majority_type?: string;
        status?: string;
        variables?: Record<string, unknown>;
        is_customized?: boolean;
      }
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        await updateResolution(resolutionId, updates);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { execute, isLoading, error };
}

export function useDeleteResolution() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (resolutionId: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      await deleteResolution(resolutionId);
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
}

export function useReorderResolutions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (agId: string, resolutionIds: string[]): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        await reorderResolutions(agId, resolutionIds);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { execute, isLoading, error };
}

export function useUpdateAg() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      agId: string,
      updates: {
        title?: string;
        meeting_date?: string;
        location?: string;
        president_name?: string;
        secretary_name?: string;
        scrutineer1_name?: string;
        scrutineer2_name?: string;
        opening_notes?: string;
        closing_notes?: string;
      }
    ): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        await updateAg(agId, updates);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { execute, isLoading, error };
}

export function useRemoveAttendance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (attendanceId: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      await removeAttendance(attendanceId);
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { execute, isLoading, error };
}

export function useSignAttendance() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (attendanceId: string, signatureData: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        await signAttendance(attendanceId, signatureData);
        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { execute, isLoading, error };
}

// ============================================================================
// DOCUMENT HOOKS
// ============================================================================

/**
 * Hook pour gérer les documents d'une AG
 */
export function useAgDocuments(agId: string | null) {
  const [documents, setDocuments] = useState<AgDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les documents
  const loadDocuments = useCallback(async () => {
    if (!agId) {
      setDocuments([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await listAgDocuments(agId);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Obtenir le dernier document par type
  const getDocumentByType = useCallback(
    (docType: AgDocumentType): AgDocument | undefined => {
      return documents.find((d) => d.doc_type === docType);
    },
    [documents]
  );

  // Vérifier si un type de document existe
  const hasDocument = useCallback(
    (docType: AgDocumentType): boolean => {
      return documents.some((d) => d.doc_type === docType);
    },
    [documents]
  );

  return {
    documents,
    isLoading,
    error,
    refresh: loadDocuments,
    getDocumentByType,
    hasDocument,
  };
}

/**
 * Hook pour générer un document AG
 */
export function useGenerateAgDocument() {
  const { currentCoproId } = useCopro();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const execute = useCallback(
    async (
      agId: string,
      docType: AgDocumentType
    ): Promise<GenerateDocumentResponse> => {
      if (!currentCoproId) {
        return { success: false, error: 'Aucune copropriété sélectionnée' };
      }

      setIsLoading(true);
      setError(null);
      setProgress('Génération du document en cours...');

      try {
        const result = await generateAgDocument({
          copro_id: currentCoproId,
          ag_id: agId,
          doc_type: docType,
        });

        if (!result.success) {
          setError(result.error || 'Erreur lors de la génération');
          setProgress('');
        } else {
          setProgress('Document généré avec succès');

          // Si c'est un PV et qu'il y a un document_id, mettre à jour le statut de l'AG
          if (docType === 'pv' && result.document_id) {
            await markPvGenerated(agId, result.document_id);
          }
        }

        return result;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
        setProgress('');
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    [currentCoproId]
  );

  return { execute, isLoading, error, progress };
}

/**
 * Hook pour télécharger un document AG
 */
export function useDownloadAgDocument() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Télécharger via URL signée (ouvre dans une nouvelle fenêtre)
  const downloadViaSignedUrl = useCallback(
    async (storagePath: string, fileName?: string): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const { signedUrl } = await getAgDocumentSignedUrl(storagePath, 60); // 1 minute

        // Ouvrir dans une nouvelle fenêtre ou télécharger
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = fileName || 'document.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        return { success: true };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur lors du téléchargement';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Télécharger directement (retourne un Blob)
  const downloadBlob = useCallback(
    async (storagePath: string): Promise<{ success: boolean; blob?: Blob; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const blob = await downloadAgDocument(storagePath);
        return { success: true, blob };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur lors du téléchargement';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Obtenir une URL signée pour prévisualisation
  const getPreviewUrl = useCallback(
    async (storagePath: string, expiresInSeconds: number = 900): Promise<{ success: boolean; url?: string; expiresAt?: string; error?: string }> => {
      setIsLoading(true);
      setError(null);

      try {
        const { signedUrl, expiresAt } = await getAgDocumentSignedUrl(storagePath, expiresInSeconds);
        return { success: true, url: signedUrl, expiresAt };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur lors de la génération de l\'URL';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { downloadViaSignedUrl, downloadBlob, getPreviewUrl, isLoading, error };
}

/**
 * Hook pour vérifier la disponibilité des documents AG
 */
export function useAgDocumentStatus(agId: string | null) {
  const [status, setStatus] = useState<{
    convocation: boolean;
    attendance_sheet: boolean;
    pv: boolean;
  }>({
    convocation: false,
    attendance_sheet: false,
    pv: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!agId) {
      setStatus({ convocation: false, attendance_sheet: false, pv: false });
      return;
    }

    setIsLoading(true);

    try {
      const [hasConvocation, hasAttendance, hasPv] = await Promise.all([
        hasAgDocument(agId, 'convocation'),
        hasAgDocument(agId, 'attendance_sheet'),
        hasAgDocument(agId, 'pv'),
      ]);

      setStatus({
        convocation: hasConvocation,
        attendance_sheet: hasAttendance,
        pv: hasPv,
      });
    } catch (err) {
      console.error('Error checking document status:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return { status, isLoading, refresh: checkStatus };
}
