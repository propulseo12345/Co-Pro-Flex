'use client';

import { useState, useCallback } from 'react';
import type { BudgetPoste, EditingPosteState } from '../domain/types';
import { BUDGET_PRECEDENT } from '../domain/constants';

interface UseBudgetPostesProps {
  budgetPostes: BudgetPoste[];
  onPostesChange: (postes: BudgetPoste[]) => void;
}

export function useBudgetPostes({ budgetPostes, onPostesChange }: UseBudgetPostesProps) {
  const [newPoste, setNewPoste] = useState({ poste: '', montant: '' });
  const [showCustomPoste, setShowCustomPoste] = useState(false);
  const [editing, setEditing] = useState<EditingPosteState>({
    id: null,
    data: { poste: '', montant: '' },
    error: null,
  });

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

    const nouveauPoste: BudgetPoste = {
      id: Date.now().toString(),
      poste: newPoste.poste.trim(),
      montant: montant,
    };

    onPostesChange([...budgetPostes, nouveauPoste]);
    setNewPoste({ poste: '', montant: '' });
    setShowCustomPoste(false);
  }, [newPoste, budgetPostes, onPostesChange]);

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

  const handleImportBudgetPrecedent = useCallback(() => {
    const postesAvecNouveauxIds = BUDGET_PRECEDENT.postes.map((p) => ({
      ...p,
      id: `${p.id}-${Date.now()}`,
    }));
    onPostesChange(postesAvecNouveauxIds);
  }, [onPostesChange]);

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
