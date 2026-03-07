'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Coproprietaire, EditingVariable, Resolution } from '../types';
import { useGlobalVariables } from '@/hooks/useGlobalVariables';
import { validateResolutionVariables } from '@/components/features/ag/Session/utils';
import { saveDraft } from '@/lib/ag/draft-persistence';
import type { FinancingSchedule } from '@/components/features/ag/FinancingScheduleEditor/FinancingScheduleEditor';

export interface UseSessionVariablesReturn {
  variableValues: Record<string, string>;
  allVariables: Record<string, string>;
  prefillVariables: Record<string, string>;
  editingVariable: EditingVariable | null;
  showVariableModal: boolean;
  showFinancingModal: boolean;
  showFondsALURModal: boolean;
  financingSchedule: FinancingSchedule | null;
  showValidationWarning: boolean;
  missingVariables: string[];
  showPrefillDropdown: string | null;
  setVariableValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setEditingVariable: React.Dispatch<React.SetStateAction<EditingVariable | null>>;
  setShowVariableModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowPrefillDropdown: React.Dispatch<React.SetStateAction<string | null>>;
  handleVariableClick: (variableName: string, resolutionTexte?: string) => void;
  handleSaveVariable: () => void;
  handleSaveFinancing: (modalite: string, datesEcheances: string, schedule: FinancingSchedule) => void;
  closeFinancingModal: () => void;
  handleSaveFondsALUR: (pourcentage: string, montant: string) => void;
  closeFondsALURModal: () => void;
  handlePrefillFromCopro: (variableName: string, coproId: string) => void;
  closeVariableModal: () => void;
  closeValidationWarning: () => void;
  confirmContinueWithWarning: (onShowResult: () => void, setPending: () => void) => void;
  validateAndProceed: (
    currentResolution: Resolution | undefined,
    onShowResult: () => void,
    setPending: () => void
  ) => boolean;
}

interface UseSessionVariablesParams {
  agId: string;
  coproprietaires: Coproprietaire[];
}

export function useSessionVariables({
  agId,
  coproprietaires,
}: UseSessionVariablesParams): UseSessionVariablesReturn {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [editingVariable, setEditingVariable] = useState<EditingVariable | null>(null);
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [showFinancingModal, setShowFinancingModal] = useState(false);
  const [showFondsALURModal, setShowFondsALURModal] = useState(false);
  const [financingSchedule, setFinancingSchedule] = useState<FinancingSchedule | null>(null);
  const [showValidationWarning, setShowValidationWarning] = useState(false);
  const [missingVariables, setMissingVariables] = useState<string[]>([]);
  const [showPrefillDropdown, setShowPrefillDropdown] = useState<string | null>(null);

  const { prefillVariables, mergeVariables } = useGlobalVariables({
    agId,
    userVariables: variableValues
  });

  const allVariables = useMemo(
    () => mergeVariables(variableValues),
    [mergeVariables, variableValues]
  );

  // Persistance immédiate des variables
  const saveVariablesNow = useCallback((values: Record<string, string>) => {
    saveDraft(agId, 'variables', values);
  }, [agId]);

  const handleVariableClick = useCallback((variableName: string, resolutionTexte?: string) => {
    if (variableName === 'modalites_paiement_budget' || variableName === 'modalites_paiement_fonds') {
      setEditingVariable({ name: variableName, value: allVariables[variableName] || '' });
      setShowFinancingModal(true);
    } else if (variableName === 'pourcentage' && resolutionTexte?.includes('article 14-2')) {
      setEditingVariable({ name: variableName, value: allVariables[variableName] || '' });
      setShowFondsALURModal(true);
    } else {
      setEditingVariable({ name: variableName, value: allVariables[variableName] || '' });
      setShowVariableModal(true);
    }
  }, [allVariables]);

  const handleSaveVariable = useCallback(() => {
    if (editingVariable) {
      const newValues = { ...variableValues, [editingVariable.name]: editingVariable.value };
      setVariableValues(newValues);
      saveVariablesNow(newValues);
      setShowVariableModal(false);
      setEditingVariable(null);
    }
  }, [editingVariable, variableValues, saveVariablesNow]);

  const handlePrefillFromCopro = useCallback((variableName: string, coproId: string) => {
    const copro = coproprietaires.find(c => c.id === coproId);
    if (copro) {
      const newValues = { ...variableValues, [variableName]: copro.nom };
      setVariableValues(newValues);
      saveVariablesNow(newValues);
    }
    setShowPrefillDropdown(null);
  }, [variableValues, coproprietaires, saveVariablesNow]);

  const handleSaveFinancing = useCallback((modalite: string, datesEcheances: string, schedule: FinancingSchedule) => {
    const isFonds = editingVariable?.name === 'modalites_paiement_fonds';
    const modaliteKey = isFonds ? 'modalites_paiement_fonds' : 'modalites_paiement_budget';
    const datesKey = isFonds ? 'dates_echeances_fonds' : 'dates_echeances_budget';
    const newValues = {
      ...variableValues,
      [modaliteKey]: modalite,
      [datesKey]: datesEcheances,
    };
    setVariableValues(newValues);
    setFinancingSchedule(schedule);
    saveVariablesNow(newValues);
    setShowFinancingModal(false);
    setEditingVariable(null);
  }, [variableValues, saveVariablesNow, editingVariable]);

  const closeFinancingModal = useCallback(() => {
    setShowFinancingModal(false);
    setEditingVariable(null);
  }, []);

  const handleSaveFondsALUR = useCallback((pourcentage: string, montant: string) => {
    const newValues = {
      ...variableValues,
      pourcentage,
      montant,
      montant_fonds_travaux: montant, // clé dédiée pour éviter conflit avec montant budget
    };
    setVariableValues(newValues);
    saveVariablesNow(newValues);
    setShowFondsALURModal(false);
    setEditingVariable(null);
  }, [variableValues, saveVariablesNow]);

  const closeFondsALURModal = useCallback(() => {
    setShowFondsALURModal(false);
    setEditingVariable(null);
  }, []);

  const closeVariableModal = useCallback(() => {
    setShowVariableModal(false);
    setEditingVariable(null);
  }, []);

  const closeValidationWarning = useCallback(() => {
    setShowValidationWarning(false);
    setMissingVariables([]);
  }, []);

  const confirmContinueWithWarning = useCallback((onShowResult: () => void, setPending: () => void) => {
    setShowValidationWarning(false);
    setMissingVariables([]);
    setPending();
    onShowResult();
  }, []);

  const validateAndProceed = useCallback((
    currentResolution: Resolution | undefined,
    onShowResult: () => void,
    setPending: () => void
  ): boolean => {
    if (!currentResolution) return false;

    const missing = validateResolutionVariables(currentResolution, allVariables);
    if (missing.length > 0) {
      setMissingVariables(missing);
      setShowValidationWarning(true);
      return false;
    }

    setPending();
    onShowResult();
    return true;
  }, [allVariables]);

  return {
    variableValues,
    allVariables,
    prefillVariables,
    editingVariable,
    showVariableModal,
    showFinancingModal,
    showFondsALURModal,
    financingSchedule,
    showValidationWarning,
    missingVariables,
    showPrefillDropdown,
    setVariableValues,
    setEditingVariable,
    setShowVariableModal,
    setShowPrefillDropdown,
    handleVariableClick,
    handleSaveVariable,
    handleSaveFinancing,
    closeFinancingModal,
    handleSaveFondsALUR,
    closeFondsALURModal,
    handlePrefillFromCopro,
    closeVariableModal,
    closeValidationWarning,
    confirmContinueWithWarning,
    validateAndProceed,
  };
}
