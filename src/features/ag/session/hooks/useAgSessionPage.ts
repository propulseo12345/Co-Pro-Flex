'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { useAgDetail, useAgVoters, useCastVote, useRegisterAttendance, useStartAg } from '@/hooks/modules/useAgData';
import { useAGSessionPersistence } from '@/hooks/modules/useAGSessionPersistence';
import { loadDraft, saveDraft } from '@/lib/ag/draft-persistence';
import { presencesEnrichiesVersSimple } from '@/lib/utils/ag-session';

import type { UseAgSessionPageParams, UseAgSessionPageReturn, SessionDraftData, VoteData, VoteSource } from '../types';

import { useSessionParticipants } from './useSessionParticipants';
import { useSessionPresence } from './useSessionPresence';
import { useSessionVoting } from './useSessionVoting';
import { useSessionResolutions } from './useSessionResolutions';
import { useSessionVariables } from './useSessionVariables';
import { useSessionProjector } from './useSessionProjector';
import { useSessionModals } from './useSessionModals';
import { exportSessionToCSV } from '../services/sessionExport';

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

  // Resolutions hook (needs saveSession callback - defined below)
  const saveSession = useCallback(async () => {
    const sessionData: SessionDraftData = {
      ...resolutionsHook.sessionState,
      isSecondVote: votingHook.isSecondVote,
      passerelleResolution: votingHook.passerelleResolution,
      passerelleVoteInitial: votingHook.passerelleVoteInitial,
      presencesEnrichies: presenceHook.presencesEnrichies
    };
    await saveDraft(agId, 'session', sessionData);
    await saveDraft(agId, 'votes', votingHook.votes);
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

  // Set persistence data getter
  useEffect(() => {
    persistence.setDataGetter(() => ({
      presencesEnrichies: presenceHook.presencesEnrichies,
      resolutionActiveIndex: resolutionsHook.sessionState.currentResolutionIndex,
      completedResolutions: resolutionsHook.sessionState.completedResolutions,
      sessionStarted: resolutionsHook.sessionState.started,
    }));
  }, [presenceHook.presencesEnrichies, resolutionsHook.sessionState, persistence.setDataGetter]);

  // Load session data on mount
  useEffect(() => {
    const loadSessionData = async () => {
      if (useSupabase && dbResolutions.length > 0) {
        const mergedVariables = resolutionsHook.initializeResolutions(dbResolutions);

        // Load variables draft
        const variablesDraft = await loadDraft<Record<string, string>>(agId, 'variables');
        if (variablesDraft.data) {
          variablesHook.setVariableValues(variablesDraft.data);
        } else if (Object.keys(mergedVariables).length > 0) {
          variablesHook.setVariableValues(mergedVariables);
        }
      }

      // Load votes draft
      const votesDraft = await loadDraft<VoteData[]>(agId, 'votes');
      let loadedVotes: VoteData[] = [];
      if (votesDraft.data && Array.isArray(votesDraft.data)) {
        loadedVotes = votesDraft.data.map(v => ({
          ...v, source: v.vote !== null ? 'CORRESPONDANCE' as VoteSource : null
        }));
        votingHook.setVotes(loadedVotes);
      }

      // Load session draft
      const sessionDraft = await loadDraft<SessionDraftData>(agId, 'session');
      if (sessionDraft.data) {
        const sessionData = sessionDraft.data;
        resolutionsHook.setSessionState({
          started: sessionData.started || false,
          currentResolutionIndex: sessionData.currentResolutionIndex || 0,
          completedResolutions: sessionData.completedResolutions || []
        });
        if (sessionData.isSecondVote) votingHook.setIsSecondVote(sessionData.isSecondVote);
        if (sessionData.passerelleResolution) votingHook.setPasserelleResolution(sessionData.passerelleResolution);
        if (sessionData.passerelleVoteInitial) votingHook.setPasserelleVoteInitial(sessionData.passerelleVoteInitial);
        if (sessionData.presencesEnrichies) {
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

  const handlePauseSession = useCallback(() => {
    resolutionsHook.setSessionState(prev => ({ ...prev, started: false }));
  }, []);

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
    router.push(`/ag/${agId}/preparation`);
  }, [router, agId]);

  const goToPV = useCallback(() => {
    saveSession();
    router.push(`/ag/${agId}/pv`);
  }, [router, agId, saveSession]);

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

  const confirmNextFromModal = useCallback(() => {
    modalsHook.confirmNextFromModal(resolutionsHook.handleNextResolution);
  }, [modalsHook, resolutionsHook]);

  const confirmContinueWithWarning = useCallback(() => {
    variablesHook.confirmContinueWithWarning(
      modalsHook.openResultModal,
      () => modalsHook.setPendingNextResolution(true)
    );
  }, [variablesHook, modalsHook]);

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

    // Modals state
    showResultModal: modalsHook.showResultModal,
    pendingNextResolution: modalsHook.pendingNextResolution,
    showPasserelleModal: modalsHook.showPasserelleModal,
    passerelleResolution: votingHook.passerelleResolution,
    passerelleVoteInitial: votingHook.passerelleVoteInitial,
    showVariableModal: variablesHook.showVariableModal,
    editingVariable: variablesHook.editingVariable,
    showValidationWarning: variablesHook.showValidationWarning,
    missingVariables: variablesHook.missingVariables,
    showPrefillDropdown: variablesHook.showPrefillDropdown,
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

    // Variable handlers
    handleVariableClick: variablesHook.handleVariableClick,
    handleSaveVariable: variablesHook.handleSaveVariable,
    handlePrefillFromCopro: variablesHook.handlePrefillFromCopro,
    setEditingVariable: variablesHook.setEditingVariable,
    setShowPrefillDropdown: variablesHook.setShowPrefillDropdown,

    // Session handlers
    handleStartSession,
    handlePauseSession,
    saveSession,

    // Projector handlers
    handleOpenProjector: projectorHook.handleOpenProjector,
    handleCopyProjectorUrl: projectorHook.handleCopyProjectorUrl,
    handleOpenProjectorNewTab: projectorHook.handleOpenProjectorNewTab,
    closeProjectorModal: projectorHook.closeProjectorModal,

    // Export
    handleExportCSV,

    // Modal handlers
    closeResultModal: modalsHook.closeResultModal,
    confirmNextFromModal,
    closeVariableModal: variablesHook.closeVariableModal,
    closeValidationWarning: variablesHook.closeValidationWarning,
    confirmContinueWithWarning,
    setShowPasserelleModal: modalsHook.setShowPasserelleModal,

    // Navigation
    goBack,
    goToPV,

    // Supabase integration
    useSupabase: !!useSupabase,
    isManager,
    meeting,
    dbLoading,
    coproprietaires,
  };
}
