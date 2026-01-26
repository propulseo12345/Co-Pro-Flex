'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { clesRepartitionApi, type ValidationResult } from '@/shared/services';
import type { MockCleRepartition } from '@/shared/mock/finance';

export interface CleWithValidation extends MockCleRepartition {
  validation?: ValidationResult;
}

export function useClesRepartitionPage() {
  const router = useRouter();
  const [cles, setCles] = useState<CleWithValidation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [simulationModal, setSimulationModal] = useState<{ cle: MockCleRepartition; montant: number } | null>(null);
  const [montantSimulation, setMontantSimulation] = useState<string>('10000');

  const loadCles = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await clesRepartitionApi.list({ sortBy: 'nom', sortOrder: 'asc' });
      if (result.success && result.data) {
        const clesWithValidation = await Promise.all(
          result.data.data.map(async (cle: MockCleRepartition) => {
            const validation = await clesRepartitionApi.validerTantiemes(cle.id);
            return { ...cle, validation: validation.data };
          })
        );
        setCles(clesWithValidation);
      }
    } catch {
      setError('Erreur lors du chargement des clés de répartition');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCles();
  }, [loadCles]);

  const handleDelete = useCallback(async (id: string) => {
    const result = await clesRepartitionApi.delete(id);
    if (result.success) {
      setCles(prev => prev.filter(c => c.id !== id));
      setDeleteConfirm(null);
    } else {
      alert(result.error || 'Erreur lors de la suppression');
      setDeleteConfirm(null);
    }
  }, []);

  const handleSimulation = useCallback((cle: MockCleRepartition) => {
    setSimulationModal({ cle, montant: parseFloat(montantSimulation) || 10000 });
  }, [montantSimulation]);

  const goToNew = useCallback(() => router.push('/finance/cles-repartition/new'), [router]);
  const goToDetail = useCallback((id: string) => router.push(`/finance/cles-repartition/${id}`), [router]);
  const openDeleteConfirm = useCallback((id: string) => setDeleteConfirm(id), []);
  const closeDeleteConfirm = useCallback(() => setDeleteConfirm(null), []);
  const closeSimulationModal = useCallback(() => setSimulationModal(null), []);

  const stats = {
    total: cles.length,
    valid: cles.filter(c => c.validation?.isValid).length,
    withAlerts: cles.filter(c => !c.validation?.isValid).length,
  };

  return {
    cles,
    isLoading,
    error,
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
  };
}
