'use client';

import { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { useCorrespondenceVotes } from '@/hooks/modules/useCorrespondenceVotes';
import type { EligibleOwner } from '@/lib/ag/correspondence';
import type { VoteDirection } from '@/lib/ag/types';

export interface SubmitResult {
  success: boolean;
  message: string;
}

export function useVotesCorrespondancePage() {
  const params = useParams();
  const router = useRouter();
  const agId = params.id as string;
  const { currentCoproId } = useCopro();

  const [searchTerm, setSearchTerm] = useState('');
  const [modeReception, setModeReception] = useState<'postal' | 'email' | 'remise_main'>('postal');
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const {
    owners,
    resolutions,
    status,
    selectedOwner,
    pendingVotes,
    isLoading,
    isSubmitting,
    error,
    selectOwner,
    setVote,
    clearVotes,
    submitVotes,
    refresh,
    canSubmit,
    votedCount,
    totalResolutions,
  } = useCorrespondenceVotes({ agId });

  // Filter owners by search term
  const filteredOwners = useMemo(() => {
    if (!searchTerm.trim()) return owners;
    const term = searchTerm.toLowerCase();
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        o.email?.toLowerCase().includes(term)
    );
  }, [owners, searchTerm]);

  // Handle vote submission
  const handleSubmit = useCallback(async () => {
    const result = await submitVotes(modeReception);
    if (result.success) {
      setSubmitResult({
        success: true,
        message: `${result.votes_registered} vote(s) enregistre(s) avec succes`,
      });
    } else {
      setSubmitResult({
        success: false,
        message: result.error || 'Erreur lors de l\'enregistrement',
      });
    }

    // Clear message after 5s
    setTimeout(() => setSubmitResult(null), 5000);
  }, [submitVotes, modeReception]);

  // Check if owner already voted for a resolution
  const getExistingVote = useCallback((resolutionId: string): VoteDirection | null => {
    const existingVote = selectedOwner?.voted_resolutions?.find(
      (v) => v.resolution_id === resolutionId
    );
    return existingVote?.vote || null;
  }, [selectedOwner]);

  return {
    // Params
    agId,
    currentCoproId,
    // State
    searchTerm,
    setSearchTerm,
    modeReception,
    setModeReception,
    submitResult,
    // From hook
    owners,
    resolutions,
    status,
    selectedOwner,
    pendingVotes,
    isLoading,
    isSubmitting,
    error,
    selectOwner,
    setVote,
    clearVotes,
    refresh,
    canSubmit,
    votedCount,
    totalResolutions,
    // Computed
    filteredOwners,
    // Handlers
    handleSubmit,
    getExistingVote,
  };
}
