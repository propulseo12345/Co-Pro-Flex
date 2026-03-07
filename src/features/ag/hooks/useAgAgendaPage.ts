'use client';

/**
 * Hook: useAgAgendaPage
 *
 * 100% DB-DRIVEN - Supabase est la SEULE source de vérité.
 * - Aucun localStorage
 * - Aucun état local pour données métier
 * - Persistance immédiate après chaque modification
 * - Re-fetch systématique après mutation
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { MajorityType, TypeAG, ResolutionTemplate } from '@/lib/constants/resolutions';
import { getResolutionById, generateEcheancesDates, getResolutionsObligatoires } from '@/lib/constants/resolutions';
import { extractVariableNames, formatDateFR, formatMontant } from '@/lib/utils/resolution-variables';
import type { Resolution, ResolutionEditData } from '@/components/features/ag';
import { useCopro } from '@/providers/CoproContext';
import {
  useAgDetail,
  useAddResolution,
  useDeleteResolution,
  useReorderResolutions,
  useEligibleVoters,
  useUpdateResolution,
  useUpdateAg,
} from '@/hooks/modules/useAgData';
import type { AgResolutionResult, MajorityType as DbMajorityType, AgMeeting } from '@/lib/ag/types';
import { createClient } from '@/lib/supabase/client';
import { getActiveAccountingPeriod, getClosedPeriodForYear, type AccountingPeriodInfo, type ClosedPeriodWithResult } from '@/lib/finance/accounting-period';

// ============================================================================
// TYPES
// ============================================================================

interface UseAgAgendaPageParams {
  agId: string;
}

interface SaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
}

// ============================================================================
// MAJORITY TYPE MAPPERS
// ============================================================================

function toDbMajorityType(type: MajorityType): DbMajorityType {
  const map: Partial<Record<MajorityType, DbMajorityType>> = {
    'ART_24': 'art24',
    'ART_25': 'art25',
    'ART_25_1': 'art25_1',
    'ART_26': 'art26',
    'ART_26_1': 'art26_1',
    'UNANIMITE': 'unanimity',
  };
  return map[type] || 'art24';
}

function fromDbMajorityType(type: DbMajorityType): MajorityType {
  const map: Record<DbMajorityType, MajorityType> = {
    'art24': 'ART_24',
    'art25': 'ART_25',
    'art25_1': 'ART_25_1',
    'art26': 'ART_26',
    'art26_1': 'ART_26_1',
    'unanimity': 'UNANIMITE',
  };
  return map[type] || 'ART_24';
}

// ============================================================================
// DB TO FRONTEND CONVERTERS
// ============================================================================

function dbToFrontendResolution(dbRes: AgResolutionResult): Resolution {
  const variables: Record<string, string> | undefined = dbRes.variables
    ? Object.fromEntries(
        Object.entries(dbRes.variables as Record<string, unknown>).map(([k, v]) => [k, String(v ?? '')])
      )
    : undefined;

  return {
    id: dbRes.id,
    titre: dbRes.title,
    texte: dbRes.description || '',
    majorite: fromDbMajorityType(dbRes.majority_type),
    variables,
    custom: dbRes.is_customized ?? false,
  };
}

function meetingToFormData(meeting: AgMeeting) {
  // Extraire l'année de l'exercice depuis la date de l'AG
  const agYear = meeting.meeting_date ? new Date(meeting.meeting_date).getFullYear() : new Date().getFullYear();
  const budgetExercice = (agYear).toString(); // L'exercice courant

  return {
    type: meeting.meeting_type === 'ordinary' ? 'ORDINAIRE' as const : 'EXTRAORDINAIRE' as const,
    date: meeting.meeting_date?.split('T')[0] || '',
    heure: meeting.meeting_date?.split('T')[1]?.substring(0, 5) || '',
    lieu: meeting.location || '',
    adresse: meeting.location || '',
    budgetExercice,
    presidentSeance: meeting.president_name ? { nom: meeting.president_name } : undefined,
    secretaireSeance: meeting.secretary_name ? { nom: meeting.secretary_name } : undefined,
    scrutateur: meeting.scrutineer1_name ? { nom: meeting.scrutineer1_name } : undefined,
  };
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

export function useAgAgendaPage({ agId }: UseAgAgendaPageParams) {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();

  // -------------------------------------------------------------------------
  // SUPABASE DATA HOOKS (source de vérité unique)
  // -------------------------------------------------------------------------
  const {
    meeting,
    resolutions: dbResolutions,
    isLoading: dbLoading,
    error: dbError,
    refresh: refreshAll,
    refreshResolutions,
  } = useAgDetail(agId);

  const { voters } = useEligibleVoters();
  const addResolutionMutation = useAddResolution();
  const deleteResolutionMutation = useDeleteResolution();
  const reorderResolutionsMutation = useReorderResolutions();
  const updateResolutionMutation = useUpdateResolution();
  const updateAgMutation = useUpdateAg();

  // -------------------------------------------------------------------------
  // UI STATES (non-métier)
  // -------------------------------------------------------------------------
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingVariable, setEditingVariable] = useState<{ resId: string; varName: string; templateId?: string } | null>(null);
  const [tempVariableValue, setTempVariableValue] = useState('');
  const [financingSchedule, setFinancingSchedule] = useState<import('@/components/features/ag/FinancingScheduleEditor').FinancingSchedule | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageCount, setSuccessMessageCount] = useState(0);
  const [prefillWarning, setPrefillWarning] = useState<{ total: number; added: number; skipped: number } | null>(null);
  const [editingResolution, setEditingResolution] = useState<Resolution | null>(null);
  const [accountingPeriod, setAccountingPeriod] = useState<AccountingPeriodInfo | null>(null);
  const [lastClosedPeriod, setLastClosedPeriod] = useState<ClosedPeriodWithResult | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // -------------------------------------------------------------------------
  // SAVE STATE (indicateurs de persistance)
  // -------------------------------------------------------------------------
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    error: null,
  });

  // -------------------------------------------------------------------------
  // DERIVED DATA (calculé depuis DB, pas d'état local)
  // -------------------------------------------------------------------------
  const resolutions = useMemo(() => {
    console.log('[useAgAgendaPage] dbResolutions count:', dbResolutions.length);
    return dbResolutions.map(dbToFrontendResolution);
  }, [dbResolutions]);

  // Debug: Log des valeurs importantes
  useEffect(() => {
    console.log('[useAgAgendaPage] État actuel:', {
      agId,
      currentCoproId,
      isManager,
      meetingExists: !!meeting,
      meetingType: meeting?.meeting_type,
      dbResolutionsCount: dbResolutions.length,
      dbLoading,
      dbError,
    });
  }, [agId, currentCoproId, isManager, meeting, dbResolutions.length, dbLoading, dbError]);

  // Titres des résolutions existantes (pour éviter les doublons dans la bibliothèque)
  const existingResolutionTitles = useMemo(() => {
    return dbResolutions.map(r => r.title.toLowerCase());
  }, [dbResolutions]);

  const agFormData = useMemo(() => {
    if (!meeting) return null;
    return meetingToFormData(meeting);
  }, [meeting]);

  // Calculer le montant total du budget depuis les résolutions
  const totalBudget = useMemo(() => {
    const budgetRes = dbResolutions.find(r => r.title?.toLowerCase().includes('budget prévisionnel'));
    if (!budgetRes) return 0;
    const vars = (budgetRes.variables as Record<string, string>) || {};
    const montantStr = vars.montant || '';
    return parseFloat(montantStr.replace(/\s/g, '').replace(',', '.')) || 0;
  }, [dbResolutions]);

  const roles = useMemo(() => {
    if (!meeting) return {};
    return {
      presidentSeance: meeting.president_name ? { nom: meeting.president_name } : undefined,
      secretaireSeance: meeting.secretary_name ? { nom: meeting.secretary_name } : undefined,
      scrutateur: meeting.scrutineer1_name ? { nom: meeting.scrutineer1_name } : undefined,
    };
  }, [meeting]);

  // -------------------------------------------------------------------------
  // ACCOUNTING PERIOD (pour pré-remplissage dates exercice)
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!currentCoproId) return;

    const fetchAccountingPeriod = async () => {
      const exerciceYear = new Date().getFullYear() + 1;
      const result = await getActiveAccountingPeriod(currentCoproId, exerciceYear);
      if (result.data) {
        setAccountingPeriod(result.data);
      }
    };

    fetchAccountingPeriod();
  }, [currentCoproId]);

  // Fetch la période clôturée N-1 (basé sur la date de l'AG)
  useEffect(() => {
    if (!currentCoproId || !meeting?.meeting_date) return;

    const agDate = new Date(meeting.meeting_date);
    const nMinus1Year = (Number.isNaN(agDate.getTime()) ? new Date().getFullYear() : agDate.getFullYear()) - 1;

    const fetchClosedPeriod = async () => {
      const result = await getClosedPeriodForYear(currentCoproId, nMinus1Year);
      if (result.data) {
        setLastClosedPeriod(result.data);
      }
    };

    fetchClosedPeriod();
  }, [currentCoproId, meeting?.meeting_date]);

  // -------------------------------------------------------------------------
  // SUGGESTIONS DE VARIABLES (basé sur données DB)
  // -------------------------------------------------------------------------
  const getGlobalSuggestions = useCallback((variableNames: string[]): Record<string, string> => {
    const suggestions: Record<string, string> = {};

    // Global suggestions = uniquement les variables génériques (date du jour)
    // Les dates d'exercice (date_debut, date_fin) dépendent du contexte
    // de chaque résolution → gérées dans getTemplateSuggestions
    for (const name of variableNames) {
      const lowerName = name.toLowerCase();
      if (lowerName === 'date' || lowerName === 'date_du_jour') {
        suggestions[name] = formatDateFR(new Date());
      }
    }
    return suggestions;
  }, []);

  // Helpers pour pré-remplir les dates d'exercice
  const agYear = useMemo(() => {
    const d = meeting?.meeting_date ? new Date(meeting.meeting_date) : new Date();
    return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }, [meeting?.meeting_date]);

  const nMinus1 = useMemo(() => {
    if (lastClosedPeriod) {
      return {
        startDate: new Date(lastClosedPeriod.start_date).toLocaleDateString('fr-FR'),
        endDate: new Date(lastClosedPeriod.end_date).toLocaleDateString('fr-FR'),
        year: String(lastClosedPeriod.year),
        // Total des charges de l'exercice (en partie double, résultat = 0 toujours)
        montant: formatMontant(lastClosedPeriod.totalDebit),
      };
    }
    // Fallback si pas de période clôturée en DB
    const y = agYear - 1;
    return {
      startDate: `01/01/${y}`,
      endDate: `31/12/${y}`,
      year: String(y),
      montant: '',
    };
  }, [lastClosedPeriod, agYear]);

  // Montant du budget prévisionnel configuré dans la préparation de l'AG
  const agBudgetMontant = useMemo(() => {
    if (!meeting?.opening_notes) return '';
    try {
      const meta = JSON.parse(meeting.opening_notes);
      return meta.budgetMontant || '';
    } catch {
      return '';
    }
  }, [meeting?.opening_notes]);

  const nPlus1 = useMemo(() => {
    if (accountingPeriod) {
      return {
        startDate: new Date(accountingPeriod.start_date).toLocaleDateString('fr-FR'),
        endDate: new Date(accountingPeriod.end_date).toLocaleDateString('fr-FR'),
        year: String(accountingPeriod.year),
        montant: agBudgetMontant ? formatMontant(Number(agBudgetMontant)) : '',
      };
    }
    const y = agYear + 1;
    return {
      startDate: `01/01/${y}`,
      endDate: `31/12/${y}`,
      year: String(y),
      montant: agBudgetMontant ? formatMontant(Number(agBudgetMontant)) : '',
    };
  }, [accountingPeriod, agYear, agBudgetMontant]);

  // Résolutions N-1 (exercice écoulé) : approbation comptes, quitus
  const RESOLUTIONS_N_MINUS_1 = useMemo(() => new Set([
    'fin-05',  // Approbation des comptes
    'ag-05',   // Quitus au syndic
    'fin-10',  // Situation de trésorerie et quitus
  ]), []);

  // Résolutions N+1 (prochain exercice) : budget prévisionnel
  const RESOLUTIONS_N_PLUS_1 = useMemo(() => new Set([
    'fin-06',  // Budget prévisionnel
  ]), []);

  const getTemplateSuggestions = useCallback((
    template: ResolutionTemplate,
    variableNames: string[]
  ): Record<string, string> => {
    const suggestions: Record<string, string> = {};

    if (RESOLUTIONS_N_MINUS_1.has(template.id)) {
      // Exercice écoulé (N-1) : données de la dernière période clôturée
      for (const name of variableNames) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'date_debut' || lowerName === 'exercice_debut') {
          suggestions[name] = nMinus1.startDate;
        } else if (lowerName === 'date_fin' || lowerName === 'exercice_fin' || lowerName === 'date_cloture') {
          suggestions[name] = nMinus1.endDate;
        } else if (lowerName === 'annee' || lowerName === 'annee_exercice' || lowerName === 'exercice') {
          suggestions[name] = nMinus1.year;
        } else if (lowerName === 'montant' || lowerName === 'resultat') {
          suggestions[name] = nMinus1.montant;
        }
      }
    } else if (RESOLUTIONS_N_PLUS_1.has(template.id)) {
      // Prochain exercice (N+1) : période ouverte ou calculée
      // Montant = budget prévisionnel configuré dans la préparation de l'AG
      for (const name of variableNames) {
        const lowerName = name.toLowerCase();
        if (lowerName === 'date_debut' || lowerName === 'exercice_debut') {
          suggestions[name] = nPlus1.startDate;
        } else if (lowerName === 'date_fin' || lowerName === 'exercice_fin' || lowerName === 'date_cloture') {
          suggestions[name] = nPlus1.endDate;
        } else if (lowerName === 'annee' || lowerName === 'annee_exercice' || lowerName === 'exercice') {
          suggestions[name] = nPlus1.year;
        } else if (lowerName === 'montant' || lowerName === 'budget' || lowerName === 'montant_budget') {
          suggestions[name] = nPlus1.montant;
        }
      }
    }

    return suggestions;
  }, [RESOLUTIONS_N_MINUS_1, RESOLUTIONS_N_PLUS_1, nMinus1, nPlus1]);

  // -------------------------------------------------------------------------
  // MUTATIONS: AJOUTER DEPUIS BIBLIOTHÈQUE
  // -------------------------------------------------------------------------
  const handleAddFromBank = useCallback(async (template: ResolutionTemplate) => {
    if (!currentCoproId || !isManager) {
      setSaveState(prev => ({ ...prev, error: 'Non autorisé' }));
      return;
    }

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      // Pré-remplir les variables
      const variableNames = extractVariableNames(template.texte);
      const globalSuggestions = getGlobalSuggestions(variableNames);
      const templateSuggestions = getTemplateSuggestions(template, variableNames);
      const variables: Record<string, string> = {};
      for (const varName of variableNames) {
        variables[varName] = templateSuggestions[varName] || globalSuggestions[varName] || '';
      }

      // Persister immédiatement en DB
      const result = await addResolutionMutation.execute({
        ag_id: agId,
        title: template.titre,
        description: template.texte,
        majority_type: toDbMajorityType(template.majorite),
        resolution_number: dbResolutions.length + 1,
        variables: variables,
        action_type: template.action_type,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'ajout');
      }

      // Re-fetch depuis DB pour synchroniser l'UI
      await refreshResolutions();

      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
      setShowBankModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [currentCoproId, isManager, agId, dbResolutions.length, addResolutionMutation, refreshResolutions, getGlobalSuggestions, getTemplateSuggestions]);

  // -------------------------------------------------------------------------
  // MUTATIONS: AJOUTER RÉSOLUTION PERSONNALISÉE
  // -------------------------------------------------------------------------
  const handleAddCustom = useCallback(async (titre: string, texte: string, majorite: MajorityType) => {
    if (!currentCoproId || !isManager) {
      setSaveState(prev => ({ ...prev, error: 'Non autorisé' }));
      return;
    }

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      const result = await addResolutionMutation.execute({
        ag_id: agId,
        title: titre,
        description: texte,
        majority_type: toDbMajorityType(majorite),
        resolution_number: dbResolutions.length + 1,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de l\'ajout');
      }

      await refreshResolutions();
      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
      setShowCustomModal(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [currentCoproId, isManager, agId, dbResolutions.length, addResolutionMutation, refreshResolutions]);

  // -------------------------------------------------------------------------
  // MUTATIONS: PRÉ-REMPLIR RÉSOLUTIONS OBLIGATOIRES
  // -------------------------------------------------------------------------
  const handlePrefillObligatoires = useCallback(async () => {
    console.log('[handlePrefillObligatoires] ========== DÉMARRAGE ==========');
    console.log('[handlePrefillObligatoires] État:', {
      currentCoproId,
      isManager,
      meetingExists: !!meeting,
      meetingId: meeting?.id,
      meetingType: meeting?.meeting_type,
      agId,
      dbResolutionsCount: dbResolutions.length,
    });

    // Vérification détaillée des conditions
    if (!currentCoproId) {
      const errorMsg = 'Erreur: Aucune copropriété sélectionnée (currentCoproId est null)';
      console.error('[handlePrefillObligatoires]', errorMsg);
      setSaveState({ isSaving: false, lastSaved: null, error: errorMsg });
      return;
    }

    if (!isManager) {
      const errorMsg = 'Erreur: Vous n\'êtes pas gestionnaire de cette copropriété';
      console.error('[handlePrefillObligatoires]', errorMsg);
      setSaveState({ isSaving: false, lastSaved: null, error: errorMsg });
      return;
    }

    if (!meeting) {
      const errorMsg = `Erreur: L'AG avec l'ID "${agId}" n'a pas été trouvée dans Supabase. Vérifiez que l'AG existe.`;
      console.error('[handlePrefillObligatoires]', errorMsg);
      setSaveState({ isSaving: false, lastSaved: null, error: errorMsg });
      return;
    }

    const typeAG: TypeAG = meeting.meeting_type === 'ordinary' ? 'ORDINAIRE' : 'EXTRAORDINAIRE';
    console.log('[handlePrefillObligatoires] Type AG détecté:', typeAG);

    const templatesObligatoires = getResolutionsObligatoires(typeAG);
    console.log('[handlePrefillObligatoires] Templates obligatoires trouvés:', templatesObligatoires.length);
    console.log('[handlePrefillObligatoires] Templates:', templatesObligatoires.map(t => t.titre));

    if (templatesObligatoires.length === 0) {
      const errorMsg = `Aucun template obligatoire trouvé pour le type d'AG "${typeAG}"`;
      console.warn('[handlePrefillObligatoires]', errorMsg);
      setSaveState({ isSaving: false, lastSaved: null, error: errorMsg });
      return;
    }

    // Identifier les templates déjà présents via le titre (car pas de templateId en DB)
    const existingTitles = new Set(dbResolutions.map(r => r.title.toLowerCase()));
    console.log('[handlePrefillObligatoires] Résolutions existantes:', Array.from(existingTitles));

    const templatesToAdd = templatesObligatoires.filter(t => !existingTitles.has(t.titre.toLowerCase()));
    console.log('[handlePrefillObligatoires] Templates à ajouter:', templatesToAdd.length);

    if (templatesToAdd.length === 0) {
      console.log('[handlePrefillObligatoires] Toutes les résolutions obligatoires sont déjà présentes');
      setPrefillWarning({ total: templatesObligatoires.length, added: 0, skipped: templatesObligatoires.length });
      setTimeout(() => setPrefillWarning(null), 5000);
      return;
    }

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      // Trier par ordre suggéré
      const sortedTemplates = [...templatesToAdd].sort((a, b) => (a.ordre_suggere || 999) - (b.ordre_suggere || 999));
      let addedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < sortedTemplates.length; i++) {
        const template = sortedTemplates[i];
        console.log('[handlePrefillObligatoires] Ajout résolution', i + 1, '/', sortedTemplates.length, ':', template.titre);

        // Pré-remplir les variables
        const variableNames = extractVariableNames(template.texte);
        const globalSuggestions = getGlobalSuggestions(variableNames);
        const templateSuggestions = getTemplateSuggestions(template, variableNames);
        const variables: Record<string, string> = {};
        for (const varName of variableNames) {
          variables[varName] = templateSuggestions[varName] || globalSuggestions[varName] || '';
        }

        // Persister en DB via edge function
        console.log('[handlePrefillObligatoires] Appel addResolutionMutation.execute pour:', template.titre);
        const result = await addResolutionMutation.execute({
          ag_id: agId,
          title: template.titre,
          description: template.texte,
          majority_type: toDbMajorityType(template.majorite),
          resolution_number: dbResolutions.length + i + 1,
          variables: variables,
          action_type: template.action_type,
        });

        console.log('[handlePrefillObligatoires] Résultat:', JSON.stringify(result));

        if (result.success) {
          addedCount++;
          console.log('[handlePrefillObligatoires] ✓ Résolution ajoutée avec succès:', template.titre);
        } else {
          const errorDetail = result.error || 'Erreur inconnue';
          errors.push(`${template.titre}: ${errorDetail}`);
          console.error('[handlePrefillObligatoires] ✗ Erreur ajout:', template.titre, errorDetail);
        }
      }

      console.log('[handlePrefillObligatoires] ========== RÉSUMÉ ==========');
      console.log('[handlePrefillObligatoires] Total ajoutées:', addedCount, '/', sortedTemplates.length);

      if (errors.length > 0) {
        console.error('[handlePrefillObligatoires] Erreurs:', errors);
      }

      // Re-fetch pour synchroniser
      console.log('[handlePrefillObligatoires] Refresh des résolutions...');
      await refreshResolutions();
      console.log('[handlePrefillObligatoires] Refresh terminé, nouvelles résolutions:', dbResolutions.length);

      const skippedCount = templatesObligatoires.length - templatesToAdd.length;

      if (addedCount === 0 && errors.length > 0) {
        // Toutes les ajouts ont échoué
        setSaveState({ isSaving: false, lastSaved: null, error: `Échec de l'ajout: ${errors[0]}` });
      } else if (addedCount > 0) {
        // Au moins une résolution ajoutée
        if (skippedCount > 0 || errors.length > 0) {
          setPrefillWarning({ total: templatesObligatoires.length, added: addedCount, skipped: skippedCount + errors.length });
        } else {
          setSuccessMessageCount(addedCount);
          setShowSuccessMessage(true);
        }
        setTimeout(() => { setPrefillWarning(null); setShowSuccessMessage(false); }, 5000);
        setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('[handlePrefillObligatoires] Exception:', err);
      setSaveState({ isSaving: false, lastSaved: null, error: `Exception: ${message}` });
    }
  }, [currentCoproId, isManager, meeting, dbResolutions, agId, addResolutionMutation, refreshResolutions, getGlobalSuggestions, getTemplateSuggestions]);

  // -------------------------------------------------------------------------
  // MUTATIONS: RÉORDONNER
  // -------------------------------------------------------------------------
  const handleReorder = useCallback(async (newResolutions: Resolution[]) => {
    if (!isManager) return;

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      const resolutionIds = newResolutions.map(r => r.id);
      await reorderResolutionsMutation.execute(agId, resolutionIds);

      // Re-fetch pour garantir la synchronisation
      await refreshResolutions();

      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du réordonnancement';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
      // Re-fetch pour revenir à l'état DB
      await refreshResolutions();
    }
  }, [isManager, agId, reorderResolutionsMutation, refreshResolutions]);

  // -------------------------------------------------------------------------
  // MUTATIONS: SUPPRIMER
  // -------------------------------------------------------------------------
  const handleDelete = useCallback(async (id: string) => {
    if (!isManager) return;

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      await deleteResolutionMutation.execute(id);
      await refreshResolutions();
      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [isManager, deleteResolutionMutation, refreshResolutions]);

  // -------------------------------------------------------------------------
  // MUTATIONS: SAUVEGARDER VARIABLE
  // -------------------------------------------------------------------------
  const handleStartEditVariable = useCallback((resId: string, varName: string, currentValue: string, templateId?: string) => {
    setEditingVariable({ resId, varName, templateId });
    setTempVariableValue(currentValue || '');
  }, []);

  const handleSaveVariable = useCallback(async () => {
    if (!editingVariable || !isManager) return;

    const targetDbResolution = dbResolutions.find(r => r.id === editingVariable.resId);
    if (!targetDbResolution) return;

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      // Calculer les nouvelles variables
      const existingVariables = (targetDbResolution.variables as Record<string, unknown>) || {};
      const newVars = { ...existingVariables, [editingVariable.varName]: tempVariableValue };

      // Gérer les modalités de paiement budget
      if (editingVariable.varName === 'modalites_paiement_budget' && tempVariableValue) {
        const exercice = (new Date().getFullYear() + 1).toString();
        newVars['dates_echeances_budget'] = generateEcheancesDates(tempVariableValue, exercice);
      }

      // Persister immédiatement en DB
      await updateResolutionMutation.execute(editingVariable.resId, {
        variables: newVars,
      });

      // Re-fetch pour synchroniser
      await refreshResolutions();

      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
      setEditingVariable(null);
      setTempVariableValue('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [editingVariable, tempVariableValue, isManager, dbResolutions, updateResolutionMutation, refreshResolutions]);

  const handleQuickSetVariable = useCallback(async (resId: string, varName: string, value: string) => {
    if (!isManager) return;

    const targetDbResolution = dbResolutions.find(r => r.id === resId);
    if (!targetDbResolution) return;

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      const existingVariables = (targetDbResolution.variables as Record<string, unknown>) || {};
      const newVars = { ...existingVariables, [varName]: value };

      await updateResolutionMutation.execute(resId, {
        variables: newVars,
      });

      await refreshResolutions();
      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [isManager, dbResolutions, updateResolutionMutation, refreshResolutions]);

  const handleCancelEdit = useCallback(() => {
    setEditingVariable(null);
    setTempVariableValue('');
  }, []);

  // -------------------------------------------------------------------------
  // MUTATIONS: ÉDITER RÉSOLUTION
  // -------------------------------------------------------------------------
  const handleEditResolution = useCallback((resolution: Resolution) => {
    setEditingResolution(resolution);
    setSaveState(prev => ({ ...prev, error: null }));
  }, []);

  const handleCancelEditResolution = useCallback(() => {
    setEditingResolution(null);
    setSaveState(prev => ({ ...prev, error: null }));
  }, []);

  const handleUpdateResolution = useCallback(async (data: ResolutionEditData) => {
    if (!editingResolution || !isManager) return;

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      // Récupérer les variables existantes
      const existingDbRes = dbResolutions.find(r => r.id === data.id);
      const existingVariables = existingDbRes?.variables || {};

      // Persister en DB
      await updateResolutionMutation.execute(data.id, {
        title: data.titre,
        description: data.texte,
        majority_type: toDbMajorityType(data.majorite),
        is_customized: true,
        variables: existingVariables as Record<string, unknown>,
      });

      // Re-fetch pour synchroniser
      await refreshResolutions();

      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
      setEditingResolution(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [editingResolution, isManager, dbResolutions, updateResolutionMutation, refreshResolutions]);

  // -------------------------------------------------------------------------
  // MUTATIONS: SAUVEGARDER RÔLES AG
  // -------------------------------------------------------------------------
  const handleSaveRoles = useCallback(async (newRoles: {
    presidentSeance?: { nom: string };
    secretaireSeance?: { nom: string };
    scrutateur?: { nom: string };
  }) => {
    if (!isManager) return;

    setSaveState({ isSaving: true, lastSaved: null, error: null });

    try {
      await updateAgMutation.execute(agId, {
        president_name: newRoles.presidentSeance?.nom,
        secretary_name: newRoles.secretaireSeance?.nom,
        scrutineer1_name: newRoles.scrutateur?.nom,
      });

      await refreshAll();
      setSaveState({ isSaving: false, lastSaved: new Date(), error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde des rôles';
      setSaveState({ isSaving: false, lastSaved: null, error: message });
    }
  }, [isManager, agId, updateAgMutation, refreshAll]);

  // -------------------------------------------------------------------------
  // NAVIGATION
  // -------------------------------------------------------------------------
  const handleContinue = useCallback(async () => {
    if (resolutions.length === 0) {
      alert('Veuillez ajouter au moins une résolution');
      return;
    }

    // Mettre à jour current_step vers étape 3 (convocation)
    try {
      const supabase = createClient();
      await supabase.from('ag_meetings').update({
        current_step: 3,
        updated_at: new Date().toISOString(),
      }).eq('id', agId);
    } catch (err) {
      console.warn('[useAgAgendaPage] Failed to update current_step:', err);
    }

    router.push(`/ag/${agId}/convocation`);
  }, [resolutions.length, router, agId]);

  const goBack = useCallback(() => router.back(), [router]);

  // -------------------------------------------------------------------------
  // COPROPRIÉTAIRES POUR ÉDITEUR
  // -------------------------------------------------------------------------
  const coproprietairesForEditor = useMemo(() => {
    if (voters.length === 0) return [];
    return voters.map(v => {
      const parts = v.name.split(' ');
      return {
        id: v.coproprietaire_id,
        nom: parts.slice(1).join(' ') || parts[0] || '',
        prenom: parts[0] || '',
      };
    });
  }, [voters]);

  // -------------------------------------------------------------------------
  // RETURN
  // -------------------------------------------------------------------------
  return {
    // Data (DB-driven)
    resolutions,
    existingResolutionTitles,
    agFormData,
    roles,
    meeting,
    accountingPeriod,

    // Loading / Error states
    isLoading: dbLoading,
    dbError,
    saveState,

    // UI states
    showBankModal,
    setShowBankModal,
    showCustomModal,
    setShowCustomModal,
    editingVariable,
    tempVariableValue,
    setTempVariableValue,
    financingSchedule,
    onFinancingScheduleChange: setFinancingSchedule,
    totalBudget,
    showSuccessMessage,
    successMessageCount,
    prefillWarning,
    editingResolution,
    isUpdatingResolution: saveState.isSaving,
    updateResolutionError: saveState.error,
    editorContainerRef,
    coproprietairesForEditor,

    // Mutation handlers
    handleAddFromBank,
    handleAddCustom,
    handlePrefillObligatoires,
    handleReorder,
    handleDelete,
    handleStartEditVariable,
    handleSaveVariable,
    handleQuickSetVariable,
    handleCancelEdit,
    handleEditResolution,
    handleUpdateResolution,
    handleCancelEditResolution,
    handleSaveRoles,

    // Navigation
    handleContinue,
    goBack,

    // Utilities
    getResolutionById,
    isManager,

    // Refresh from DB
    refreshResolutions,
    refreshAll,

    // Legacy compatibility (deprecated - will be removed)
    useSupabase: true,
    presences: {} as Record<string, 'PRESENT' | 'REPRESENTE' | 'ABSENT' | 'VOTE_CORRESPONDANCE'>,
  };
}
