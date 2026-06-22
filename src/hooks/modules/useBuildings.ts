'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  type Building,
  type BuildingCreate,
  type BuildingUpdate,
} from '@/lib/buildings/api';

/**
 * Gère les bâtiments d'une copropriété (chargement + CRUD).
 * Réutilisable dans le wizard d'onboarding (étape 3) et dans les paramètres copro.
 */
export function useBuildings(coproId: string) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!coproId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error: err } = await listBuildings(coproId);
    if (err) setError(err.message);
    else setBuildings(data ?? []);
    setIsLoading(false);
  }, [coproId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (payload: Omit<BuildingCreate, 'copro_id'>) => {
      setIsMutating(true);
      const { data, error: err } = await createBuilding({ ...payload, copro_id: coproId });
      if (err) setError(err.message);
      else await refresh();
      setIsMutating(false);
      return data;
    },
    [coproId, refresh]
  );

  const update = useCallback(
    async (buildingId: string, updates: BuildingUpdate) => {
      setIsMutating(true);
      const { success, error: err } = await updateBuilding(coproId, buildingId, updates);
      if (err) setError(err.message);
      else await refresh();
      setIsMutating(false);
      return success;
    },
    [coproId, refresh]
  );

  const remove = useCallback(
    async (buildingId: string) => {
      setIsMutating(true);
      const { success, error: err } = await deleteBuilding(coproId, buildingId);
      if (err) setError(err.message);
      else await refresh();
      setIsMutating(false);
      return success;
    },
    [coproId, refresh]
  );

  return { buildings, isLoading, isMutating, error, create, update, remove, refresh };
}
