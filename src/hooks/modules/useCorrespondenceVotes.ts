/**
 * Hook pour la gestion des votes par correspondance
 * Art. 17-1 A loi 65-557
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import type {
  EligibleOwner,
  CorrespondenceVoteInput,
  CorrespondenceFormResult,
  CorrespondenceStatus,
} from '@/lib/ag/correspondence';
import type { AgResolution, VoteDirection } from '@/lib/ag/types';

interface UseCorrespondenceVotesParams {
  agId: string;
}

interface UseCorrespondenceVotesReturn {
  // Data
  owners: EligibleOwner[];
  resolutions: AgResolution[];
  status: CorrespondenceStatus | null;

  // UI State
  selectedOwner: EligibleOwner | null;
  pendingVotes: Map<string, VoteDirection>; // resolution_id -> vote

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;

  // Actions
  selectOwner: (owner: EligibleOwner | null) => void;
  setVote: (resolutionId: string, vote: VoteDirection) => void;
  clearVotes: () => void;
  submitVotes: (modeReception?: 'postal' | 'email' | 'remise_main') => Promise<CorrespondenceFormResult>;
  refresh: () => Promise<void>;

  // Computed
  canSubmit: boolean;
  votedCount: number;
  totalResolutions: number;
}

export function useCorrespondenceVotes({ agId }: UseCorrespondenceVotesParams): UseCorrespondenceVotesReturn {
  const { supabase } = useSupabase();

  // Data states
  const [owners, setOwners] = useState<EligibleOwner[]>([]);
  const [resolutions, setResolutions] = useState<AgResolution[]>([]);
  const [status, setStatus] = useState<CorrespondenceStatus | null>(null);

  // UI states
  const [selectedOwner, setSelectedOwner] = useState<EligibleOwner | null>(null);
  const [pendingVotes, setPendingVotes] = useState<Map<string, VoteDirection>>(new Map());

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charger les données initiales
   */
  const loadData = useCallback(async () => {
    if (!supabase) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Charger les copropriétaires éligibles via la fonction RPC
      const { data: eligibleData, error: eligibleError } = await supabase
        .rpc('get_correspondence_eligible_owners', { p_ag_id: agId });

      if (eligibleError) throw eligibleError;

      if (eligibleData?.success) {
        setOwners(eligibleData.owners || []);
      }

      // 2. Charger les résolutions
      const { data: resolutionsData, error: resError } = await supabase
        .from('ag_resolutions')
        .select('*')
        .eq('ag_id', agId)
        .order('resolution_number', { ascending: true });

      if (resError) throw resError;
      setResolutions(resolutionsData || []);

      // 3. Charger le statut global des votes par correspondance
      const { data: statusData, error: statusError } = await supabase
        .from('v_ag_correspondence_status')
        .select('*')
        .eq('ag_id', agId)
        .single();

      if (!statusError && statusData) {
        setStatus(statusData as CorrespondenceStatus);
      }

    } catch (err) {
      console.error('Error loading correspondence data:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, agId]);

  /**
   * Charger au montage
   */
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Sélectionner un copropriétaire
   */
  const selectOwner = useCallback((owner: EligibleOwner | null) => {
    setSelectedOwner(owner);
    setPendingVotes(new Map());

    // Si le copropriétaire a déjà des votes correspondance enregistrés, les précharger
    if (owner?.voted_resolutions) {
      const existingVotes = new Map<string, VoteDirection>();
      owner.voted_resolutions
        .filter(v => v.vote_source === 'correspondence')
        .forEach(v => {
          existingVotes.set(v.resolution_id, v.vote);
        });
      setPendingVotes(existingVotes);
    }
  }, []);

  /**
   * Définir un vote pour une résolution
   */
  const setVote = useCallback((resolutionId: string, vote: VoteDirection) => {
    setPendingVotes(prev => {
      const newMap = new Map(prev);
      newMap.set(resolutionId, vote);
      return newMap;
    });
  }, []);

  /**
   * Effacer tous les votes en attente
   */
  const clearVotes = useCallback(() => {
    setPendingVotes(new Map());
  }, []);

  /**
   * Soumettre les votes par correspondance
   */
  const submitVotes = useCallback(async (
    modeReception: 'postal' | 'email' | 'remise_main' = 'postal'
  ): Promise<CorrespondenceFormResult> => {
    if (!supabase || !selectedOwner) {
      return { success: false, error: 'Aucun copropriétaire sélectionné' };
    }

    if (pendingVotes.size === 0) {
      return { success: false, error: 'Aucun vote à enregistrer' };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convertir la Map en tableau
      const votesArray: CorrespondenceVoteInput[] = [];
      pendingVotes.forEach((vote, resolutionId) => {
        votesArray.push({ resolution_id: resolutionId, vote });
      });

      // Appeler la fonction RPC
      const { data, error: rpcError } = await supabase
        .rpc('register_correspondence_form_votes', {
          p_ag_id: agId,
          p_coproprietaire_id: selectedOwner.id,
          p_votes: votesArray,
          p_mode_reception: modeReception,
        });

      if (rpcError) throw rpcError;

      const result = data as CorrespondenceFormResult;

      if (result.success) {
        // Rafraîchir les données
        await loadData();
        // Réinitialiser la sélection
        setSelectedOwner(null);
        setPendingVotes(new Map());
      } else {
        setError(result.error || 'Erreur lors de l\'enregistrement');
      }

      return result;

    } catch (err) {
      console.error('Error submitting correspondence votes:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur de soumission';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [supabase, agId, selectedOwner, pendingVotes, loadData]);

  /**
   * Rafraîchir les données
   */
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  /**
   * Calculs dérivés
   */
  const canSubmit = useMemo(() => {
    return selectedOwner !== null && pendingVotes.size > 0 && !isSubmitting;
  }, [selectedOwner, pendingVotes, isSubmitting]);

  const votedCount = pendingVotes.size;
  const totalResolutions = resolutions.length;

  return {
    // Data
    owners,
    resolutions,
    status,

    // UI State
    selectedOwner,
    pendingVotes,

    // Loading states
    isLoading,
    isSubmitting,
    error,

    // Actions
    selectOwner,
    setVote,
    clearVotes,
    submitVotes,
    refresh,

    // Computed
    canSubmit,
    votedCount,
    totalResolutions,
  };
}

export default useCorrespondenceVotes;
