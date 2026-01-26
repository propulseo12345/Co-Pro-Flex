'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { clesRepartitionApi, type ValidationResult } from '@/shared/services';
import type { MockCleRepartition, MockLot, MockCoproprietaire } from '@/shared/mock/finance';

export interface LotWithTantiemes {
  lot: MockLot;
  coproprietaire: MockCoproprietaire;
  tantiemes: number;
}

export function useCleDetailPage(cleId: string) {
  const router = useRouter();

  const [cle, setCle] = useState<MockCleRepartition | null>(null);
  const [lotsData, setLotsData] = useState<LotWithTantiemes[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<MockCleRepartition['type']>('GENERALE');
  const [description, setDescription] = useState('');
  const [tantiemesEdits, setTantiemesEdits] = useState<Record<string, number>>({});

  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationMontant, setSimulationMontant] = useState('10000');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cleResult, lotsResult, validationResult] = await Promise.all([
        clesRepartitionApi.getById(cleId),
        clesRepartitionApi.getLotsAvecTantiemes(cleId),
        clesRepartitionApi.validerTantiemes(cleId),
      ]);

      if (cleResult.success && cleResult.data) {
        setCle(cleResult.data);
        setNom(cleResult.data.nom);
        setCode(cleResult.data.code);
        setType(cleResult.data.type);
        setDescription(cleResult.data.description || '');
      } else {
        setError('Clé de répartition non trouvée');
      }

      if (lotsResult.success && lotsResult.data) {
        setLotsData(lotsResult.data);
        const initialEdits: Record<string, number> = {};
        lotsResult.data.forEach((item: LotWithTantiemes) => {
          initialEdits[item.lot.id] = item.tantiemes;
        });
        setTantiemesEdits(initialEdits);
      }

      if (validationResult.success && validationResult.data) {
        setValidation(validationResult.data);
      }
    } catch {
      setError('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  }, [cleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTantiemesChange = useCallback((lotId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setTantiemesEdits(prev => ({ ...prev, [lotId]: numValue }));
    setHasChanges(true);
  }, []);

  const calculatedTotal = useMemo(() => {
    return Object.values(tantiemesEdits).reduce((sum, t) => sum + t, 0);
  }, [tantiemesEdits]);

  const handleSave = useCallback(async () => {
    if (!cle) return;
    setIsSaving(true);
    try {
      await clesRepartitionApi.update(cle.id, { nom, code, type, description });
      for (const [lotId, tantiemes] of Object.entries(tantiemesEdits)) {
        await clesRepartitionApi.updateTantiemesLot(cle.id, lotId, tantiemes);
      }
      setHasChanges(false);
      await loadData();
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [cle, nom, code, type, description, tantiemesEdits, loadData]);

  const simulationResult = useMemo(() => {
    if (!showSimulation) return null;
    const montant = parseFloat(simulationMontant) || 0;
    if (montant <= 0 || calculatedTotal === 0) return null;

    return lotsData.map(item => {
      const tantiemes = tantiemesEdits[item.lot.id] || 0;
      const pourcentage = (tantiemes / calculatedTotal) * 100;
      const montantLot = (montant * tantiemes) / calculatedTotal;
      return {
        ...item,
        tantiemes,
        pourcentage: Math.round(pourcentage * 100) / 100,
        montant: Math.round(montantLot * 100) / 100,
      };
    }).filter(item => item.tantiemes > 0);
  }, [showSimulation, simulationMontant, tantiemesEdits, calculatedTotal, lotsData]);

  const goBack = useCallback(() => router.push('/finance/cles-repartition'), [router]);
  const toggleSimulation = useCallback(() => setShowSimulation(prev => !prev), []);

  const handleNomChange = useCallback((value: string) => { setNom(value); setHasChanges(true); }, []);
  const handleCodeChange = useCallback((value: string) => { setCode(value.toUpperCase()); setHasChanges(true); }, []);
  const handleTypeChange = useCallback((value: MockCleRepartition['type']) => { setType(value); setHasChanges(true); }, []);
  const handleDescriptionChange = useCallback((value: string) => { setDescription(value); setHasChanges(true); }, []);

  return {
    cle,
    lotsData,
    validation,
    isLoading,
    isSaving,
    error,
    hasChanges,
    nom,
    code,
    type,
    description,
    tantiemesEdits,
    showSimulation,
    simulationMontant,
    setSimulationMontant,
    calculatedTotal,
    simulationResult,
    goBack,
    toggleSimulation,
    handleNomChange,
    handleCodeChange,
    handleTypeChange,
    handleDescriptionChange,
    handleTantiemesChange,
    handleSave,
  };
}
