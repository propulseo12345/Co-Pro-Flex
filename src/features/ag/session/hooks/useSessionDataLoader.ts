'use client';

import { useEffect, useCallback } from 'react';
import { loadDraft } from '@/lib/ag/draft-persistence';
import { presencesEnrichiesVersSimple } from '@/lib/utils/ag-session';
import type { VoteData, VoteSource, SessionDraftData, Coproprietaire, PresenceData, Resolution, SessionState } from '../types';
import type { AgResolutionResult, AgAttendanceSummary } from '@/lib/ag/types';

interface DataLoaderParams {
  agId: string;
  useSupabase: boolean;
  dbResolutions: AgResolutionResult[];
  dbAttendance: AgAttendanceSummary[];
  coproprietaires: Coproprietaire[];
  setVariableValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setVotes: React.Dispatch<React.SetStateAction<VoteData[]>>;
  setSessionState: React.Dispatch<React.SetStateAction<SessionState>>;
  setIsSecondVote: React.Dispatch<React.SetStateAction<boolean>>;
  setPasserelleResolution: React.Dispatch<React.SetStateAction<Resolution | null>>;
  setPasserelleVoteInitial: React.Dispatch<React.SetStateAction<unknown>>;
  setPresencesEnrichies: React.Dispatch<React.SetStateAction<Record<string, PresenceData>>>;
  setPresences: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  initializeResolutions: (dbResolutions: AgResolutionResult[]) => Record<string, string>;
  initializeFromAttendance: (
    attendance: Array<{ coproprietaire_id: string; presence_type: string; represented_by_name?: string | null }>,
    coproprietaires: Coproprietaire[]
  ) => void;
  initializeFromCoproprietaires: (coproprietaires: Coproprietaire[], votes: VoteData[]) => void;
}

export function useSessionDataLoader({
  agId,
  useSupabase,
  dbResolutions,
  dbAttendance,
  coproprietaires,
  setVariableValues,
  setVotes,
  setSessionState,
  setIsSecondVote,
  setPasserelleResolution,
  setPasserelleVoteInitial,
  setPresencesEnrichies,
  setPresences,
  initializeResolutions,
  initializeFromAttendance,
  initializeFromCoproprietaires,
}: DataLoaderParams): void {
  useEffect(() => {
    const loadSessionData = async () => {
      // Initialize resolutions and variables
      if (useSupabase && dbResolutions.length > 0) {
        const mergedVariables = initializeResolutions(dbResolutions);

        const variablesDraft = await loadDraft<Record<string, string>>(agId, 'variables');
        if (variablesDraft.data) {
          setVariableValues(variablesDraft.data);
        } else if (Object.keys(mergedVariables).length > 0) {
          setVariableValues(mergedVariables);
        }
      }

      // Load votes draft
      const votesDraft = await loadDraft<VoteData[]>(agId, 'votes');
      let loadedVotes: VoteData[] = [];
      if (votesDraft.data && Array.isArray(votesDraft.data)) {
        loadedVotes = votesDraft.data.map(v => ({
          ...v, source: v.vote !== null ? 'CORRESPONDANCE' as VoteSource : null
        }));
        setVotes(loadedVotes);
      }

      // Load session draft
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

      // Initialize presences from DB or coproprietaires
      if (useSupabase && dbAttendance.length > 0) {
        initializeFromAttendance(dbAttendance, coproprietaires);
      } else if (coproprietaires.length > 0) {
        initializeFromCoproprietaires(coproprietaires, loadedVotes);
      }
    };

    loadSessionData();
  }, [agId, useSupabase, dbResolutions, dbAttendance, coproprietaires]);
}
