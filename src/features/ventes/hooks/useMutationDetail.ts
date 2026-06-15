'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import {
  fetchMutationById,
  fetchEtatDateSnapshots,
  updateMutation,
  cancelMutation,
  generateEtatDate,
  validateMutation,
  sendToNotary,
} from '../api/mutationsApi';
import type {
  MutationOverview,
  EtatDateSnapshot,
  Mutation,
  SnapshotType,
  ValidateMutationInput,
} from '../domain/types';

interface UseMutationDetailOptions {
  mutationId: string;
}

export function useMutationDetail({ mutationId }: UseMutationDetailOptions) {
  const { currentCoproId, isManager } = useCopro();

  const [mutation, setMutation] = useState<MutationOverview | null>(null);
  const [snapshots, setSnapshots] = useState<EtatDateSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Charger les données
  const loadData = useCallback(async () => {
    if (!currentCoproId || !mutationId) {
      setMutation(null);
      setSnapshots([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [mutationData, snapshotsData] = await Promise.all([
        fetchMutationById(currentCoproId, mutationId),
        fetchEtatDateSnapshots(currentCoproId, mutationId),
      ]);

      setMutation(mutationData);
      setSnapshots(snapshotsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId, mutationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Obtenir le dernier snapshot par type
  const getLatestSnapshot = useCallback(
    (type: SnapshotType): EtatDateSnapshot | null => {
      return snapshots.find((s) => s.snapshot_type === type) || null;
    },
    [snapshots]
  );

  // Générer un état daté
  const handleGenerateEtatDate = useCallback(
    async (snapshotType: SnapshotType) => {
      if (!currentCoproId || !mutationId) return;

      setIsProcessing(true);
      try {
        const result = await generateEtatDate(currentCoproId, mutationId, snapshotType);

        if (result.success) {
          setToast({
            message: snapshotType === 'pre' ? 'Pré-état daté généré' : 'État daté final généré',
            type: 'success',
          });
          await loadData();
        } else {
          setToast({
            message: result.error || 'Erreur lors de la génération',
            type: 'error',
          });
        }

        return result;
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : 'Erreur',
          type: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [currentCoproId, mutationId, loadData]
  );

  // Valider la mutation (transfert propriété)
  const handleValidateMutation = useCallback(
    async (input: Omit<ValidateMutationInput, 'mutation_id'>) => {
      if (!mutationId) return;

      setIsProcessing(true);
      try {
        const result = await validateMutation({
          ...input,
          mutation_id: mutationId,
        });

        if (result.success) {
          setToast({
            message: 'Mutation validée - Transfert de propriété effectué',
            type: 'success',
          });
          await loadData();
        } else {
          setToast({
            message: result.error || 'Erreur lors de la validation',
            type: 'error',
          });
        }

        return result;
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : 'Erreur',
          type: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [mutationId, loadData]
  );

  // Mettre à jour la mutation
  const handleUpdateMutation = useCallback(
    async (updates: Partial<Mutation>) => {
      if (!mutationId) return;

      setIsProcessing(true);
      try {
        await updateMutation(mutationId, updates);
        setToast({ message: 'Mutation mise à jour', type: 'success' });
        await loadData();
      } catch (err) {
        setToast({
          message: err instanceof Error ? err.message : 'Erreur',
          type: 'error',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [mutationId, loadData]
  );

  // Annuler la mutation
  const handleCancelMutation = useCallback(async () => {
    if (!mutationId) return;

    setIsProcessing(true);
    try {
      await cancelMutation(mutationId);
      setToast({ message: 'Mutation annulée', type: 'success' });
      await loadData();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erreur',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [mutationId, loadData]);

  // Envoyer au notaire (jalon 0079 : etat_generated -> sent_to_notary)
  const handleSendToNotary = useCallback(async () => {
    if (!mutationId) return;

    setIsProcessing(true);
    try {
      await sendToNotary(mutationId);
      setToast({ message: 'Dossier envoyé au notaire', type: 'success' });
      await loadData();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Erreur',
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [mutationId, loadData]);

  // Marquer comme signé
  const handleMarkAsSigned = useCallback(
    async (signatureDate: string) => {
      await handleUpdateMutation({
        status: 'signed',
        signature_date: signatureDate,
      });
    },
    [handleUpdateMutation]
  );

  // Cacher le toast
  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  // Calculer les actions disponibles selon le status
  const availableActions = {
    canGeneratePreEtat: mutation?.status === 'draft',
    canGenerateFinalEtat:
      mutation?.status === 'pre_etat_generated' || mutation?.status === 'etat_generated',
    canSendToNotary: mutation?.status === 'etat_generated',
    canMarkAsSigned: mutation?.status === 'sent_to_notary',
    canValidate: mutation?.status === 'signed',
    canCancel:
      mutation?.status !== 'validated' && mutation?.status !== 'cancelled',
    canEdit:
      mutation?.status !== 'validated' && mutation?.status !== 'cancelled' && isManager,
  };

  return {
    // Data
    mutation,
    snapshots,
    isLoading,
    error,
    isProcessing,
    toast,

    // Snapshots helpers
    preEtatSnapshot: getLatestSnapshot('pre'),
    finalEtatSnapshot: getLatestSnapshot('final'),

    // Actions
    generateEtatDate: handleGenerateEtatDate,
    validateMutation: handleValidateMutation,
    updateMutation: handleUpdateMutation,
    cancelMutation: handleCancelMutation,
    sendToNotary: handleSendToNotary,
    markAsSigned: handleMarkAsSigned,
    refresh: loadData,
    hideToast,

    // Permissions
    availableActions,
    isManager,
  };
}
