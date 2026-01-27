'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import * as lotsApi from '@/lib/lots/api';

// Types matching Supabase structure
export type CleType = 'GENERALE' | 'PERSONNALISEE';

export interface LotForNewCle {
  lot: {
    id: string;
    numero: string;
    type: string | null;
  };
  coproprietaire: {
    nom: string;
    prenom: string;
  } | null;
}

// Map UI type to database basis
const typeToBasis = (type: CleType): lotsApi.RepartitionBasis => {
  switch (type) {
    case 'GENERALE':
      return 'tantiemes';
    case 'PERSONNALISEE':
      return 'custom';
    default:
      return 'tantiemes';
  }
};

export function useNewClePage() {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();

  const [lotsData, setLotsData] = useState<LotForNewCle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<CleType>('GENERALE');
  const [description, setDescription] = useState('');
  const [tantiemesEdits, setTantiemesEdits] = useState<Record<string, number>>({});

  const loadLots = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const result = await lotsApi.listLotsWithOwners(currentCoproId);

      if (result.data) {
        const lotsWithCopro: LotForNewCle[] = result.data.map(lot => ({
          lot: {
            id: lot.id,
            numero: lot.ref,
            type: lot.type,
          },
          coproprietaire: lot.owner_display_name
            ? { nom: lot.owner_display_name, prenom: '' }
            : null,
        }));

        setLotsData(lotsWithCopro.sort((a, b) => a.lot.numero.localeCompare(b.lot.numero)));

        // Initialize tantiemes edits
        const initialEdits: Record<string, number> = {};
        result.data.forEach(lot => {
          initialEdits[lot.id] = 0;
        });
        setTantiemesEdits(initialEdits);
      }
    } catch {
      setError('Erreur lors du chargement des lots');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  useEffect(() => {
    loadLots();
  }, [loadLots]);

  const handleTantiemesChange = useCallback((lotId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setTantiemesEdits(prev => ({ ...prev, [lotId]: numValue }));
  }, []);

  const calculatedTotal = useMemo(() => {
    return Object.values(tantiemesEdits).reduce((sum, t) => sum + t, 0);
  }, [tantiemesEdits]);

  const isFormValid = useMemo(() => {
    return nom.trim() !== '' && calculatedTotal > 0 && isManager;
  }, [nom, calculatedTotal, isManager]);

  const handleSave = useCallback(async () => {
    if (!isFormValid || !currentCoproId || !isManager) return;
    setIsSaving(true);
    setError(null);

    try {
      // Create the repartition key
      const keyResult = await lotsApi.createRepartitionKey({
        copro_id: currentCoproId,
        name: nom.trim(),
        description: description.trim() || null,
        basis: typeToBasis(type),
        coverage_mode: 'all_lots',
        is_active: true,
      });

      if (keyResult.error || !keyResult.data) {
        setError(keyResult.error?.message || 'Erreur lors de la création');
        return;
      }

      const newKeyId = keyResult.data.id;

      // Create lines for each lot with tantiemes > 0
      const linesToCreate = Object.entries(tantiemesEdits)
        .filter(([, t]) => t > 0)
        .map(([lotId, weight]) => ({
          copro_id: currentCoproId,
          key_id: newKeyId,
          lot_id: lotId,
          weight,
        }));

      // Upsert all lines
      for (const line of linesToCreate) {
        await lotsApi.upsertRepartitionKeyLine(line);
      }

      router.push('/finance/cles-repartition');
    } catch {
      setError('Erreur lors de la création de la clé');
    } finally {
      setIsSaving(false);
    }
  }, [isFormValid, currentCoproId, isManager, nom, description, type, tantiemesEdits, router]);

  const fillFromExisting = useCallback((fillType: 'equal' | 'surface') => {
    if (fillType === 'equal') {
      const baseValue = Math.floor(10000 / lotsData.length);
      const newEdits: Record<string, number> = {};
      lotsData.forEach((item, idx) => {
        if (idx === lotsData.length - 1) {
          const currentSum = (lotsData.length - 1) * baseValue;
          newEdits[item.lot.id] = 10000 - currentSum;
        } else {
          newEdits[item.lot.id] = baseValue;
        }
      });
      setTantiemesEdits(newEdits);
    } else if (fillType === 'surface') {
      const weights: Record<string, number> = {
        'appartement': 100,
        'studio': 30,
        'parking': 10,
        'cave': 5,
        'commerce': 150,
      };
      const totalWeight = lotsData.reduce((sum, item) => {
        const lotType = (item.lot.type || '').toLowerCase();
        return sum + (weights[lotType] || 50);
      }, 0);
      const newEdits: Record<string, number> = {};
      let remaining = 10000;
      lotsData.forEach((item, idx) => {
        const lotType = (item.lot.type || '').toLowerCase();
        const weight = weights[lotType] || 50;
        if (idx === lotsData.length - 1) {
          newEdits[item.lot.id] = remaining;
        } else {
          const value = Math.round((weight / totalWeight) * 10000);
          newEdits[item.lot.id] = value;
          remaining -= value;
        }
      });
      setTantiemesEdits(newEdits);
    }
  }, [lotsData]);

  const clearAll = useCallback(() => {
    const newEdits: Record<string, number> = {};
    lotsData.forEach(item => {
      newEdits[item.lot.id] = 0;
    });
    setTantiemesEdits(newEdits);
  }, [lotsData]);

  const goBack = useCallback(() => router.push('/finance/cles-repartition'), [router]);

  const lotsConfigured = Object.values(tantiemesEdits).filter(t => t > 0).length;

  return {
    currentCoproId,
    isManager,
    lotsData,
    isLoading,
    isSaving,
    error,
    nom,
    setNom,
    code,
    setCode,
    type,
    setType,
    description,
    setDescription,
    tantiemesEdits,
    calculatedTotal,
    isFormValid,
    lotsConfigured,
    handleTantiemesChange,
    handleSave,
    fillFromExisting,
    clearAll,
    goBack,
  };
}
