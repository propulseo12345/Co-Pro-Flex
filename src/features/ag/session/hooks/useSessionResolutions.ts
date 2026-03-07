'use client';

import { useState, useCallback, useMemo } from 'react';
import type { PasserelleMajorite } from '@/types';
import type { Resolution, SessionState } from '../types';
import { fromDbMajorityType } from '../services/sessionHelpers';
import { isResolutionInformation } from '@/lib/utils/ag-variables';
import { saveDraft } from '@/lib/ag/draft-persistence';
import type { AgResolutionResult } from '@/lib/ag/types';

export interface UseSessionResolutionsReturn {
  resolutions: Resolution[];
  sessionState: SessionState;
  currentResolution: Resolution | undefined;
  isCurrentResolutionInfo: boolean;
  setResolutions: React.Dispatch<React.SetStateAction<Resolution[]>>;
  setSessionState: React.Dispatch<React.SetStateAction<SessionState>>;
  initializeResolutions: (dbResolutions: AgResolutionResult[]) => Record<string, string>;
  handleNextResolution: () => void;
  handlePrevResolution: () => void;
  handleNavigateToResolution: (index: number) => void;
  updateResolutionWithPasserelle: (resolutionId: string, passerelleData: PasserelleMajorite, resultat: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE') => void;
  updateResolutionVariable: (resolutionId: string, varName: string, value: string) => void;
  insertResolutionAfterCurrent: () => void;
}

interface UseSessionResolutionsParams {
  agId: string;
  isSecondVote: boolean;
  saveResolutionState: (index: number, completedResolutions: string[]) => void;
  saveSession: () => Promise<void>;
}

export function useSessionResolutions({
  agId,
  isSecondVote,
  saveResolutionState,
  saveSession,
}: UseSessionResolutionsParams): UseSessionResolutionsReturn {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [sessionState, setSessionState] = useState<SessionState>({
    started: false,
    currentResolutionIndex: 0,
    completedResolutions: []
  });

  const currentResolution = resolutions[sessionState.currentResolutionIndex];

  const isCurrentResolutionInfo = useMemo(
    () => currentResolution ? isResolutionInformation(currentResolution) : false,
    [currentResolution]
  );

  const initializeResolutions = useCallback((dbResolutions: AgResolutionResult[]): Record<string, string> => {
    const frontendRes: Resolution[] = dbResolutions.map(r => ({
      id: r.id,
      titre: r.title,
      texte: r.description || '',
      majorite: fromDbMajorityType(r.majority_type),
      custom: true,
      resultat: r.is_approved === true ? 'ADOPTEE' : r.is_approved === false ? 'REJETEE' : undefined,
      variables: r.variables as Record<string, string> | undefined,
      action_type: r.action_type ?? undefined,
    }));
    setResolutions(frontendRes);

    // Merge all resolution variables into a single object
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
    return mergedVariables;
  }, []);

  const handleNextResolution = useCallback(() => {
    if (sessionState.currentResolutionIndex < resolutions.length - 1) {
      const current = resolutions[sessionState.currentResolutionIndex];
      const newIndex = sessionState.currentResolutionIndex + 1;
      const newCompleted = [...sessionState.completedResolutions, current.id];

      setSessionState(prev => ({
        ...prev,
        currentResolutionIndex: newIndex,
        completedResolutions: newCompleted
      }));

      saveResolutionState(newIndex, newCompleted);
      saveSession();
    }
  }, [sessionState, resolutions, saveResolutionState, saveSession]);

  const handlePrevResolution = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      currentResolutionIndex: Math.max(0, prev.currentResolutionIndex - 1)
    }));
  }, []);

  const handleNavigateToResolution = useCallback((index: number) => {
    if (index >= 0 && index < resolutions.length && !isSecondVote) {
      setSessionState(prev => ({ ...prev, currentResolutionIndex: index }));
      saveResolutionState(index, sessionState.completedResolutions);
    }
  }, [resolutions.length, isSecondVote, saveResolutionState, sessionState.completedResolutions]);

  const updateResolutionWithPasserelle = useCallback((
    resolutionId: string,
    passerelleData: PasserelleMajorite,
    resultat: 'ADOPTEE' | 'REJETEE' | 'AJOURNEE'
  ) => {
    setResolutions(prev => prev.map(r =>
      r.id === resolutionId ? { ...r, passerelle: passerelleData, resultat } : r
    ));

    // Save resolutions state to drafts (for passerelle tracking)
    const updatedResolutions = resolutions.map(r =>
      r.id === resolutionId ? { ...r, passerelle: passerelleData, resultat } : r
    );
    saveDraft(agId, 'resolutions', updatedResolutions);
  }, [resolutions, agId]);

  const updateResolutionVariable = useCallback((resolutionId: string, varName: string, value: string) => {
    setResolutions(prev => prev.map(r =>
      r.id === resolutionId
        ? { ...r, variables: { ...r.variables, [varName]: value } }
        : r
    ));
  }, []);

  const insertResolutionAfterCurrent = useCallback(() => {
    const current = resolutions[sessionState.currentResolutionIndex];
    if (!current) return;

    const duplicate: Resolution = {
      id: `${current.id}_dup_${Date.now()}`,
      titre: current.titre,
      texte: current.texte,
      majorite: current.majorite,
    };

    setResolutions(prev => {
      const next = [...prev];
      next.splice(sessionState.currentResolutionIndex + 1, 0, duplicate);
      return next;
    });
  }, [resolutions, sessionState.currentResolutionIndex]);

  return {
    resolutions,
    sessionState,
    currentResolution,
    isCurrentResolutionInfo,
    setResolutions,
    setSessionState,
    initializeResolutions,
    handleNextResolution,
    handlePrevResolution,
    handleNavigateToResolution,
    updateResolutionWithPasserelle,
    updateResolutionVariable,
    insertResolutionAfterCurrent,
  };
}
