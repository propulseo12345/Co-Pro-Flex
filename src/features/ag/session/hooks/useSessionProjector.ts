'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Coproprietaire, Resolution, VoteData, VoteStats, SessionState, PresenceData } from '../types';
import type { MajorityType } from '@/lib/constants/resolutions';
import { MAJORITES } from '@/lib/constants/resolutions';
import { isResolutionInformation } from '@/lib/utils/ag-variables';
import { checkMajority } from '@/components/features/ag/Session/utils';
import { calculateQuorum } from '../services/quorum';
import {
  getOrCreateProjectorToken,
  getProjectorUrl,
} from '@/lib/utils/projector-token';
import {
  PROJECTOR_STORAGE_KEYS,
  type ProjectorSessionData,
  type ProjectorVoteStats,
} from '@/types/projector';

export interface UseSessionProjectorReturn {
  projectorUrl: string;
  showProjectorModal: boolean;
  copiedToClipboard: boolean;
  handleOpenProjector: () => void;
  handleCopyProjectorUrl: () => Promise<void>;
  handleOpenProjectorNewTab: () => void;
  closeProjectorModal: () => void;
  publishProjectorData: () => void;
}

interface UseSessionProjectorParams {
  agId: string;
  meeting: { title?: string; meeting_date?: string } | null;
  resolutions: Resolution[];
  sessionState: SessionState;
  currentResolution: Resolution | undefined;
  stats: VoteStats | null;
  votes: VoteData[];
  coproprietaires: Coproprietaire[];
  presencesEnrichies: Record<string, PresenceData>;
  totalTantiemes: number;
}

export function useSessionProjector({
  agId,
  meeting,
  resolutions,
  sessionState,
  currentResolution,
  stats,
  votes,
  coproprietaires,
  presencesEnrichies,
  totalTantiemes,
}: UseSessionProjectorParams): UseSessionProjectorReturn {
  const [showProjectorModal, setShowProjectorModal] = useState(false);
  const [projectorUrl, setProjectorUrl] = useState<string>('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const projectorVersionRef = useRef<number>(0);

  const publishProjectorData = useCallback(() => {
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
        result: stats ? (() => {
          const majorityResult = checkMajority(currentResolution, stats, votes, {
            totalTantiemes,
            totalCoproprietaires: coproprietaires.length
          });
          return { adopted: majorityResult.adopted, reason: majorityResult.reason };
        })() : null,
      } : null,
      resolutionIndex: sessionState.currentResolutionIndex,
      totalResolutions: resolutions.length,
      completedResolutions: sessionState.completedResolutions,
      quorum: calculateQuorum(presencesEnrichies, coproprietaires, totalTantiemes),
      accessToken: tokenData.token,
      tokenCreatedAt: tokenData.createdAt,
      voteUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/ag/${agId}/session`,
    };

    localStorage.setItem(PROJECTOR_STORAGE_KEYS.DATA(agId), JSON.stringify(projectorData));
  }, [agId, resolutions, sessionState, stats, votes, presencesEnrichies, totalTantiemes, meeting, currentResolution, coproprietaires]);

  // Auto-publish when session state changes
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

  const closeProjectorModal = useCallback(() => {
    setShowProjectorModal(false);
  }, []);

  return {
    projectorUrl,
    showProjectorModal,
    copiedToClipboard,
    handleOpenProjector,
    handleCopyProjectorUrl,
    handleOpenProjectorNewTab,
    closeProjectorModal,
    publishProjectorData,
  };
}
