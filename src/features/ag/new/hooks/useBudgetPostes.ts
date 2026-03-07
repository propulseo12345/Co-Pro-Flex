'use client';

import { useState, useCallback } from 'react';
import type { BudgetPoste, EditingPosteState } from '../domain/types';
import type { BudgetImportSource } from './useBudgetImport';

interface UseBudgetPostesProps {
  budgetPostes: BudgetPoste[];
  onPostesChange: (postes: BudgetPoste[]) => void;
  /** Fonction async pour importer le budget (depuis Supabase) */
  importBudgetFn?: (params: {
    exercice: number;
    source: BudgetImportSource;
    budgetId?: string | null;
  }) => Promise<BudgetPoste[]>;
  /** Année d'exercice pour l'import */
  exercice?: number;
  /** Résout les données comptables pour un poste (compte + clé) */
  resolveAccountData?: (posteName: string) => {
    accountId?: string;
    accountCode?: string;
    accountName?: string;
    repartitionKeyId?: string;
    repartitionKeyName?: string;
  } | null;
}

export function useBudgetPostes({
  budgetPostes,
  onPostesChange,
  importBudgetFn,
  exercice,
  resolveAccountData,
}: UseBudgetPostesProps) {
  const [newPoste, setNewPoste] = useState({ poste: '', montant: '' });
  const [showCustomPoste, setShowCustomPoste] = useState(false);
  const [editing, setEditing] = useState<EditingPosteState>({
    id: null,
    data: { poste: '', montant: '' },
    error: null,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handlePosteSelect = useCallback((value: string) => {
    if (value === 'Autre') {
      setShowCustomPoste(true);
      setNewPoste((prev) => ({ ...prev, poste: '' }));
    } else {
      setShowCustomPoste(false);
      setNewPoste((prev) => ({ ...prev, poste: value }));
    }
  }, []);

  const handleAddPoste = useCallback(() => {
    if (!newPoste.poste.trim() || !newPoste.montant) {
      return;
    }

    const montant = parseFloat(newPoste.montant);
    if (isNaN(montant) || montant <= 0) {
      return;
    }

    const accountData = resolveAccountData?.(newPoste.poste.trim());

    const nouveauPoste: BudgetPoste = {
      id: Date.now().toString(),
      poste: newPoste.poste.trim(),
      montant,
      ...(accountData || {}),
    };

    onPostesChange([...budgetPostes, nouveauPoste]);
    setNewPoste({ poste: '', montant: '' });
    setShowCustomPoste(false);
  }, [newPoste, budgetPostes, onPostesChange, resolveAccountData]);

  const handleRemovePoste = useCallback(
    (id: string) => {
      onPostesChange(budgetPostes.filter((p) => p.id !== id));
    },
    [budgetPostes, onPostesChange]
  );

  const handleEditPoste = useCallback((poste: BudgetPoste) => {
    setEditing({
      id: poste.id,
      data: { poste: poste.poste, montant: poste.montant.toString() },
      error: null,
    });
  }, []);

  const handleSavePoste = useCallback(() => {
    if (!editing.id) return;

    if (!editing.data.poste.trim()) {
      setEditing((prev) => ({ ...prev, error: 'Le libellé ne peut pas être vide' }));
      return;
    }

    const montant = parseFloat(editing.data.montant);
    if (isNaN(montant) || montant <= 0) {
      setEditing((prev) => ({ ...prev, error: 'Le montant doit être un nombre positif' }));
      return;
    }

    const updatedPostes = budgetPostes.map((p) =>
      p.id === editing.id ? { ...p, poste: editing.data.poste.trim(), montant } : p
    );
    onPostesChange(updatedPostes);

    setEditing({ id: null, data: { poste: '', montant: '' }, error: null });
  }, [editing, budgetPostes, onPostesChange]);

  const handleCancelEdit = useCallback(() => {
    setEditing({ id: null, data: { poste: '', montant: '' }, error: null });
  }, []);

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSavePoste();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEdit();
      }
    },
    [handleSavePoste, handleCancelEdit]
  );

  const handleImportBudgetPrecedent = useCallback(async (params: {
    source: BudgetImportSource;
    budgetId?: string | null;
  }) => {
    // Si on a une fonction d'import Supabase, l'utiliser
    if (importBudgetFn && exercice) {
      setIsImporting(true);
      setImportError(null);

      try {
        const postes = await importBudgetFn({
          exercice,
          source: params.source,
          budgetId: params.budgetId,
        });
        if (postes.length > 0) {
          onPostesChange(postes);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors de l\'import';
        setImportError(message);
        console.error('[useBudgetPostes] Import error:', err);
      } finally {
        setIsImporting(false);
      }
    }
  }, [onPostesChange, importBudgetFn, exercice]);

  const updateEditingData = useCallback((field: 'poste' | 'montant', value: string) => {
    setEditing((prev) => ({
      ...prev,
      data: { ...prev.data, [field]: value },
    }));
  }, []);

  return {
    newPoste,
    setNewPoste,
    showCustomPoste,
    editing,
    isImporting,
    importError,
    handlePosteSelect,
    handleAddPoste,
    handleRemovePoste,
    handleEditPoste,
    handleSavePoste,
    handleCancelEdit,
    handleEditKeyDown,
    handleImportBudgetPrecedent,
    updateEditingData,
  };
}
