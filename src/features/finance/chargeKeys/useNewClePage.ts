'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { clesRepartitionApi, lotsApi, coproprietairesApi } from '@/shared/services';
import type { MockCleRepartition, MockLot, MockCoproprietaire } from '@/shared/mock/finance';

export interface LotWithCopro {
  lot: MockLot;
  coproprietaire: MockCoproprietaire | null;
}

export function useNewClePage() {
  const router = useRouter();

  const [lotsData, setLotsData] = useState<LotWithCopro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<MockCleRepartition['type']>('GENERALE');
  const [description, setDescription] = useState('');
  const [tantiemesEdits, setTantiemesEdits] = useState<Record<string, number>>({});

  const loadLots = useCallback(async () => {
    setIsLoading(true);
    try {
      const [lotsResult, coprosResult] = await Promise.all([
        lotsApi.list({ pageSize: 100 }),
        coproprietairesApi.list({ pageSize: 100 }),
      ]);

      if (lotsResult.success && lotsResult.data && coprosResult.success && coprosResult.data) {
        const coprosMap = new Map(coprosResult.data.data.map((c: MockCoproprietaire) => [c.id, c]));
        const lotsWithCopro = lotsResult.data.data.map((lot: MockLot) => ({
          lot,
          coproprietaire: coprosMap.get(lot.coproprietaireId) || null,
        }));
        setLotsData(lotsWithCopro.sort((a: LotWithCopro, b: LotWithCopro) => a.lot.numero.localeCompare(b.lot.numero)));

        const initialEdits: Record<string, number> = {};
        lotsResult.data.data.forEach((lot: MockLot) => {
          initialEdits[lot.id] = 0;
        });
        setTantiemesEdits(initialEdits);
      }
    } catch {
      setError('Erreur lors du chargement des lots');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    return nom.trim() !== '' && code.trim() !== '' && calculatedTotal > 0;
  }, [nom, code, calculatedTotal]);

  const handleSave = useCallback(async () => {
    if (!isFormValid) return;
    setIsSaving(true);
    setError(null);

    try {
      const tantiemesParLot = Object.entries(tantiemesEdits)
        .filter(([, t]) => t > 0)
        .map(([lotId, tantiemes]) => ({ lotId, tantiemes }));

      const newCle: Omit<MockCleRepartition, 'id'> = {
        coproprieteId: 'copro-1',
        nom: nom.trim(),
        code: code.trim().toUpperCase(),
        type,
        description: description.trim() || undefined,
        totalTantiemes: calculatedTotal,
        tantiemesParLot,
      };

      const result = await clesRepartitionApi.create(newCle);
      if (result.success && result.data) {
        router.push('/finance/cles-repartition');
      } else {
        setError(result.error || 'Erreur lors de la création');
      }
    } catch {
      setError('Erreur lors de la création de la clé');
    } finally {
      setIsSaving(false);
    }
  }, [isFormValid, nom, code, type, description, calculatedTotal, tantiemesEdits, router]);

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
        'APPARTEMENT': 100,
        'STUDIO': 30,
        'PARKING': 10,
        'CAVE': 5,
        'COMMERCE': 150,
      };
      const totalWeight = lotsData.reduce((sum, item) => sum + (weights[item.lot.type] || 50), 0);
      const newEdits: Record<string, number> = {};
      let remaining = 10000;
      lotsData.forEach((item, idx) => {
        const weight = weights[item.lot.type] || 50;
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
