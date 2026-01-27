'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCopro } from '@/providers/CoproContext';
import {
  useRepartitionKeyDetail,
  useLots,
  type RepartitionKeyWithTotals,
  type RepartitionKeyLineDetailed,
  type ValidationResult,
  type RepartitionBasis,
} from '@/hooks/modules/useLotsData';
import * as lotsApi from '@/lib/lots/api';

export interface LotWithTantiemes {
  lot: {
    id: string;
    numero: string;
    type: string;
    etage: number | null;
    surface: number | null;
    batiment: string | null;
    tantiemesGeneraux: number;
  };
  coproprietaire: {
    id: string;
    nom: string;
    prenom: string;
    email: string | null;
  };
  tantiemes: number;
}

// Map DB basis to UI type
function basisToType(basis: RepartitionBasis): 'GENERALE' | 'PERSONNALISEE' {
  return basis === 'tantiemes' ? 'GENERALE' : 'PERSONNALISEE';
}

// Map UI type to DB basis
function typeToBasis(type: string): RepartitionBasis {
  return type === 'GENERALE' ? 'tantiemes' : 'custom';
}

/**
 * Hook pour la page de détail d'une clé de répartition
 * P0#2: Migration Mock → Supabase
 */
export function useCleDetailPage(cleId: string) {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();
  const { key, lines, validation, isLoading, error, refresh, updateLineWeight, isMutating } = useRepartitionKeyDetail(cleId);
  const { lots } = useLots();

  const [hasChanges, setHasChanges] = useState(false);

  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<'GENERALE' | 'PERSONNALISEE'>('GENERALE');
  const [description, setDescription] = useState('');
  const [tantiemesEdits, setTantiemesEdits] = useState<Record<string, number>>({});

  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationMontant, setSimulationMontant] = useState('10000');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form when key loads
  useState(() => {
    if (key) {
      setNom(key.name);
      setCode(key.key_id.slice(0, 8).toUpperCase());
      setType(basisToType(key.basis));
      setDescription(key.description || '');
    }
  });

  // Initialize tantiemes edits from lines
  useState(() => {
    if (lines.length > 0) {
      const initialEdits: Record<string, number> = {};
      lines.forEach((line) => {
        initialEdits[line.lot_id] = line.weight;
      });
      setTantiemesEdits(initialEdits);
    }
  });

  // Map Supabase data to UI format
  const lotsData = useMemo((): LotWithTantiemes[] => {
    if (!lots || lots.length === 0) return [];

    return lots.map(lot => {
      const line = lines.find(l => l.lot_id === lot.id);
      return {
        lot: {
          id: lot.id,
          numero: lot.ref,
          type: lot.type || 'appartement',
          etage: lot.floor,
          surface: lot.surface,
          batiment: lot.building_name,
          tantiemesGeneraux: lot.tantiemes_generaux,
        },
        coproprietaire: {
          id: lot.coproprietaire_id || '',
          nom: lot.owner_last_name || lot.owner_display_name || 'N/A',
          prenom: lot.owner_first_name || '',
          email: lot.owner_email,
        },
        tantiemes: tantiemesEdits[lot.id] ?? line?.weight ?? 0,
      };
    }).sort((a, b) => a.lot.numero.localeCompare(b.lot.numero));
  }, [lots, lines, tantiemesEdits]);

  const handleTantiemesChange = useCallback((lotId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setTantiemesEdits(prev => ({ ...prev, [lotId]: numValue }));
    setHasChanges(true);
  }, []);

  const calculatedTotal = useMemo(() => {
    return Object.values(tantiemesEdits).reduce((sum, t) => sum + t, 0);
  }, [tantiemesEdits]);

  const handleSave = useCallback(async () => {
    if (!key || !currentCoproId || !isManager) {
      setSaveError('Permission refusée');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      // Update key metadata
      await lotsApi.updateRepartitionKey(currentCoproId, key.key_id, {
        name: nom,
        description: description || null,
        basis: typeToBasis(type),
      });

      // Update line weights
      const originalLines = new Map(lines.map(l => [l.lot_id, l.weight]));
      const updatePromises: Promise<unknown>[] = [];

      for (const [lotId, weight] of Object.entries(tantiemesEdits)) {
        const originalWeight = originalLines.get(lotId);
        if (originalWeight !== weight) {
          if (originalWeight === undefined && weight > 0) {
            // Add new line
            updatePromises.push(
              lotsApi.upsertRepartitionKeyLine({
                copro_id: currentCoproId,
                key_id: key.key_id,
                lot_id: lotId,
                weight,
              })
            );
          } else if (weight === 0 && originalWeight !== undefined) {
            // Remove line
            updatePromises.push(
              lotsApi.deleteRepartitionKeyLine(currentCoproId, key.key_id, lotId)
            );
          } else if (weight > 0) {
            // Update existing line
            updatePromises.push(updateLineWeight(lotId, weight));
          }
        }
      }

      await Promise.all(updatePromises);
      setHasChanges(false);
      await refresh();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  }, [key, currentCoproId, isManager, nom, description, type, tantiemesEdits, lines, updateLineWeight, refresh]);

  const simulationResult = useMemo(() => {
    if (!showSimulation) return null;
    const montant = parseFloat(simulationMontant) || 0;
    if (montant <= 0 || calculatedTotal === 0) return null;

    return lotsData.map(item => {
      const tantiemes = tantiemesEdits[item.lot.id] ?? item.tantiemes;
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
  const handleTypeChange = useCallback((value: 'GENERALE' | 'PERSONNALISEE') => { setType(value); setHasChanges(true); }, []);
  const handleDescriptionChange = useCallback((value: string) => { setDescription(value); setHasChanges(true); }, []);

  // Adapt to UI expected structure
  const cle = key ? {
    id: key.key_id,
    nom: key.name,
    code: key.key_id.slice(0, 8).toUpperCase(),
    type: basisToType(key.basis),
    description: key.description,
    totalTantiemes: key.total_weight,
    tantiemesParLot: lines.map(l => ({ lotId: l.lot_id, tantiemes: l.weight })),
  } : null;

  return {
    cle,
    lotsData,
    validation,
    isLoading,
    isSaving: isSaving || isMutating,
    error: error || saveError,
    hasChanges,
    nom: nom || key?.name || '',
    code: code || (key?.key_id.slice(0, 8).toUpperCase() ?? ''),
    type,
    description: description || key?.description || '',
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
    isManager,
    currentCoproId,
  };
}
