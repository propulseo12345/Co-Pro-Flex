'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAGStepGuard } from '@/hooks/modules/useAGStepGuard';
import { useVotesCorrespondance } from '@/hooks/modules/useVotesCorrespondance';
import { usePouvoirs } from '@/hooks/modules/usePouvoirs';
import { updateAgCurrentStep } from '@/lib/ag/api';

type TabType = 'votes' | 'pouvoirs';

export function usePreparationPage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  // Active tab
  const [activeTab, setActiveTab] = useState<TabType>('votes');

  // Workflow guard
  const {
    state: guardState,
    blockReason,
    redirectUrl,
  } = useAGStepGuard({
    agId,
    stepId: 'votes_correspondance',
    autoRedirect: true,
    redirectDelay: 100,
  });

  // Votes par correspondance hook
  const {
    coproprietaires,
    resolutions,
    selectedCoproId,
    selectedCoproState,
    progress,
    isLoading: isLoadingVotes,
    selectCopro,
    setVote,
    setAllVotes,
    clearVotes,
    setTantiemes,
    resetTantiemes,
    uploadJustificatif,
    removeJustificatif,
    markAsComplete,
    markAsDraft,
    save,
    exportCsv,
    getValidationErrors,
    canMarkAsComplete,
  } = useVotesCorrespondance({ agId });

  // Pouvoirs hook
  const {
    pouvoirs,
    coproprietaires: coproprietairesWithPouvoirs,
    stats: pouvoirsStats,
    quorumPrevisionnel,
    isLoading: isLoadingPouvoirs,
    addPouvoir,
    removePouvoir,
    uploadJustificatif: uploadPouvoirJustificatif,
    removeJustificatif: removePouvoirJustificatif,
    validatePouvoir,
    save: savePouvoirs,
  } = usePouvoirs({ agId });

  const isLoading = isLoadingVotes || isLoadingPouvoirs;

  // Update current step in DB (step 5 = Votes par correspondance)
  useEffect(() => {
    if (guardState === 'allowed' && !isLoading && agId) {
      updateAgCurrentStep(agId, 5);
    }
  }, [guardState, isLoading, agId]);

  // Selected copro for votes
  const selectedCopro = useMemo(() => {
    if (!selectedCoproId) return null;
    return coproprietaires.find(c => c.id === selectedCoproId) ?? null;
  }, [selectedCoproId, coproprietaires]);

  const selectedCoproIndex = useMemo(() => {
    if (!selectedCoproId) return -1;
    return coproprietaires.findIndex(c => c.id === selectedCoproId);
  }, [selectedCoproId, coproprietaires]);

  // Navigation handlers
  const handlePrevCopro = useCallback(() => {
    if (selectedCoproIndex > 0) {
      selectCopro(coproprietaires[selectedCoproIndex - 1].id);
    }
  }, [selectedCoproIndex, coproprietaires, selectCopro]);

  const handleNextCopro = useCallback(() => {
    if (selectedCoproIndex < coproprietaires.length - 1) {
      selectCopro(coproprietaires[selectedCoproIndex + 1].id);
    }
  }, [selectedCoproIndex, coproprietaires, selectCopro]);

  // Vote handlers
  const handleVote = useCallback(
    (resolutionId: string, choice: 'POUR' | 'CONTRE' | 'ABSTENTION' | null) => {
      if (selectedCoproId) setVote(selectedCoproId, resolutionId, choice);
    },
    [selectedCoproId, setVote]
  );

  const handleVoteAll = useCallback(
    (choice: 'POUR' | 'CONTRE' | 'ABSTENTION' | null) => {
      if (selectedCoproId) setAllVotes(selectedCoproId, choice);
    },
    [selectedCoproId, setAllVotes]
  );

  const handleClearVotes = useCallback(() => {
    if (selectedCoproId) clearVotes(selectedCoproId);
  }, [selectedCoproId, clearVotes]);

  const handleSetTantiemes = useCallback(
    (value: number) => {
      if (selectedCoproId) setTantiemes(selectedCoproId, value);
    },
    [selectedCoproId, setTantiemes]
  );

  const handleResetTantiemes = useCallback(() => {
    if (selectedCoproId) resetTantiemes(selectedCoproId);
  }, [selectedCoproId, resetTantiemes]);

  const handleUploadJustificatif = useCallback(
    async (file: File) => {
      if (selectedCoproId) await uploadJustificatif(selectedCoproId, file);
    },
    [selectedCoproId, uploadJustificatif]
  );

  const handleRemoveJustificatif = useCallback(() => {
    if (selectedCoproId) removeJustificatif(selectedCoproId);
  }, [selectedCoproId, removeJustificatif]);

  const handleMarkAsComplete = useCallback(() => {
    if (selectedCoproId) markAsComplete(selectedCoproId);
  }, [selectedCoproId, markAsComplete]);

  const handleMarkAsDraft = useCallback(() => {
    if (selectedCoproId) markAsDraft(selectedCoproId);
  }, [selectedCoproId, markAsDraft]);

  const validationErrors = useMemo(() => {
    if (!selectedCoproId) return [];
    return getValidationErrors(selectedCoproId);
  }, [selectedCoproId, getValidationErrors]);

  const canComplete = useMemo(() => {
    if (!selectedCoproId) return false;
    return canMarkAsComplete(selectedCoproId);
  }, [selectedCoproId, canMarkAsComplete]);

  // Save and navigation
  const handleSaveAll = useCallback(() => {
    save();
    savePouvoirs();
  }, [save, savePouvoirs]);

  const handleContinue = useCallback(() => {
    handleSaveAll();
    router.push(`/ag/${agId}/session`);
  }, [handleSaveAll, router, agId]);

  const handleGoToEnvoi = useCallback(() => {
    router.push(`/ag/${agId}/envoi`);
  }, [router, agId]);

  return {
    // Navigation
    agId,
    handleGoToEnvoi,
    handleContinue,

    // Guard state
    guardState,
    blockReason,
    redirectUrl,

    // Loading
    isLoading,

    // Tab
    activeTab,
    setActiveTab,

    // Quorum
    quorumPrevisionnel,

    // Votes data
    coproprietaires,
    resolutions,
    selectedCoproId,
    selectedCoproState,
    selectedCopro,
    selectedCoproIndex,
    progress,
    validationErrors,
    canComplete,
    totalCopros: coproprietaires.length,

    // Vote handlers
    selectCopro,
    handleVote,
    handleVoteAll,
    handleClearVotes,
    handleSetTantiemes,
    handleResetTantiemes,
    handleUploadJustificatif,
    handleRemoveJustificatif,
    handleMarkAsComplete,
    handleMarkAsDraft,
    handlePrevCopro,
    handleNextCopro,
    handleSaveAll,
    exportCsv,

    // Pouvoirs data
    pouvoirs,
    coproprietairesWithPouvoirs,
    pouvoirsStats,

    // Pouvoirs handlers
    addPouvoir,
    removePouvoir,
    uploadPouvoirJustificatif,
    removePouvoirJustificatif,
    validatePouvoir,
  };
}
