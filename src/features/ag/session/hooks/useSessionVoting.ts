'use client';

import { useState, useCallback, useMemo } from 'react';
import type { PasserelleMajorite } from '@/types';
import type { Coproprietaire, Resolution, VoteData, VoteChoice, VoteSource, VoteStats, PasserelleVoteInitial } from '../types';
import { toDbVote } from '../services/sessionHelpers';
import {
  getResolutionStats,
  checkMajority,
  hasVotedByCorrespondance,
  generatePasserelleMentionPV,
} from '@/components/features/ag/Session/utils';

export interface UseSessionVotingReturn {
  votes: VoteData[];
  stats: VoteStats | null;
  isSecondVote: boolean;
  passerelleResolution: Resolution | null;
  passerelleVoteInitial: PasserelleVoteInitial | null;
  setVotes: React.Dispatch<React.SetStateAction<VoteData[]>>;
  setIsSecondVote: React.Dispatch<React.SetStateAction<boolean>>;
  setPasserelleResolution: React.Dispatch<React.SetStateAction<Resolution | null>>;
  setPasserelleVoteInitial: React.Dispatch<React.SetStateAction<PasserelleVoteInitial | null>>;
  handleVote: (resolutionId: string, coproId: string, vote: VoteChoice) => Promise<void>;
  selectAllVotes: (resolutionId: string, voteType: VoteChoice) => void;
  handleValidateVote: (
    onShowPasserelle: () => void,
    onShowResult: () => void
  ) => void;
  handlePasserelleSecondVote: (onCloseModal: () => void) => void;
  handlePasserelleAjournement: (
    updateResolution: (id: string, data: PasserelleMajorite, result: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE') => void,
    onCloseModal: () => void,
    onShowResult: () => void
  ) => void;
  handleValidateSecondVote: (
    updateResolution: (id: string, data: PasserelleMajorite, result: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE') => void,
    onShowResult: () => void
  ) => void;
}

interface UseSessionVotingParams {
  agId: string;
  coproprietaires: Coproprietaire[];
  presences: Record<string, boolean>;
  currentResolution: Resolution | undefined;
  totalTantiemes: number;
  useSupabase: boolean;
  isManager: boolean;
  castVote: (input: { resolution_id: string; coproprietaire_id: string; vote: 'for' | 'against' | 'abstention'; vote_source: 'correspondence' | 'live' }) => Promise<unknown>;
}

export function useSessionVoting({
  coproprietaires,
  presences,
  currentResolution,
  totalTantiemes,
  useSupabase,
  isManager,
  castVote,
}: UseSessionVotingParams): UseSessionVotingReturn {
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [isSecondVote, setIsSecondVote] = useState(false);
  const [passerelleResolution, setPasserelleResolution] = useState<Resolution | null>(null);
  const [passerelleVoteInitial, setPasserelleVoteInitial] = useState<PasserelleVoteInitial | null>(null);

  const stats = useMemo(() => {
    return currentResolution ? getResolutionStats(votes, currentResolution.id) : null;
  }, [votes, currentResolution]);

  const handleVote = useCallback(async (resolutionId: string, coproId: string, vote: VoteChoice) => {
    if (hasVotedByCorrespondance(votes, resolutionId, coproId)) return;

    setVotes(prev => {
      const existing = prev.find(v => v.resolutionId === resolutionId && v.coproprietaireId === coproId);
      if (existing) {
        return prev.map(v => v.resolutionId === resolutionId && v.coproprietaireId === coproId
          ? { ...v, vote, source: 'DIRECT' as VoteSource } : v);
      }
      const copro = coproprietaires.find(c => c.id === coproId);
      return [...prev, { resolutionId, coproprietaireId: coproId, vote, tantiemes: copro?.tantiemes || 0, source: 'DIRECT' as VoteSource }];
    });

    if (useSupabase && isManager && vote && toDbVote(vote)) {
      await castVote({
        resolution_id: resolutionId,
        coproprietaire_id: coproId,
        vote: toDbVote(vote)!,
        vote_source: 'live',
      });
    }
  }, [votes, coproprietaires, useSupabase, isManager, castVote]);

  const selectAllVotes = useCallback((resolutionId: string, voteType: VoteChoice) => {
    const presentCopros = coproprietaires.filter(
      copro => presences[copro.id] && !hasVotedByCorrespondance(votes, resolutionId, copro.id)
    );

    const allHaveThisVote = presentCopros.every(copro => {
      const voteData = votes.find(v => v.resolutionId === resolutionId && v.coproprietaireId === copro.id);
      return voteData?.vote === voteType;
    });

    if (allHaveThisVote) {
      setVotes(prev => prev.map(v =>
        v.resolutionId === resolutionId &&
        presentCopros.some(c => c.id === v.coproprietaireId) &&
        v.source !== 'CORRESPONDANCE'
          ? { ...v, vote: null }
          : v
      ));
    } else {
      setVotes(prev => {
        const newVotes = [...prev];
        presentCopros.forEach(copro => {
          const existing = newVotes.find(v => v.resolutionId === resolutionId && v.coproprietaireId === copro.id);
          if (existing) {
            const index = newVotes.indexOf(existing);
            newVotes[index] = { ...existing, vote: voteType, source: 'DIRECT' };
          } else {
            newVotes.push({
              resolutionId,
              coproprietaireId: copro.id,
              vote: voteType,
              tantiemes: copro.tantiemes,
              source: 'DIRECT'
            });
          }
        });
        return newVotes;
      });
    }
  }, [presences, votes, coproprietaires]);

  const handleValidateVote = useCallback((
    onShowPasserelle: () => void,
    onShowResult: () => void
  ) => {
    if (!currentResolution || !stats) return;

    const result = checkMajority(currentResolution, stats, votes, {
      totalTantiemes,
      totalCoproprietaires: coproprietaires.length
    });

    if (result.passerelle251Eligible && currentResolution.majorite === 'ART_25') {
      setPasserelleResolution(currentResolution);
      setPasserelleVoteInitial({
        stats,
        result,
        votes: votes.filter(v => v.resolutionId === currentResolution.id)
      });
      onShowPasserelle();
    } else {
      onShowResult();
    }
  }, [currentResolution, stats, votes, totalTantiemes, coproprietaires.length]);

  const handlePasserelleSecondVote = useCallback((onCloseModal: () => void) => {
    onCloseModal();
    setIsSecondVote(true);
  }, []);

  const handlePasserelleAjournement = useCallback((
    updateResolution: (id: string, data: PasserelleMajorite, result: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE') => void,
    onCloseModal: () => void,
    onShowResult: () => void
  ) => {
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

    updateResolution(passerelleResolution.id, passerelleData, 'AJOURNEE');
    onCloseModal();
    onShowResult();
  }, [passerelleResolution, passerelleVoteInitial, totalTantiemes]);

  const handleValidateSecondVote = useCallback((
    updateResolution: (id: string, data: PasserelleMajorite, result: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE') => void,
    onShowResult: () => void
  ) => {
    if (!passerelleResolution || !passerelleVoteInitial || !stats) return;

    // Art. 24 (second vote passerelle 25-1) : pour > contre (abstentions et défaillants hors décompte)
    const adoptedArt24 = stats.pour > stats.contre;
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

    updateResolution(passerelleResolution.id, passerelleData, resultat);
    setIsSecondVote(false);
    onShowResult();
  }, [passerelleResolution, passerelleVoteInitial, stats, totalTantiemes]);

  return {
    votes,
    stats,
    isSecondVote,
    passerelleResolution,
    passerelleVoteInitial,
    setVotes,
    setIsSecondVote,
    setPasserelleResolution,
    setPasserelleVoteInitial,
    handleVote,
    selectAllVotes,
    handleValidateVote,
    handlePasserelleSecondVote,
    handlePasserelleAjournement,
    handleValidateSecondVote,
  };
}
