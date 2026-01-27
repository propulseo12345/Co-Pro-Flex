'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import { useRepartitionKeys, type RepartitionKeyWithTotals, type ValidationResult } from '@/hooks/modules/useLotsData';
import * as lotsApi from '@/lib/lots/api';

export interface CleWithValidation extends RepartitionKeyWithTotals {
  validation?: ValidationResult;
}

/**
 * Hook pour la page des clés de répartition
 * P0#2: Migration Mock → Supabase
 */
export function useClesRepartitionPage() {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();
  const { keys, isLoading, error, refresh, deleteKey, isMutating } = useRepartitionKeys();

  const [clesWithValidation, setClesWithValidation] = useState<CleWithValidation[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [simulationModal, setSimulationModal] = useState<{ cle: RepartitionKeyWithTotals; montant: number } | null>(null);
  const [montantSimulation, setMontantSimulation] = useState<string>('10000');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load validations for all keys
  const loadValidations = useCallback(async () => {
    if (!currentCoproId || keys.length === 0) {
      setClesWithValidation([]);
      return;
    }

    try {
      const validations = await Promise.all(
        keys.map(async (key) => {
          const { data: validation } = await lotsApi.validateRepartitionKey(currentCoproId, key.key_id);
          return {
            ...key,
            validation: validation || undefined,
          };
        })
      );
      setClesWithValidation(validations);
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : 'Erreur validation');
    }
  }, [currentCoproId, keys]);

  // Trigger validation load when keys change
  useState(() => {
    if (keys.length > 0) {
      loadValidations();
    }
  });

  // Reload everything
  const loadCles = useCallback(async () => {
    await refresh();
    await loadValidations();
  }, [refresh, loadValidations]);

  const handleDelete = useCallback(async (id: string) => {
    if (!isManager) {
      alert('Seuls les gestionnaires peuvent supprimer une clé');
      return;
    }

    const success = await deleteKey(id);
    if (success) {
      setDeleteConfirm(null);
      await loadValidations();
    } else {
      alert('Erreur lors de la suppression');
      setDeleteConfirm(null);
    }
  }, [deleteKey, isManager, loadValidations]);

  const handleSimulation = useCallback((cle: RepartitionKeyWithTotals) => {
    setSimulationModal({ cle, montant: parseFloat(montantSimulation) || 10000 });
  }, [montantSimulation]);

  const goToNew = useCallback(() => router.push('/finance/cles-repartition/new'), [router]);
  const goToDetail = useCallback((id: string) => router.push(`/finance/cles-repartition/${id}`), [router]);
  const openDeleteConfirm = useCallback((id: string) => setDeleteConfirm(id), []);
  const closeDeleteConfirm = useCallback(() => setDeleteConfirm(null), []);
  const closeSimulationModal = useCallback(() => setSimulationModal(null), []);

  // Use keys directly, with validation data when available
  const cles = clesWithValidation.length > 0 ? clesWithValidation : keys.map(k => ({ ...k } as CleWithValidation));

  const stats = {
    total: cles.length,
    valid: cles.filter(c => c.validation?.isValid ?? c.is_complete).length,
    withAlerts: cles.filter(c => !(c.validation?.isValid ?? c.is_complete)).length,
  };

  return {
    cles,
    isLoading,
    error: error || validationError,
    deleteConfirm,
    simulationModal,
    montantSimulation,
    setMontantSimulation,
    stats,
    loadCles,
    handleDelete,
    handleSimulation,
    goToNew,
    goToDetail,
    openDeleteConfirm,
    closeDeleteConfirm,
    closeSimulationModal,
    isManager,
    currentCoproId,
    isMutating,
  };
}
