'use client';

import { useState, useCallback } from 'react';
import type { Coproprietaire, PresenceData, VoteData } from '../types';
import {
  integrerVotesCorrespondance,
  presencesEnrichiesVersSimple,
  basculerEnPresent,
  annulerBasculePresent,
  getCoproprietairesAvecVoteCorrespondance,
} from '@/lib/utils/ag-session';

export interface UseSessionPresenceReturn {
  presences: Record<string, boolean>;
  presencesEnrichies: Record<string, PresenceData>;
  votesCorrespondanceCount: number;
  setPresences: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setPresencesEnrichies: React.Dispatch<React.SetStateAction<Record<string, PresenceData>>>;
  handlePresenceToggle: (coproId: string) => void;
  selectAllPresences: () => void;
  handleBasculerPresent: (coproId: string) => void;
  handleAnnulerBascule: (coproId: string) => void;
  initializeFromAttendance: (
    attendance: Array<{ coproprietaire_id: string; presence_type: string; represented_by_name?: string | null }>,
    coproprietaires: Coproprietaire[]
  ) => void;
  initializeFromCoproprietaires: (coproprietaires: Coproprietaire[], votes: VoteData[]) => void;
}

export function useSessionPresence(
  coproprietaires: Coproprietaire[],
  votes: VoteData[],
  onDirty: () => void
): UseSessionPresenceReturn {
  const [presences, setPresences] = useState<Record<string, boolean>>({});
  const [presencesEnrichies, setPresencesEnrichies] = useState<Record<string, PresenceData>>({});

  const votesCorrespondanceCount = getCoproprietairesAvecVoteCorrespondance(votes).size;

  const handlePresenceToggle = useCallback((coproId: string) => {
    setPresences(prev => ({ ...prev, [coproId]: !prev[coproId] }));
    setPresencesEnrichies(prev => {
      const current = prev[coproId];
      if (!current) return prev;
      if (current.mode === 'correspondance') return prev;
      const newMode = current.mode === 'present' ? 'absent' : 'present';
      return { ...prev, [coproId]: { ...current, mode: newMode } };
    });
    onDirty();
  }, [onDirty]);

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
    onDirty();
  }, [presences, presencesEnrichies, coproprietaires, onDirty]);

  const handleBasculerPresent = useCallback((coproId: string) => {
    setPresencesEnrichies(prev => basculerEnPresent(prev, coproId));
    setPresences(prev => ({ ...prev, [coproId]: true }));
    onDirty();
  }, [onDirty]);

  const handleAnnulerBascule = useCallback((coproId: string) => {
    setPresencesEnrichies(prev => annulerBasculePresent(prev, coproId, votes));
    setPresences(prev => ({ ...prev, [coproId]: true }));
    onDirty();
  }, [votes, onDirty]);

  const initializeFromAttendance = useCallback((
    attendance: Array<{ coproprietaire_id: string; presence_type: string; represented_by_name?: string | null }>,
    copros: Coproprietaire[]
  ) => {
    const enrichies: Record<string, PresenceData> = {};
    const simplePresences: Record<string, boolean> = {};

    for (const att of attendance) {
      const mode = att.presence_type === 'present' ? 'present'
        : att.presence_type === 'proxy' ? 'represente'
        : att.presence_type === 'correspondence' ? 'correspondance'
        : 'absent';

      enrichies[att.coproprietaire_id] = {
        coproprietaireId: att.coproprietaire_id,
        mode,
        voteCorrespondanceNeutralise: false,
        mandataireId: undefined,
      };
      simplePresences[att.coproprietaire_id] = mode !== 'absent';
    }

    for (const copro of copros) {
      if (!enrichies[copro.id]) {
        enrichies[copro.id] = { coproprietaireId: copro.id, mode: 'absent', voteCorrespondanceNeutralise: false };
        simplePresences[copro.id] = false;
      }
    }

    setPresencesEnrichies(enrichies);
    setPresences(simplePresences);
  }, []);

  const initializeFromCoproprietaires = useCallback((copros: Coproprietaire[], loadedVotes: VoteData[]) => {
    const initialPresences: Record<string, boolean> = {};
    copros.forEach(copro => { initialPresences[copro.id] = false; });
    setPresences(initialPresences);

    const enrichies = integrerVotesCorrespondance(initialPresences, loadedVotes);
    setPresencesEnrichies(enrichies);
    setPresences(presencesEnrichiesVersSimple(enrichies));
  }, []);

  return {
    presences,
    presencesEnrichies,
    votesCorrespondanceCount,
    setPresences,
    setPresencesEnrichies,
    handlePresenceToggle,
    selectAllPresences,
    handleBasculerPresent,
    handleAnnulerBascule,
    initializeFromAttendance,
    initializeFromCoproprietaires,
  };
}
