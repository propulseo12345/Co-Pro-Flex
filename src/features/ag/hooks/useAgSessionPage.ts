'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { PasserelleMajorite } from '@/types';
import type { Resolution, VoteData, SessionState, VoteChoice, VoteSource, VoteStats, PasserelleVoteInitial, EditingVariable } from '../types';
import {
  getResolutionStats,
  checkMajority,
  hasVotedByCorrespondance,
  validateResolutionVariables,
  generatePasserelleMentionPV
} from '@/components/features/ag/Session/utils';
import {
  integrerVotesCorrespondance,
  presencesEnrichiesVersSimple,
  basculerEnPresent,
  annulerBasculePresent,
  getCoproprietairesAvecVoteCorrespondance,
  type PresenceData
} from '@/lib/utils/ag-session';
import { MAJORITES, type MajorityType } from '@/lib/constants/resolutions';
import { isResolutionInformation } from '@/lib/utils/ag-variables';
import { useGlobalVariables } from '@/hooks/useGlobalVariables';
import { useAGSessionPersistence } from '@/hooks/modules/useAGSessionPersistence';
import {
  getOrCreateProjectorToken,
  getProjectorUrl,
} from '@/lib/utils/projector-token';
import {
  PROJECTOR_STORAGE_KEYS,
  type ProjectorSessionData,
  type ProjectorVoteStats,
  type ProjectorQuorum,
} from '@/types/projector';
import { useCopro } from '@/providers/CoproContext';
import { useAgDetail, useAgVoters, useCastVote, useRegisterAttendance, useStartAg } from '@/hooks/modules/useAgData';
import type { VoteDirection, MajorityType as DbMajorityType } from '@/lib/ag/types';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';

// Debounce helper
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Session data stored in ag_session_drafts(type='session')
interface SessionDraftData {
  started: boolean;
  currentResolutionIndex: number;
  completedResolutions: string[];
  isSecondVote?: boolean;
  passerelleResolution?: Resolution | null;
  passerelleVoteInitial?: PasserelleVoteInitial | null;
  presencesEnrichies?: Record<string, PresenceData>;
}

interface UseAgSessionPageParams {
  agId: string;
}

// Map frontend vote to backend
function toDbVote(vote: VoteChoice): VoteDirection | null {
  if (vote === 'POUR') return 'for';
  if (vote === 'CONTRE') return 'against';
  if (vote === 'ABSTENTION') return 'abstention';
  return null;
}

// Map backend vote to frontend
function fromDbVote(vote: VoteDirection): VoteChoice {
  if (vote === 'for') return 'POUR';
  if (vote === 'against') return 'CONTRE';
  if (vote === 'abstention') return 'ABSTENTION';
  return null;
}

// Map frontend majority type to backend
function fromDbMajorityType(type: DbMajorityType): MajorityType {
  const map: Record<DbMajorityType, MajorityType> = {
    'art24': 'ART_24',
    'art25': 'ART_25',
    'art25_1': 'ART_25_1',
    'art26': 'ART_26',
    'art26_1': 'ART_26_1',
    'unanimity': 'UNANIMITE',
  };
  return map[type] || 'ART_24';
}

export function useAgSessionPage({ agId }: UseAgSessionPageParams) {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();

  // Supabase data
  const { meeting, resolutions: dbResolutions, attendance: dbAttendance, quorum: dbQuorum, isLoading: dbLoading, refreshAttendance } = useAgDetail(agId);
  const { voters } = useAgVoters(agId);
  const castVoteMutation = useCastVote();
  const registerAttendanceMutation = useRegisterAttendance();
  const startAgMutation = useStartAg();

  // Check if using Supabase data
  const useSupabase = useMemo(() => {
    return meeting && meeting.id === agId;
  }, [meeting, agId]);

  // Build coproprietaires list from Supabase voters or fallback
  const coproprietaires = useMemo(() => {
    if (voters.length > 0) {
      return voters.map(v => ({
        id: v.coproprietaire_id,
        nom: v.name,
        email: v.email,
        tantiemes: v.tantiemes,
        lotIds: v.lot_ids,
        lotRefs: v.lot_refs,
      }));
    }
    return [];
  }, [voters]);

  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    started: false, currentResolutionIndex: 0, completedResolutions: []
  });
  const [presences, setPresences] = useState<Record<string, boolean>>({});
  const [presencesEnrichies, setPresencesEnrichies] = useState<Record<string, PresenceData>>({});
  const [showResultModal, setShowResultModal] = useState(false);
  const [pendingNextResolution, setPendingNextResolution] = useState(false);
  const [showPasserelleModal, setShowPasserelleModal] = useState(false);
  const [passerelleResolution, setPasserelleResolution] = useState<Resolution | null>(null);
  const [passerelleVoteInitial, setPasserelleVoteInitial] = useState<PasserelleVoteInitial | null>(null);
  const [isSecondVote, setIsSecondVote] = useState(false);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<EditingVariable | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [showPrefillDropdown, setShowPrefillDropdown] = useState<string | null>(null);
  const [showProjectorModal, setShowProjectorModal] = useState(false);
  const [projectorUrl, setProjectorUrl] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const projectorVersionRef = useRef<number>(0);

  const {
    status: persistenceStatus,
    isRestoring,
    lastSaveDate,
    hasUnsavedChanges,
    restoreResult,
    error: persistenceError,
    isOnline,
    savePresences,
    saveResolutionState,
    saveSessionStarted,
    markDirty,
    hasExistingData,
    setDataGetter,
    retryRestore,
    startNewSession,
  } = useAGSessionPersistence({
    agId,
    autoSaveInterval: 30000,
    enableAutoSave: true,
    restoreTimeout: 10000,
    onRestore: (data) => {
      if (data.presencesEnrichies) {
        setPresencesEnrichies(data.presencesEnrichies);
        setPresences(presencesEnrichiesVersSimple(data.presencesEnrichies));
      }
      if (data.sessionStarted !== undefined) {
        setSessionState(prev => ({ ...prev, started: data.sessionStarted! }));
      }
      if (data.resolutionActiveIndex !== undefined) {
        setSessionState(prev => ({ ...prev, currentResolutionIndex: data.resolutionActiveIndex! }));
      }
      if (data.completedResolutions) {
        setSessionState(prev => ({ ...prev, completedResolutions: data.completedResolutions! }));
      }
    },
  });

  useEffect(() => {
    setDataGetter(() => ({
      presencesEnrichies,
      resolutionActiveIndex: sessionState.currentResolutionIndex,
      completedResolutions: sessionState.completedResolutions,
      sessionStarted: sessionState.started,
    }));
  }, [presencesEnrichies, sessionState, setDataGetter]);

  const { prefillVariables, mergeVariables, nomSyndic } = useGlobalVariables({
    agId,
    userVariables: variableValues
  });

  const allVariables = useMemo(() => mergeVariables(variableValues), [mergeVariables, variableValues]);

  // Load data - from Supabase drafts first, then ag_* tables
  useEffect(() => {
    const loadSessionData = async () => {
      // Load resolutions from DB if available
      if (useSupabase && dbResolutions.length > 0) {
        const frontendRes: Resolution[] = dbResolutions.map(r => ({
          id: r.id,
          titre: r.title,
          texte: r.description || '',
          majorite: fromDbMajorityType(r.majority_type),
          custom: true,
          resultat: r.is_approved === true ? 'ADOPTEE' : r.is_approved === false ? 'REJETEE' : undefined,
          // Include variables from Supabase for template interpolation
          variables: r.variables as Record<string, string> | undefined,
        }));
        setResolutions(frontendRes);

        // Initialize variableValues: prioritize draft, then resolution.variables
        const variablesDraft = await loadDraft<Record<string, string>>(agId, 'variables');
        if (variablesDraft.data) {
          // Use variables from draft (user edits during session)
          setVariableValues(variablesDraft.data);
        } else {
          // Merge all resolution variables into a single object (from step 2 edits)
          const mergedVariables: Record<string, string> = {};
          for (const res of dbResolutions) {
            if (res.variables && typeof res.variables === 'object') {
              const vars = res.variables as Record<string, unknown>;
              for (const [key, value] of Object.entries(vars)) {
                if (value !== null && value !== undefined) {
                  mergedVariables[key] = String(value);
                }
              }
            }
          }
          if (Object.keys(mergedVariables).length > 0) {
            setVariableValues(mergedVariables);
          }
        }
      }
      // Note: Legacy non-UUID AGs are no longer supported - all AGs must be Supabase UUIDs

      // Load votes draft from Supabase
      const votesDraft = await loadDraft<VoteData[]>(agId, 'votes');
      let loadedVotes: VoteData[] = [];
      if (votesDraft.data && Array.isArray(votesDraft.data)) {
        loadedVotes = votesDraft.data.map(v => ({
          ...v, source: v.vote !== null ? 'CORRESPONDANCE' as VoteSource : null
        }));
        setVotes(loadedVotes);
      }

      // Load session draft from Supabase
      const sessionDraft = await loadDraft<SessionDraftData>(agId, 'session');
      if (sessionDraft.data) {
        const sessionData = sessionDraft.data;
        setSessionState({
          started: sessionData.started || false,
          currentResolutionIndex: sessionData.currentResolutionIndex || 0,
          completedResolutions: sessionData.completedResolutions || []
        });
        if (sessionData.isSecondVote) setIsSecondVote(sessionData.isSecondVote);
        if (sessionData.passerelleResolution) setPasserelleResolution(sessionData.passerelleResolution);
        if (sessionData.passerelleVoteInitial) setPasserelleVoteInitial(sessionData.passerelleVoteInitial);
        if (sessionData.presencesEnrichies) {
          setPresencesEnrichies(sessionData.presencesEnrichies);
          setPresences(presencesEnrichiesVersSimple(sessionData.presencesEnrichies));
        }
      }

      // Note: Variables are now loaded earlier along with resolutions (from draft or merged from resolution.variables)

      // Initialize presences from Supabase attendance or coproprietaires
      if (useSupabase && dbAttendance.length > 0) {
        const enrichies: Record<string, PresenceData> = {};
        const simplePresences: Record<string, boolean> = {};

        for (const att of dbAttendance) {
          const mode = att.presence_type === 'present' ? 'present'
            : att.presence_type === 'proxy' ? 'represente'
            : att.presence_type === 'correspondence' ? 'correspondance'
            : 'absent';

          enrichies[att.coproprietaire_id] = {
            coproprietaireId: att.coproprietaire_id,
            mode,
            voteCorrespondanceNeutralise: false,
            mandataireId: att.represented_by_name ? undefined : undefined,
          };
          simplePresences[att.coproprietaire_id] = mode !== 'absent';
        }

        // Add missing coproprietaires as absent
        for (const copro of coproprietaires) {
          if (!enrichies[copro.id]) {
            enrichies[copro.id] = { coproprietaireId: copro.id, mode: 'absent', voteCorrespondanceNeutralise: false };
            simplePresences[copro.id] = false;
          }
        }

        setPresencesEnrichies(enrichies);
        setPresences(simplePresences);
      } else if (coproprietaires.length > 0) {
        // Initialize from coproprietaires list
        const initialPresences: Record<string, boolean> = {};
        coproprietaires.forEach(copro => { initialPresences[copro.id] = false; });
        setPresences(initialPresences);

        const enrichies = integrerVotesCorrespondance(initialPresences, loadedVotes);
        setPresencesEnrichies(enrichies);
        setPresences(presencesEnrichiesVersSimple(enrichies));
      }
    };

    loadSessionData();
  }, [agId, useSupabase, dbResolutions, dbAttendance, coproprietaires]);

  const votesCorrespondanceCount = useMemo(() => {
    return getCoproprietairesAvecVoteCorrespondance(votes).size;
  }, [votes]);

  const handlePresenceToggle = useCallback(async (coproId: string) => {
    setPresences(prev => ({ ...prev, [coproId]: !prev[coproId] }));
    setPresencesEnrichies(prev => {
      const current = prev[coproId];
      if (!current) return prev;
      if (current.mode === 'correspondance') return prev;
      const newMode = current.mode === 'present' ? 'absent' : 'present';
      return { ...prev, [coproId]: { ...current, mode: newMode } };
    });
    markDirty();
  }, [markDirty]);

  const selectAllPresences = useCallback(() => {
    const allPresent = Object.values(presences).every(p => p);
    const newPresences: Record<string, boolean> = {};
    const newPresencesEnrichies: Record<string, PresenceData> = { ...presencesEnrichies };

    coproprietaires.forEach(copro => {
      const current = presencesEnrichies[copro.id];
      if (current?.mode === 'correspondance') {
        newPresences[copro.id] = true;
      } else {
        newPresences[copro.id] = !allPresent;
        if (current) {
          newPresencesEnrichies[copro.id] = { ...current, mode: !allPresent ? 'present' : 'absent' };
        }
      }
    });

    setPresences(newPresences);
    setPresencesEnrichies(newPresencesEnrichies);
    markDirty();
  }, [presences, presencesEnrichies, coproprietaires, markDirty]);

  const handleBasculerPresent = useCallback((coproId: string) => {
    setPresencesEnrichies(prev => basculerEnPresent(prev, coproId));
    setPresences(prev => ({ ...prev, [coproId]: true }));
    markDirty();
  }, [markDirty]);

  const handleAnnulerBascule = useCallback((coproId: string) => {
    setPresencesEnrichies(prev => annulerBasculePresent(prev, coproId, votes));
    setPresences(prev => ({ ...prev, [coproId]: true }));
    markDirty();
  }, [votes, markDirty]);

  const handleVote = useCallback(async (resolutionId: string, coproId: string, vote: VoteChoice) => {
    if (hasVotedByCorrespondance(votes, resolutionId, coproId)) return;

    // Update local state
    setVotes(prev => {
      const existing = prev.find(v => v.resolutionId === resolutionId && v.coproprietaireId === coproId);
      if (existing) {
        return prev.map(v => v.resolutionId === resolutionId && v.coproprietaireId === coproId
          ? { ...v, vote, source: 'DIRECT' as VoteSource } : v);
      }
      const copro = coproprietaires.find(c => c.id === coproId);
      return [...prev, { resolutionId, coproprietaireId: coproId, vote, tantiemes: copro?.tantiemes || 0, source: 'DIRECT' as VoteSource }];
    });

    // Sync to Supabase if using it and vote is not null
    if (useSupabase && isManager && vote && toDbVote(vote)) {
      await castVoteMutation.execute({
        resolution_id: resolutionId,
        coproprietaire_id: coproId,
        vote: toDbVote(vote)!,
        vote_source: 'live',
      });
    }
  }, [votes, coproprietaires, useSupabase, isManager, castVoteMutation]);

  const selectAllVotes = useCallback((resolutionId: string, voteType: VoteChoice) => {
    const presentCopros = coproprietaires.filter(copro => presences[copro.id] && !hasVotedByCorrespondance(votes, resolutionId, copro.id));
    const allHaveThisVote = presentCopros.every(copro => {
      const voteData = votes.find(v => v.resolutionId === resolutionId && v.coproprietaireId === copro.id);
      return voteData?.vote === voteType;
    });
    if (allHaveThisVote) {
      setVotes(prev => prev.map(v => v.resolutionId === resolutionId && presentCopros.some(c => c.id === v.coproprietaireId) && v.source !== 'CORRESPONDANCE' ? { ...v, vote: null } : v));
    } else {
      setVotes(prev => {
        const newVotes = [...prev];
        presentCopros.forEach(copro => {
          const existing = newVotes.find(v => v.resolutionId === resolutionId && v.coproprietaireId === copro.id);
          if (existing) { const index = newVotes.indexOf(existing); newVotes[index] = { ...existing, vote: voteType, source: 'DIRECT' }; }
          else { newVotes.push({ resolutionId, coproprietaireId: copro.id, vote: voteType, tantiemes: copro.tantiemes, source: 'DIRECT' }); }
        });
        return newVotes;
      });
    }
  }, [presences, votes, coproprietaires]);

  const handleVariableClick = useCallback((variableName: string) => {
    setEditingVariable({ name: variableName, value: allVariables[variableName] || '' });
    setShowVariableModal(true);
  }, [allVariables]);

  // Debounced save for variables
  const debouncedSaveVariables = useMemo(
    () => debounce((values: Record<string, string>) => {
      saveDraft(agId, 'variables', values);
    }, 500),
    [agId]
  );

  const handleSaveVariable = useCallback(() => {
    if (editingVariable) {
      const newValues = { ...variableValues, [editingVariable.name]: editingVariable.value };
      setVariableValues(newValues);
      debouncedSaveVariables(newValues);
      setShowVariableModal(false);
      setEditingVariable(null);
    }
  }, [editingVariable, variableValues, debouncedSaveVariables]);

  const handlePrefillFromCopro = useCallback((variableName: string, coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (copro) {
      const newValues = { ...variableValues, [variableName]: copro.nom };
      setVariableValues(newValues);
      debouncedSaveVariables(newValues);
    }
    setShowPrefillDropdown(null);
  }, [variableValues, coproprietaires, debouncedSaveVariables]);

  const currentResolution = resolutions[sessionState.currentResolutionIndex];
  const stats = currentResolution ? getResolutionStats(votes, currentResolution.id) : null;
  const totalTantiemes = useMemo(() => coproprietaires.reduce((sum, c) => sum + c.tantiemes, 0), [coproprietaires]);
  const isCurrentResolutionInfo = currentResolution ? isResolutionInformation(currentResolution) : false;

  const handleValidateVote = useCallback(() => {
    if (!currentResolution || !stats) return;
    const result = checkMajority(currentResolution, stats, votes);
    if (result.passerelle251Eligible && currentResolution.majorite === 'ART_25') {
      setPasserelleResolution(currentResolution);
      setPasserelleVoteInitial({ stats, result, votes: votes.filter(v => v.resolutionId === currentResolution.id) });
      setShowPasserelleModal(true);
    } else {
      setShowResultModal(true);
    }
  }, [currentResolution, stats, votes]);

  const handleNextWithValidation = useCallback(() => {
    if (!currentResolution) return;
    const missing = validateResolutionVariables(currentResolution, allVariables);
    if (missing.length > 0) {
      setMissingVariables(missing);
      setShowValidationWarning(true);
    } else {
      setPendingNextResolution(true);
      setShowResultModal(true);
    }
  }, [currentResolution, allVariables]);

  const saveSession = useCallback(async () => {
    const sessionData: SessionDraftData = {
      ...sessionState,
      isSecondVote,
      passerelleResolution,
      passerelleVoteInitial,
      presencesEnrichies
    };
    await saveDraft(agId, 'session', sessionData);
    await saveDraft(agId, 'votes', votes);
  }, [agId, sessionState, isSecondVote, passerelleResolution, passerelleVoteInitial, presencesEnrichies, votes]);

  const handleNextResolution = useCallback(() => {
    if (sessionState.currentResolutionIndex < resolutions.length - 1) {
      const current = resolutions[sessionState.currentResolutionIndex];
      const newIndex = sessionState.currentResolutionIndex + 1;
      const newCompleted = [...sessionState.completedResolutions, current.id];
      setSessionState(prev => ({ ...prev, currentResolutionIndex: newIndex, completedResolutions: newCompleted }));
      saveResolutionState(newIndex, newCompleted);
      saveSession();
    }
  }, [sessionState, resolutions, saveResolutionState, saveSession]);

  const handlePasserelleSecondVote = useCallback(() => {
    setShowPasserelleModal(false);
    setIsSecondVote(true);
  }, []);

  const handlePasserelleAjournement = useCallback(() => {
    if (!passerelleResolution || !passerelleVoteInitial) return;
    const passerelleData: PasserelleMajorite = {
      type: 'PASSERELLE_25_1',
      dateActivation: new Date().toISOString(),
      conditionRemplie: true,
      voteInitial: {
        pour: passerelleVoteInitial.stats.pour,
        contre: passerelleVoteInitial.stats.contre,
        abstention: passerelleVoteInitial.stats.abstention,
        majoriteRequise: 'Article 25'
      },
      mentionPV: generatePasserelleMentionPV(passerelleVoteInitial.stats, null, 'AJOURNEE', totalTantiemes)
    };
    updateResolutionWithPasserelle(passerelleResolution.id, passerelleData, 'AJOURNEE');
    setShowPasserelleModal(false);
    setShowResultModal(true);
  }, [passerelleResolution, passerelleVoteInitial, totalTantiemes]);

  const handleValidateSecondVote = useCallback(() => {
    if (!passerelleResolution || !passerelleVoteInitial || !stats) return;
    const voixExprimees = stats.pour + stats.contre + stats.abstention;
    const adoptedArt24 = voixExprimees > 0 && stats.pour > (voixExprimees / 2);
    const resultat = adoptedArt24 ? 'ADOPTEE' : 'REJETEE';
    const passerelleData: PasserelleMajorite = {
      type: 'PASSERELLE_25_1',
      dateActivation: new Date().toISOString(),
      conditionRemplie: true,
      voteInitial: {
        pour: passerelleVoteInitial.stats.pour,
        contre: passerelleVoteInitial.stats.contre,
        abstention: passerelleVoteInitial.stats.abstention,
        majoriteRequise: 'Article 25'
      },
      secondVote: {
        pour: stats.pour,
        contre: stats.contre,
        abstention: stats.abstention,
        majoriteRequise: 'Article 24',
        resultat,
        dateVote: new Date().toISOString()
      },
      mentionPV: generatePasserelleMentionPV(passerelleVoteInitial.stats, stats, resultat, totalTantiemes)
    };
    updateResolutionWithPasserelle(passerelleResolution.id, passerelleData, resultat);
    setIsSecondVote(false);
    setShowResultModal(true);
  }, [passerelleResolution, passerelleVoteInitial, stats, totalTantiemes]);

  const updateResolutionWithPasserelle = useCallback((resolutionId: string, passerelleData: PasserelleMajorite, resultat: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE') => {
    setResolutions(prev => prev.map(r => r.id === resolutionId ? { ...r, passerelle: passerelleData, resultat } : r));
    const updatedResolutions = resolutions.map(r => r.id === resolutionId ? { ...r, passerelle: passerelleData, resultat } : r);
    // Save resolutions state to drafts (for passerelle tracking)
    saveDraft(agId, 'resolutions', updatedResolutions);
  }, [resolutions, agId]);

  const handleNavigateToResolution = useCallback((index: number) => {
    if (index >= 0 && index < resolutions.length && !isSecondVote) {
      setSessionState(prev => ({ ...prev, currentResolutionIndex: index }));
      saveResolutionState(index, sessionState.completedResolutions);
    }
  }, [resolutions.length, isSecondVote, saveResolutionState, sessionState.completedResolutions]);

  // Projector
  const calculateProjectorQuorum = useCallback((): ProjectorQuorum => {
    const total = totalTantiemes;
    let presentTantiemes = 0;
    let presentCount = 0;
    let representedCount = 0;
    let correspondanceCount = 0;

    coproprietaires.forEach(copro => {
      const presence = presencesEnrichies[copro.id];
      if (presence) {
        switch (presence.mode) {
          case 'present':
            presentTantiemes += copro.tantiemes;
            presentCount++;
            break;
          case 'represente':
            presentTantiemes += copro.tantiemes;
            representedCount++;
            break;
          case 'correspondance':
            if (!presence.voteCorrespondanceNeutralise) {
              presentTantiemes += copro.tantiemes;
              correspondanceCount++;
            }
            break;
        }
      }
    });

    const required = Math.floor(total / 2) + 1;
    const reached = presentTantiemes >= required;

    return {
      required,
      current: presentTantiemes,
      reached,
      percentagePresent: total > 0 ? (presentTantiemes / total) * 100 : 0,
      totalCoproprietaires: coproprietaires.length,
      presentCount,
      representedCount,
      correspondanceCount,
    };
  }, [presencesEnrichies, totalTantiemes, coproprietaires]);

  const publishProjectorData = useCallback(() => {
    const currentResolution = resolutions[sessionState.currentResolutionIndex];

    let projectorStats: ProjectorVoteStats | null = null;
    if (currentResolution && stats) {
      const totalExprime = stats.pour + stats.contre + stats.abstention;
      projectorStats = {
        pour: stats.pour,
        contre: stats.contre,
        abstention: stats.abstention,
        nonVote: stats.nonVote,
        totalExprime,
        totalTantiemes,
        pourcentagePour: totalTantiemes > 0 ? (stats.pour / totalTantiemes) * 100 : 0,
        pourcentageContre: totalTantiemes > 0 ? (stats.contre / totalTantiemes) * 100 : 0,
        pourcentageAbstention: totalTantiemes > 0 ? (stats.abstention / totalTantiemes) * 100 : 0,
        pourcentageNonVote: totalTantiemes > 0 ? (stats.nonVote / totalTantiemes) * 100 : 0,
      };
    }

    const tokenData = getOrCreateProjectorToken(agId);

    const determineVoteStatus = (): 'waiting' | 'in_progress' | 'closed' => {
      if (!currentResolution) return 'waiting';
      if (sessionState.completedResolutions.includes(currentResolution.id)) return 'closed';
      return 'in_progress';
    };

    projectorVersionRef.current += 1;

    const projectorData: ProjectorSessionData = {
      agId,
      agTitle: meeting?.title || 'Assemblée Générale',
      agDate: meeting?.meeting_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      coproprieteNom: 'Résidence',
      lastUpdated: new Date().toISOString(),
      version: projectorVersionRef.current,
      sessionStarted: sessionState.started,
      sessionPaused: false,
      sessionEnded: sessionState.currentResolutionIndex >= resolutions.length - 1 &&
        sessionState.completedResolutions.includes(currentResolution?.id || ''),
      currentResolution: currentResolution ? {
        id: currentResolution.id,
        numero: sessionState.currentResolutionIndex + 1,
        titre: currentResolution.titre,
        texte: currentResolution.texte,
        majorite: currentResolution.majorite as MajorityType,
        majoriteLabel: MAJORITES[currentResolution.majorite as MajorityType]?.nom || currentResolution.majorite,
        isInformation: isResolutionInformation(currentResolution),
        voteStatus: determineVoteStatus(),
        stats: projectorStats,
        result: stats ? {
          adopted: checkMajority(currentResolution, stats, votes).adopted,
          reason: checkMajority(currentResolution, stats, votes).reason,
        } : null,
      } : null,
      resolutionIndex: sessionState.currentResolutionIndex,
      totalResolutions: resolutions.length,
      completedResolutions: sessionState.completedResolutions,
      quorum: calculateProjectorQuorum(),
      accessToken: tokenData.token,
      tokenCreatedAt: tokenData.createdAt,
      voteUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/ag/${agId}/session`,
    };

    localStorage.setItem(PROJECTOR_STORAGE_KEYS.DATA(agId), JSON.stringify(projectorData));
  }, [agId, resolutions, sessionState, stats, votes, calculateProjectorQuorum, totalTantiemes, meeting]);

  useEffect(() => {
    if (sessionState.started) {
      publishProjectorData();
    }
  }, [sessionState, votes, presencesEnrichies, publishProjectorData]);

  const handleOpenProjector = useCallback(() => {
    const tokenData = getOrCreateProjectorToken(agId);
    const url = getProjectorUrl(agId, tokenData.token);
    setProjectorUrl(url);
    setShowProjectorModal(true);
  }, [agId]);

  const handleCopyProjectorUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(projectorUrl);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = projectorUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedToClipboard(true);
      setTimeout(() => setCopiedToClipboard(false), 2000);
    }
  }, [projectorUrl]);

  const handleOpenProjectorNewTab = useCallback(() => {
    window.open(projectorUrl, '_blank');
  }, [projectorUrl]);

  const handleExportCSV = useCallback(() => {
    const lines: string[] = [];
    lines.push('Type;Données');
    lines.push('');
    lines.push('=== FEUILLE DE PRESENCE ===');
    lines.push('Copropriétaire;Tantièmes;Mode participation');
    coproprietaires.forEach(copro => {
      const presence = presencesEnrichies[copro.id];
      const mode = presence?.mode || 'absent';
      const modeLabel = mode === 'present' ? 'Présent'
        : mode === 'correspondance' ? 'Vote par correspondance'
        : mode === 'represente' ? 'Représenté'
        : 'Absent';
      lines.push(`${copro.nom};${copro.tantiemes};${modeLabel}`);
    });
    lines.push('');
    lines.push('=== RESULTATS DES VOTES ===');
    resolutions.forEach((resolution, idx) => {
      const isInfo = isResolutionInformation(resolution);
      lines.push('');
      lines.push(`Résolution ${idx + 1}: ${resolution.titre}`);
      lines.push(`Majorité requise: ${resolution.majorite}`);
      if (isInfo) {
        lines.push('Type: Point d\'information (sans vote)');
      } else {
        const resStats = getResolutionStats(votes, resolution.id);
        const result = checkMajority(resolution, resStats, votes);
        lines.push(`Pour: ${resStats.pour} tantièmes`);
        lines.push(`Contre: ${resStats.contre} tantièmes`);
        lines.push(`Abstention: ${resStats.abstention} tantièmes`);
        lines.push(`Résultat: ${result.adopted ? 'ADOPTÉE' : 'REJETÉE'}`);
      }
    });
    const csvContent = lines.join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resultats-ag-${agId}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [agId, presencesEnrichies, resolutions, votes, coproprietaires]);

  const handleStartSession = useCallback(async () => {
    // Sync attendance to Supabase
    if (useSupabase && isManager) {
      for (const copro of coproprietaires) {
        const presence = presencesEnrichies[copro.id];
        if (presence && presence.mode !== 'absent') {
          await registerAttendanceMutation.execute({
            ag_id: agId,
            coproprietaire_id: copro.id,
            lot_ids: copro.lotIds,
            presence_type: presence.mode === 'present' ? 'present'
              : presence.mode === 'represente' ? 'proxy'
              : 'correspondence',
            represented_by_name: undefined,
          });
        }
      }

      // Start AG in database
      await startAgMutation.execute(agId);
      await refreshAttendance();
    }

    setSessionState(prev => ({ ...prev, started: true }));
    saveSessionStarted(true);
    savePresences(presencesEnrichies);
  }, [useSupabase, isManager, coproprietaires, presencesEnrichies, registerAttendanceMutation, agId, startAgMutation, refreshAttendance, saveSessionStarted, savePresences]);

  const handlePauseSession = useCallback(() => {
    setSessionState(prev => ({ ...prev, started: false }));
  }, []);

  const handlePrevResolution = useCallback(() => {
    setSessionState(prev => ({ ...prev, currentResolutionIndex: Math.max(0, prev.currentResolutionIndex - 1) }));
  }, []);

  const closeResultModal = useCallback(() => {
    setShowResultModal(false);
    setPendingNextResolution(false);
  }, []);

  const confirmNextFromModal = useCallback(() => {
    setShowResultModal(false);
    handleNextResolution();
    setPendingNextResolution(false);
  }, [handleNextResolution]);

  const closeVariableModal = useCallback(() => {
    setShowVariableModal(false);
    setEditingVariable(null);
  }, []);

  const closeValidationWarning = useCallback(() => {
    setShowValidationWarning(false);
    setMissingVariables([]);
  }, []);

  const confirmContinueWithWarning = useCallback(() => {
    setShowValidationWarning(false);
    setMissingVariables([]);
    setPendingNextResolution(true);
    setShowResultModal(true);
  }, []);

  const closeProjectorModal = useCallback(() => {
    setShowProjectorModal(false);
  }, []);

  const goBack = useCallback(() => {
    router.push(`/ag/${agId}/preparation`);
  }, [router, agId]);

  const goToPV = useCallback(() => {
    saveSession();
    router.push(`/ag/${agId}/pv`);
  }, [router, agId, saveSession]);

  return {
    // State
    resolutions,
    votes,
    sessionState,
    presences,
    presencesEnrichies,
    votesCorrespondanceCount,
    currentResolution,
    stats,
    totalTantiemes,
    isCurrentResolutionInfo,
    isSecondVote,
    allVariables,
    prefillVariables,
    variableValues,

    // Modals state
    showResultModal,
    pendingNextResolution,
    showPasserelleModal,
    passerelleResolution,
    passerelleVoteInitial,
    showVariableModal,
    editingVariable,
    showValidationWarning,
    missingVariables,
    showPrefillDropdown,
    showProjectorModal,
    projectorUrl,
    copiedToClipboard,

    // Persistence state
    persistenceStatus,
    isRestoring,
    lastSaveDate,
    hasUnsavedChanges,
    restoreResult,
    persistenceError,
    isOnline,
    hasExistingData,
    retryRestore,
    startNewSession,

    // Presence handlers
    handlePresenceToggle,
    selectAllPresences,
    handleBasculerPresent,
    handleAnnulerBascule,

    // Vote handlers
    handleVote,
    selectAllVotes,
    handleValidateVote,
    handleNextWithValidation,
    handleNextResolution,
    handlePrevResolution,
    handleNavigateToResolution,
    handleValidateSecondVote,

    // Passerelle handlers
    handlePasserelleSecondVote,
    handlePasserelleAjournement,

    // Variable handlers
    handleVariableClick,
    handleSaveVariable,
    handlePrefillFromCopro,
    setEditingVariable,
    setShowPrefillDropdown,

    // Session handlers
    handleStartSession,
    handlePauseSession,
    saveSession,

    // Projector handlers
    handleOpenProjector,
    handleCopyProjectorUrl,
    handleOpenProjectorNewTab,
    closeProjectorModal,

    // Export
    handleExportCSV,

    // Modal handlers
    closeResultModal,
    confirmNextFromModal,
    closeVariableModal,
    closeValidationWarning,
    confirmContinueWithWarning,
    setShowPasserelleModal,

    // Navigation
    goBack,
    goToPV,

    // Supabase integration
    useSupabase,
    isManager,
    meeting,
    dbLoading,
    coproprietaires,
  };
}
