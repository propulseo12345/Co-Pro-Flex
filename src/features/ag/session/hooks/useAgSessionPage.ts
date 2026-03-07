'use client';

import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { useAgDetail, useAgVoters, useCastVote, useRegisterAttendance, useStartAg } from '@/hooks/modules/useAgData';
import { useAGSessionPersistence } from '@/hooks/modules/useAGSessionPersistence';
import { loadDraft, saveDraft } from '@/lib/ag/draft-persistence';
import { presencesEnrichiesVersSimple } from '@/lib/utils/ag-session';
import { createClient } from '@/lib/supabase/client';

import { checkMajority } from '@/components/features/ag/Session/utils';
import { updateResolution } from '@/lib/ag/api/resolutions.api';
import { cancelAgSession, finishAgSession } from '@/lib/ag/api';
import { castVote as castVoteApi } from '@/lib/ag/api/votes.api';
import type { UseAgSessionPageParams, UseAgSessionPageReturn, SessionDraftData, VoteData, VoteSource } from '../types';
import { toDbVote } from '../services/sessionHelpers';

import { useSessionParticipants } from './useSessionParticipants';
import { useSessionPresence } from './useSessionPresence';
import { useSessionVoting } from './useSessionVoting';
import { useSessionResolutions } from './useSessionResolutions';
import { useSessionVariables } from './useSessionVariables';
import { useSessionProjector } from './useSessionProjector';
import { useSessionModals } from './useSessionModals';
import { exportSessionToCSV } from '../services/sessionExport';

type DesignationCategorie = 'scrutateur' | 'conseil_syndical';

function getDesignationCategorie(titre: string): DesignationCategorie | null {
  const lower = titre.toLowerCase();
  if (lower.includes('scrutateur')) return 'scrutateur';
  if (lower.includes('membre') && lower.includes('conseil syndical')) return 'conseil_syndical';
  return null;
}

export function useAgSessionPage({ agId }: UseAgSessionPageParams): UseAgSessionPageReturn {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();

  // Supabase data hooks
  const { meeting, resolutions: dbResolutions, attendance: dbAttendance, isLoading: dbLoading, refreshAttendance } = useAgDetail(agId);
  const { voters } = useAgVoters(agId);
  const castVoteMutation = useCastVote();
  const registerAttendanceMutation = useRegisterAttendance();
  const startAgMutation = useStartAg();

  const useSupabase = meeting && meeting.id === agId;

  // Participants hook
  const { coproprietaires, totalTantiemes } = useSessionParticipants(voters);

  // Persistence hook
  const persistence = useAGSessionPersistence({
    agId,
    autoSaveInterval: 30000,
    enableAutoSave: true,
    restoreTimeout: 10000,
    onRestore: (data) => {
      if (data.presencesEnrichies) {
        presenceHook.setPresencesEnrichies(data.presencesEnrichies);
        presenceHook.setPresences(presencesEnrichiesVersSimple(data.presencesEnrichies));
      }
      if (data.votesParResolution) {
        const restoredVotes = data.votesParResolution as unknown as VoteData[];
        if (Array.isArray(restoredVotes)) {
          votingHook.setVotes(restoredVotes);
        }
      }
      if (data.sessionStarted !== undefined) {
        resolutionsHook.setSessionState(prev => ({ ...prev, started: data.sessionStarted! }));
      }
      if (data.resolutionActiveIndex !== undefined) {
        resolutionsHook.setSessionState(prev => ({ ...prev, currentResolutionIndex: data.resolutionActiveIndex! }));
      }
      if (data.completedResolutions) {
        resolutionsHook.setSessionState(prev => ({ ...prev, completedResolutions: data.completedResolutions! }));
      }
    },
  });

  // Modals hook
  const modalsHook = useSessionModals();

  // Refs to avoid stale closures in saveSession (initialized with defaults, synced below)
  const votesRef = useRef<VoteData[]>([]);
  const sessionStateRef = useRef({ started: false, currentResolutionIndex: 0, completedResolutions: [] as string[] });
  const presencesEnrichiesRef = useRef<Record<string, import('@/lib/utils/ag-session').PresenceData>>({});
  const isSecondVoteRef = useRef(false);
  const passerelleResolutionRef = useRef<import('../types').Resolution | null>(null);
  const passerelleVoteInitialRef = useRef<import('../types').PasserelleVoteInitial | null>(null);

  // Ref for resolutions (to persist per-resolution variables without stale closure)
  const resolutionsRef = useRef<import('../types').Resolution[]>([]);

  // Resolutions hook (needs saveSession callback - defined below)
  const saveSession = useCallback(async () => {
    const sessionData: SessionDraftData = {
      ...sessionStateRef.current,
      isSecondVote: isSecondVoteRef.current,
      passerelleResolution: passerelleResolutionRef.current,
      passerelleVoteInitial: passerelleVoteInitialRef.current,
      presencesEnrichies: presencesEnrichiesRef.current
    };
    await saveDraft(agId, 'session', sessionData);
    await saveDraft(agId, 'votes', votesRef.current);

    // Save per-resolution variable overrides
    const resVarOverrides: Record<string, Record<string, string>> = {};
    for (const res of resolutionsRef.current) {
      if (res.variables && Object.keys(res.variables).length > 0) {
        resVarOverrides[res.id] = res.variables;
      }
    }
    await saveDraft(agId, 'resolution_vars', resVarOverrides);

    // Save vote results per resolution (resultat field)
    const resResults: Record<string, 'ADOPTEE' | 'REJETEE' | 'AJOURNEE'> = {};
    for (const res of resolutionsRef.current) {
      if (res.resultat) {
        resResults[res.id] = res.resultat;
      }
    }
    if (Object.keys(resResults).length > 0) {
      await saveDraft(agId, 'resolutions_results', resResults);
    }
  }, [agId]);

  const resolutionsHook = useSessionResolutions({
    agId,
    isSecondVote: false, // Will be updated
    saveResolutionState: persistence.saveResolutionState,
    saveSession,
  });

  // Variables hook
  const variablesHook = useSessionVariables({
    agId,
    coproprietaires,
  });

  // Presence hook
  const presenceHook = useSessionPresence(
    coproprietaires,
    [], // Will receive votes from votingHook
    persistence.markDirty
  );

  // Voting hook
  const votingHook = useSessionVoting({
    agId,
    coproprietaires,
    presences: presenceHook.presences,
    currentResolution: resolutionsHook.currentResolution,
    totalTantiemes,
    useSupabase: !!useSupabase,
    isManager,
    castVote: castVoteMutation.execute,
  });

  // Budget prévisionnel: lu depuis la résolution "Approbation du budget prévisionnel" en DB
  const budgetPrevisionnel = useMemo(() => {
    const budgetRes = resolutionsHook.resolutions.find(r =>
      r.titre?.toLowerCase().includes('approbation') &&
      r.titre?.toLowerCase().includes('budget')
    );
    const montantDB = budgetRes?.variables?.montant || '';
    const montantSession = variablesHook.variableValues['montant'] || '';
    const raw = montantDB || montantSession;
    return parseFloat(raw.replace(/[\s\u00a0]/g, '').replace(',', '.')) || 0;
  }, [resolutionsHook.resolutions, variablesHook.variableValues]);

  // Montant du fonds de travaux: clé dédiée session > DB résolution ALUR
  const fondsTravauxMontant = useMemo(() => {
    // 1. Clé dédiée sauvegardée par handleSaveFondsALUR
    const sessionDedicated = variablesHook.variableValues['montant_fonds_travaux'] || '';
    if (sessionDedicated) return parseFloat(sessionDedicated.replace(/[\s\u00a0]/g, '').replace(',', '.')) || 0;
    // 2. Fallback: variables DB de la résolution ALUR
    const alurRes = resolutionsHook.resolutions.find(r =>
      r.texte?.includes('article 14-2') ||
      (r.titre?.toLowerCase().includes('fonds de travaux') && r.titre?.toLowerCase().includes('alur'))
    );
    const montantDB = alurRes?.variables?.montant || '';
    return parseFloat(montantDB.replace(/[\s\u00a0]/g, '').replace(',', '.')) || 0;
  }, [resolutionsHook.resolutions, variablesHook.variableValues]);

  // Persistance immédiate sur tout changement d'état session
  useEffect(() => {
    if (!resolutionsHook.sessionState.started) return;
    persistence.markDirty();
    saveSession();
  }, [votingHook.votes, resolutionsHook.sessionState, presenceHook.presencesEnrichies]);

  // Keep refs in sync for saveSession
  resolutionsRef.current = resolutionsHook.resolutions;
  votesRef.current = votingHook.votes;
  sessionStateRef.current = resolutionsHook.sessionState;
  presencesEnrichiesRef.current = presenceHook.presencesEnrichies;
  isSecondVoteRef.current = votingHook.isSecondVote;
  passerelleResolutionRef.current = votingHook.passerelleResolution;
  passerelleVoteInitialRef.current = votingHook.passerelleVoteInitial;

  // Projector hook
  const projectorHook = useSessionProjector({
    agId,
    meeting,
    resolutions: resolutionsHook.resolutions,
    sessionState: resolutionsHook.sessionState,
    currentResolution: resolutionsHook.currentResolution,
    stats: votingHook.stats,
    votes: votingHook.votes,
    coproprietaires,
    presencesEnrichies: presenceHook.presencesEnrichies,
    totalTantiemes,
  });

  // Set persistence data getter (includes votes + per-resolution vars for auto-save)
  useEffect(() => {
    persistence.setDataGetter(() => {
      // Build per-resolution variable overrides for auto-save
      const resVarOverrides: Record<string, Record<string, string>> = {};
      for (const res of resolutionsHook.resolutions) {
        if (res.variables && Object.keys(res.variables).length > 0) {
          resVarOverrides[res.id] = res.variables;
        }
      }
      // Save per-resolution vars draft alongside auto-save
      saveDraft(agId, 'resolution_vars', resVarOverrides);

      return {
        presencesEnrichies: presenceHook.presencesEnrichies,
        votesParResolution: votingHook.votes as unknown as Record<string, unknown>,
        resolutionActiveIndex: resolutionsHook.sessionState.currentResolutionIndex,
        completedResolutions: resolutionsHook.sessionState.completedResolutions,
        sessionStarted: resolutionsHook.sessionState.started,
      };
    });
  }, [agId, presenceHook.presencesEnrichies, votingHook.votes, resolutionsHook.resolutions, resolutionsHook.sessionState, persistence.setDataGetter]);

  // Load session data on mount
  useEffect(() => {
    const loadSessionData = async () => {
      if (useSupabase && dbResolutions.length > 0) {
        const mergedVariables = resolutionsHook.initializeResolutions(dbResolutions);

        // Restore per-resolution variable overrides from draft
        const resVarsDraft = await loadDraft<Record<string, Record<string, string>>>(agId, 'resolution_vars');
        if (resVarsDraft.data) {
          for (const [resId, vars] of Object.entries(resVarsDraft.data)) {
            for (const [varName, value] of Object.entries(vars)) {
              resolutionsHook.updateResolutionVariable(resId, varName, value);
            }
          }
        }

        // Restore vote results (resultat) from draft
        const resResultsDraft = await loadDraft<Record<string, 'ADOPTEE' | 'REJETEE' | 'AJOURNEE'>>(agId, 'resolutions_results');
        if (resResultsDraft.data) {
          for (const [resId, resultat] of Object.entries(resResultsDraft.data)) {
            resolutionsHook.updateResolutionResultat(resId, resultat);
          }
        }

        // Load global variables draft and merge with DB resolution variables
        const variablesDraft = await loadDraft<Record<string, string>>(agId, 'variables');
        const baseVariables = { ...mergedVariables };
        if (variablesDraft.data) {
          Object.assign(baseVariables, variablesDraft.data);
        }
        if (Object.keys(baseVariables).length > 0) {
          variablesHook.setVariableValues(baseVariables);
        }
      }

      // Load votes draft (preserve original source if present)
      const votesDraft = await loadDraft<VoteData[]>(agId, 'votes');
      let loadedVotes: VoteData[] = [];
      if (votesDraft.data && Array.isArray(votesDraft.data)) {
        loadedVotes = votesDraft.data.map(v => ({
          ...v,
          source: v.source || (v.vote !== null ? 'CORRESPONDANCE' as VoteSource : null)
        }));
      }

      // Load correspondence votes from Supabase and merge them in
      if (useSupabase) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const supabase = createClient() as any;
          const resolutionIds = dbResolutions.map(r => r.id);
          if (resolutionIds.length > 0) {
            const { data: corrVotes } = await supabase
              .from('ag_votes')
              .select('resolution_id, coproprietaire_id, vote, tantiemes')
              .in('resolution_id', resolutionIds)
              .eq('vote_source', 'correspondence');

            if (corrVotes && corrVotes.length > 0) {
              const dbVoteMap: Record<string, string> = { for: 'POUR', against: 'CONTRE', abstention: 'ABSTENTION' };
              for (const cv of corrVotes as Array<{ resolution_id: string; coproprietaire_id: string; vote: string; tantiemes: number }>) {
                const mappedVote = dbVoteMap[cv.vote] as VoteData['vote'];
                if (!mappedVote) continue;
                // Remove any existing draft entry for this resolution+copro
                loadedVotes = loadedVotes.filter(
                  v => !(v.resolutionId === cv.resolution_id && v.coproprietaireId === cv.coproprietaire_id)
                );
                loadedVotes.push({
                  resolutionId: cv.resolution_id,
                  coproprietaireId: cv.coproprietaire_id,
                  vote: mappedVote,
                  tantiemes: cv.tantiemes || 0,
                  source: 'CORRESPONDANCE' as VoteSource,
                });
              }
            }
          }
        } catch (err) {
          console.error('[useAgSessionPage] Error loading correspondence votes:', err);
        }
      }

      votingHook.setVotes(loadedVotes);

      // Load session draft + resolutions draft (activeIndex & completedResolutions stored separately)
      const [sessionDraft, resolutionsDraft] = await Promise.all([
        loadDraft<SessionDraftData>(agId, 'session'),
        loadDraft<{ activeIndex: number; completedResolutions: string[] }>(agId, 'resolutions'),
      ]);

      // Merge: session draft has started/presences, resolutions draft has activeIndex/completedResolutions
      const sessionData = sessionDraft.data;
      const resData = resolutionsDraft.data;

      if (sessionData || resData) {
        resolutionsHook.setSessionState({
          started: sessionData?.started || false,
          currentResolutionIndex: resData?.activeIndex ?? sessionData?.currentResolutionIndex ?? 0,
          completedResolutions: resData?.completedResolutions ?? sessionData?.completedResolutions ?? [],
        });

        if (sessionData?.isSecondVote) votingHook.setIsSecondVote(sessionData.isSecondVote);
        if (sessionData?.passerelleResolution) votingHook.setPasserelleResolution(sessionData.passerelleResolution);
        if (sessionData?.passerelleVoteInitial) votingHook.setPasserelleVoteInitial(sessionData.passerelleVoteInitial);
        if (sessionData?.presencesEnrichies) {
          presenceHook.setPresencesEnrichies(sessionData.presencesEnrichies);
          presenceHook.setPresences(presencesEnrichiesVersSimple(sessionData.presencesEnrichies));
        }
      }

      // Initialize presences from DB or coproprietaires
      if (useSupabase && dbAttendance.length > 0) {
        presenceHook.initializeFromAttendance(dbAttendance, coproprietaires);
      } else if (coproprietaires.length > 0) {
        presenceHook.initializeFromCoproprietaires(coproprietaires, loadedVotes);
      }
    };

    loadSessionData();
  }, [agId, useSupabase, dbResolutions, dbAttendance, coproprietaires]);

  // Derive started from meeting.status (source of truth = DB, not drafts)
  const isSessionActive = meeting?.status === 'session_active';

  // Sync DB status → local sessionState.started
  useEffect(() => {
    if (isSessionActive && !resolutionsHook.sessionState.started) {
      resolutionsHook.setSessionState(prev => ({ ...prev, started: true }));
    }
  }, [isSessionActive]);

  // Handlers
  const handleStartSession = useCallback(async () => {
    if (useSupabase && isManager) {
      for (const copro of coproprietaires) {
        const presence = presenceHook.presencesEnrichies[copro.id];
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
      await startAgMutation.execute(agId);
      await refreshAttendance();
    }
    resolutionsHook.setSessionState(prev => ({ ...prev, started: true }));
    persistence.saveSessionStarted(true);
    persistence.savePresences(presenceHook.presencesEnrichies);
  }, [useSupabase, isManager, coproprietaires, presenceHook.presencesEnrichies, agId]);

  const handleCancelSession = useCallback(async () => {
    if (!confirm('Êtes-vous sûr de vouloir annuler le déroulé ? Les votes et la progression seront perdus.')) return;
    if (currentCoproId) {
      await cancelAgSession(agId, currentCoproId);
    }
    resolutionsHook.setSessionState({ started: false, currentResolutionIndex: 0, completedResolutions: [] });
    persistence.clearData();
    router.push(`/ag/${agId}/feuille-presence`);
  }, [agId, currentCoproId, router]);

  const handleExportCSV = useCallback(() => {
    exportSessionToCSV(
      agId,
      coproprietaires,
      presenceHook.presencesEnrichies,
      resolutionsHook.resolutions,
      votingHook.votes,
      totalTantiemes
    );
  }, [agId, coproprietaires, presenceHook.presencesEnrichies, resolutionsHook.resolutions, votingHook.votes, totalTantiemes]);

  const goBack = useCallback(() => {
    router.push(`/ag/${agId}/feuille-presence`);
  }, [router, agId]);

  const goToPV = useCallback(() => {
    saveSession();
    router.push(`/ag/${agId}/pv`);
  }, [router, agId, saveSession]);

  const handleFinishSession = useCallback(async () => {
    if (!confirm('Terminer l\'AG et passer au procès-verbal ?')) return;
    await saveSession();
    const result = await finishAgSession(agId);
    if (result.success) {
      router.push(`/ag/${agId}/pv`);
    } else {
      alert(`Erreur lors de la clôture : ${result.error}`);
    }
  }, [agId, saveSession, router]);

  // Composed handlers
  const handleValidateVote = useCallback(() => {
    votingHook.handleValidateVote(
      modalsHook.openPasserelleModal,
      modalsHook.openResultModal
    );
  }, [votingHook, modalsHook]);

  const handleNextWithValidation = useCallback(() => {
    variablesHook.validateAndProceed(
      resolutionsHook.currentResolution,
      modalsHook.openResultModal,
      () => modalsHook.setPendingNextResolution(true)
    );
  }, [variablesHook, resolutionsHook.currentResolution, modalsHook]);

  const handlePasserelleSecondVote = useCallback(() => {
    votingHook.handlePasserelleSecondVote(() => modalsHook.setShowPasserelleModal(false));
  }, [votingHook, modalsHook]);

  const handlePasserelleAjournement = useCallback(() => {
    votingHook.handlePasserelleAjournement(
      resolutionsHook.updateResolutionWithPasserelle,
      () => modalsHook.setShowPasserelleModal(false),
      modalsHook.openResultModal
    );
  }, [votingHook, resolutionsHook, modalsHook]);

  const handleValidateSecondVote = useCallback(() => {
    votingHook.handleValidateSecondVote(
      resolutionsHook.updateResolutionWithPasserelle,
      modalsHook.openResultModal
    );
  }, [votingHook, resolutionsHook, modalsHook]);

  // Persist vote result + batch votes to Supabase when moving to next resolution
  const persistResolutionResult = useCallback(async () => {
    if (!useSupabase || !isManager) return;
    const current = resolutionsHook.currentResolution;
    if (!current || !votingHook.stats) return;

    // 1. Compute result and save is_approved
    const result = checkMajority(current, votingHook.stats, votingHook.votes, {
      totalTantiemes,
      totalCoproprietaires: coproprietaires.length,
    });

    // Only persist if resolution ID is a real UUID (not a duplicated one)
    if (!current.id.includes('_dup_')) {
      try {
        await updateResolution(current.id, { is_approved: result.adopted });
      } catch (err) {
        console.error('[persistResolutionResult] is_approved update failed:', err);
      }

      // 2. Batch-save DIRECT votes that might not have been individually persisted
      const resVotes = votingHook.votes.filter(
        v => v.resolutionId === current.id && v.source === 'DIRECT' && v.vote
      );
      for (const v of resVotes) {
        const dbVote = toDbVote(v.vote);
        if (!dbVote) continue;
        try {
          await castVoteApi({
            resolution_id: current.id,
            copro_id: currentCoproId!,
            coproprietaire_id: v.coproprietaireId,
            vote: dbVote,
            vote_source: 'live',
          });
        } catch {
          // Individual vote save failure — non-blocking
        }
      }
    }
  }, [useSupabase, isManager, resolutionsHook.currentResolution, votingHook.stats, votingHook.votes, totalTantiemes, coproprietaires.length, currentCoproId]);

  const confirmNextFromModal = useCallback(() => {
    // Persist votes + is_approved to Supabase (fire-and-forget)
    persistResolutionResult();

    const current = resolutionsHook.currentResolution;

    // Update resultat in local state + save draft immediately (don't wait for React cycle)
    if (current && votingHook.stats) {
      const result = checkMajority(current, votingHook.stats, votingHook.votes, {
        totalTantiemes,
        totalCoproprietaires: coproprietaires.length,
      });
      const resultat = result.adopted ? 'ADOPTEE' as const : 'REJETEE' as const;
      resolutionsHook.updateResolutionResultat(current.id, resultat);

      // Build results map from current ref + this new result, and save immediately
      const resResults: Record<string, 'ADOPTEE' | 'REJETEE' | 'AJOURNEE'> = {};
      for (const res of resolutionsRef.current) {
        if (res.resultat) resResults[res.id] = res.resultat;
      }
      resResults[current.id] = resultat;
      saveDraft(agId, 'resolutions_results', resResults);
    }

    // Check if this is an adopted designation resolution
    if (current) {
      const categorie = getDesignationCategorie(current.titre);
      if (categorie) {
        const result = checkMajority(current, votingHook.stats!, votingHook.votes, {
          totalTantiemes,
          totalCoproprietaires: coproprietaires.length,
        });

        if (result.adopted) {
          const nombreActuel = resolutionsHook.resolutions
            .filter(r => {
              const cat = getDesignationCategorie(r.titre);
              return cat === categorie && r.resultat === 'ADOPTEE';
            })
            .length + 1;

          modalsHook.setShowResultModal(false);
          modalsHook.setPendingNextResolution(false);
          modalsHook.setDesignationCategorie(categorie);
          modalsHook.setDesignationNombreActuel(nombreActuel);
          modalsHook.setShowAjoutDesignationModal(true);
          return;
        }
      }
    }

    modalsHook.confirmNextFromModal(resolutionsHook.handleNextResolution);
  }, [agId, modalsHook, resolutionsHook, votingHook.stats, votingHook.votes, totalTantiemes, coproprietaires.length, persistResolutionResult]);

  const handleDesignationConfirmAjout = useCallback(() => {
    resolutionsHook.insertResolutionAfterCurrent();
    resolutionsHook.handleNextResolution();
    modalsHook.setShowAjoutDesignationModal(false);
  }, [resolutionsHook, modalsHook]);

  const handleDesignationRefuserAjout = useCallback(() => {
    modalsHook.setShowAjoutDesignationModal(false);
    resolutionsHook.handleNextResolution();
  }, [resolutionsHook, modalsHook]);

  // Also persist when closing result modal without navigating
  const handleCloseResultModal = useCallback(() => {
    persistResolutionResult();

    // Save resultat to local state + draft immediately
    const current = resolutionsHook.currentResolution;
    if (current && votingHook.stats) {
      const result = checkMajority(current, votingHook.stats, votingHook.votes, {
        totalTantiemes,
        totalCoproprietaires: coproprietaires.length,
      });
      const resultat = result.adopted ? 'ADOPTEE' as const : 'REJETEE' as const;
      resolutionsHook.updateResolutionResultat(current.id, resultat);

      const resResults: Record<string, 'ADOPTEE' | 'REJETEE' | 'AJOURNEE'> = {};
      for (const res of resolutionsRef.current) {
        if (res.resultat) resResults[res.id] = res.resultat;
      }
      resResults[current.id] = resultat;
      saveDraft(agId, 'resolutions_results', resResults);
    }

    modalsHook.closeResultModal();
  }, [agId, persistResolutionResult, modalsHook, resolutionsHook.currentResolution, votingHook.stats, votingHook.votes, totalTantiemes, coproprietaires.length]);

  const confirmContinueWithWarning = useCallback(() => {
    variablesHook.confirmContinueWithWarning(
      modalsHook.openResultModal,
      () => modalsHook.setPendingNextResolution(true)
    );
  }, [variablesHook, modalsHook]);

  // Per-resolution variable handlers: read/write from the resolution's own variables
  const handleVariableClick = useCallback((variableName: string) => {
    const currentRes = resolutionsHook.currentResolution;
    if (variableName === 'modalites_paiement_budget' || variableName === 'modalites_paiement_fonds') {
      variablesHook.handleVariableClick(variableName);
      return;
    }
    const isBudgetApproval = currentRes?.titre?.toLowerCase().includes('approbation') && currentRes?.titre?.toLowerCase().includes('budget');
    if (variableName === 'pourcentage' && currentRes?.texte?.includes('article 14-2')) {
      variablesHook.handleVariableClick(variableName, currentRes.texte);
      return;
    }
    if (variableName === 'montant' && isBudgetApproval) {
      // Pré-remplir avec budgetPrevisionnel si disponible
      const initialVal = budgetPrevisionnel > 0 ? budgetPrevisionnel.toString() : (currentRes?.variables?.montant || variablesHook.allVariables['montant'] || '');
      variablesHook.setEditingVariable({ name: variableName, value: initialVal });
      variablesHook.setShowVariableModal(true);
      return;
    }
    const resValue = currentRes?.variables?.[variableName];
    const globalValue = variablesHook.allVariables[variableName];
    const initialValue = resValue ?? globalValue ?? '';
    variablesHook.setEditingVariable({ name: variableName, value: initialValue });
    variablesHook.setShowVariableModal(true);
  }, [resolutionsHook.currentResolution, variablesHook, budgetPrevisionnel]);

  const handleSaveVariable = useCallback(() => {
    const editing = variablesHook.editingVariable;
    if (!editing) return;

    // Sync bureau copro_ids to ag_meetings for designation resolutions
    const currentRes = resolutionsHook.currentResolution;
    if (currentRes?.action_type === 'DESIGNATE_BUREAU' && editing.value.includes('|')) {
      const [coproId, displayName] = editing.value.split('|');
      const varName = editing.name;
      const updateData: Record<string, string> = {};

      if (varName.includes('president')) {
        updateData.president_id = coproId;
        updateData.president_name = displayName;
      } else if (varName.includes('secretaire')) {
        updateData.secretary_id = coproId;
        updateData.secretary_name = displayName;
      } else if (varName.includes('scrutateur')) {
        updateData.scrutineer1_id = coproId;
        updateData.scrutineer1_name = displayName;
      }

      if (Object.keys(updateData).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        supabase.from('ag_meetings').update(updateData).eq('id', agId).then();
      }

      // Store the display name (without copro_id prefix) for the variable value
      editing.value = displayName;
    }

    // Update the resolution's own variables (per-resolution)
    if (currentRes) {
      resolutionsHook.updateResolutionVariable(currentRes.id, editing.name, editing.value);
    }

    // Also save via the global variable system (for backward compat + draft persistence)
    variablesHook.handleSaveVariable();
  }, [variablesHook, resolutionsHook.currentResolution, resolutionsHook.updateResolutionVariable, agId]);

  const handlePrefillFromCopro = useCallback((variableName: string, coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (copro) {
      const currentRes = resolutionsHook.currentResolution;
      if (currentRes) {
        resolutionsHook.updateResolutionVariable(currentRes.id, variableName, copro.nom);
      }
    }
    variablesHook.handlePrefillFromCopro(variableName, coproId);
  }, [coproprietaires, resolutionsHook.currentResolution, resolutionsHook.updateResolutionVariable, variablesHook]);

  return {
    // State
    resolutions: resolutionsHook.resolutions,
    votes: votingHook.votes,
    sessionState: resolutionsHook.sessionState,
    presences: presenceHook.presences,
    presencesEnrichies: presenceHook.presencesEnrichies,
    votesCorrespondanceCount: presenceHook.votesCorrespondanceCount,
    currentResolution: resolutionsHook.currentResolution,
    stats: votingHook.stats,
    totalTantiemes,
    isCurrentResolutionInfo: resolutionsHook.isCurrentResolutionInfo,
    isSecondVote: votingHook.isSecondVote,
    allVariables: variablesHook.allVariables,
    prefillVariables: variablesHook.prefillVariables,
    variableValues: variablesHook.variableValues,
    budgetPrevisionnel,
    fondsTravauxMontant,

    // Modals state
    showResultModal: modalsHook.showResultModal,
    pendingNextResolution: modalsHook.pendingNextResolution,
    showPasserelleModal: modalsHook.showPasserelleModal,
    passerelleResolution: votingHook.passerelleResolution,
    passerelleVoteInitial: votingHook.passerelleVoteInitial,
    showVariableModal: variablesHook.showVariableModal,
    showFinancingModal: variablesHook.showFinancingModal,
    showFondsALURModal: variablesHook.showFondsALURModal,
    financingSchedule: variablesHook.financingSchedule,
    editingVariable: variablesHook.editingVariable,
    showValidationWarning: variablesHook.showValidationWarning,
    missingVariables: variablesHook.missingVariables,
    showPrefillDropdown: variablesHook.showPrefillDropdown,
    showAjoutDesignationModal: modalsHook.showAjoutDesignationModal,
    designationCategorie: modalsHook.designationCategorie,
    designationNombreActuel: modalsHook.designationNombreActuel,
    showProjectorModal: projectorHook.showProjectorModal,
    projectorUrl: projectorHook.projectorUrl,
    copiedToClipboard: projectorHook.copiedToClipboard,

    // Persistence state
    persistenceStatus: persistence.status,
    isRestoring: persistence.isRestoring,
    lastSaveDate: persistence.lastSaveDate,
    hasUnsavedChanges: persistence.hasUnsavedChanges,
    restoreResult: persistence.restoreResult,
    persistenceError: persistence.error,
    isOnline: persistence.isOnline,
    hasExistingData: persistence.hasExistingData,
    retryRestore: persistence.retryRestore,
    startNewSession: persistence.startNewSession,

    // Presence handlers
    handlePresenceToggle: presenceHook.handlePresenceToggle,
    selectAllPresences: presenceHook.selectAllPresences,
    handleBasculerPresent: presenceHook.handleBasculerPresent,
    handleAnnulerBascule: presenceHook.handleAnnulerBascule,

    // Vote handlers
    handleVote: votingHook.handleVote,
    selectAllVotes: votingHook.selectAllVotes,
    handleValidateVote,
    handleNextWithValidation,
    handleNextResolution: resolutionsHook.handleNextResolution,
    handlePrevResolution: resolutionsHook.handlePrevResolution,
    handleNavigateToResolution: resolutionsHook.handleNavigateToResolution,
    handleValidateSecondVote,

    // Passerelle handlers
    handlePasserelleSecondVote,
    handlePasserelleAjournement,

    // Variable handlers (per-resolution aware)
    handleVariableClick,
    handleSaveVariable,
    handlePrefillFromCopro,
    setEditingVariable: variablesHook.setEditingVariable,
    setShowPrefillDropdown: variablesHook.setShowPrefillDropdown,

    // Session handlers
    handleStartSession,
    handleCancelSession,
    isSessionActive,
    saveSession,

    // Projector handlers
    handleOpenProjector: projectorHook.handleOpenProjector,
    handleCopyProjectorUrl: projectorHook.handleCopyProjectorUrl,
    handleOpenProjectorNewTab: projectorHook.handleOpenProjectorNewTab,
    closeProjectorModal: projectorHook.closeProjectorModal,

    // Export
    handleExportCSV,

    // Designation handlers
    handleDesignationConfirmAjout,
    handleDesignationRefuserAjout,

    // Modal handlers
    closeResultModal: handleCloseResultModal,
    confirmNextFromModal,
    closeVariableModal: variablesHook.closeVariableModal,
    handleSaveFinancing: variablesHook.handleSaveFinancing,
    closeFinancingModal: variablesHook.closeFinancingModal,
    handleSaveFondsALUR: variablesHook.handleSaveFondsALUR,
    closeFondsALURModal: variablesHook.closeFondsALURModal,
    closeValidationWarning: variablesHook.closeValidationWarning,
    confirmContinueWithWarning,
    setShowPasserelleModal: modalsHook.setShowPasserelleModal,

    // Navigation
    goBack,
    goToPV,
    handleFinishSession,

    // Supabase integration
    useSupabase: !!useSupabase,
    isManager,
    meeting,
    dbLoading,
    coproprietaires,
  };
}
