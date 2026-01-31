'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { MajorityType, TypeAG, ResolutionTemplate } from '@/lib/constants/resolutions';
import { getResolutionById, generateEcheancesDates, getResolutionsObligatoires } from '@/lib/constants/resolutions';
import { genererResolutionsAGOrdinaire } from '@/lib/utils/ag-resolutions';
import { extractVariableNames, formatDateFR, formatMontant } from '@/lib/utils/resolution-variables';
import { MOCK_CONTRAT_SYNDIC, MOCK_PARAMETRES } from '@/data/mock';
import type { Resolution } from '@/components/features/ag';
import { useCopro } from '@/providers/CoproContext';
import { useAgDetail, useAddResolution, useDeleteResolution, useReorderResolutions, useEligibleVoters, useUpdateResolution } from '@/hooks/modules/useAgData';
import type { AgResolutionResult, MajorityType as DbMajorityType } from '@/lib/ag/types';
import type { ResolutionEditData } from '@/components/features/ag';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';
import { createClient } from '@/lib/supabase/client';
import { getActiveAccountingPeriod, type AccountingPeriodInfo } from '@/lib/finance/accounting-period';

interface AGFormData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE';
  date: string;
  heure: string;
  lieu: string;
  adresse: string;
  budget: boolean;
  budgetMontant: string;
  budgetExercice: string;
  budgetPostes: { id: string; poste: string; montant: number }[];
}

interface RolesAG {
  presidentSeance?: { nom: string; coproprietaireId?: string };
  secretaireSeance?: { nom: string; coproprietaireId?: string };
  scrutateur?: { nom: string; coproprietaireId?: string };
}

interface UseAgAgendaPageParams {
  agId: string;
}

// Map frontend majority type to backend
function toDbMajorityType(type: MajorityType): DbMajorityType {
  const map: Partial<Record<MajorityType, DbMajorityType>> = {
    'ART_24': 'art24',
    'ART_25': 'art25',
    'ART_25_1': 'art25_1',
    'ART_26': 'art26',
    'ART_26_1': 'art26_1',
    'UNANIMITE': 'unanimity',
    // INFORMATION is not a voting majority, defaults to art24
  };
  return map[type] || 'art24';
}

// Map backend majority type to frontend
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

// Convert DB resolution to frontend Resolution format
function dbToFrontendResolution(dbRes: AgResolutionResult): Resolution {
  return {
    id: dbRes.id,
    titre: dbRes.title,
    texte: dbRes.description || '',
    majorite: fromDbMajorityType(dbRes.majority_type),
    custom: true, // DB resolutions are treated as custom (no template)
  };
}

export function useAgAgendaPage({ agId }: UseAgAgendaPageParams) {
  const router = useRouter();
  const { currentCoproId, isManager } = useCopro();

  // Supabase data hooks
  const { meeting, resolutions: dbResolutions, isLoading: dbLoading, refreshResolutions } = useAgDetail(agId);
  const { voters } = useEligibleVoters();
  const addResolutionMutation = useAddResolution();
  const deleteResolutionMutation = useDeleteResolution();
  const reorderResolutionsMutation = useReorderResolutions();
  const updateResolutionMutation = useUpdateResolution();

  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [agFormData, setAgFormData] = useState<AGFormData | null>(null);
  const [roles, setRoles] = useState<RolesAG>({});
  const [editingVariable, setEditingVariable] = useState<{ resId: string; varName: string; templateId?: string } | null>(null);
  const [tempVariableValue, setTempVariableValue] = useState('');
  const [presences, setPresences] = useState<Record<string, 'PRESENT' | 'REPRESENTE' | 'ABSENT' | 'VOTE_CORRESPONDANCE'>>({});
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessageCount, setSuccessMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [prefillWarning, setPrefillWarning] = useState<{ total: number; added: number; skipped: number } | null>(null);
  const [useSupabase, setUseSupabase] = useState(false);
  const [editingResolution, setEditingResolution] = useState<Resolution | null>(null);
  const [isUpdatingResolution, setIsUpdatingResolution] = useState(false);
  const [updateResolutionError, setUpdateResolutionError] = useState<string | null>(null);
  const [accountingPeriod, setAccountingPeriod] = useState<AccountingPeriodInfo | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Check if AG exists in Supabase (UUID = Supabase AG)
  const isSupabaseAg = useMemo(() => {
    return isValidUUID(agId) && meeting && meeting.id === agId;
  }, [agId, meeting]);

  useEffect(() => {
    if (isSupabaseAg) {
      setUseSupabase(true);
      // Note: Plus de marqueur localStorage - Supabase est source de vérité
    }
  }, [isSupabaseAg, agId]);

  // Fetch active accounting period for exercise date pre-filling
  useEffect(() => {
    if (!currentCoproId) return;

    const fetchAccountingPeriod = async () => {
      const exerciceYear = parseInt(agFormData?.budgetExercice || '') || new Date().getFullYear() + 1;
      const result = await getActiveAccountingPeriod(currentCoproId, exerciceYear);

      if (result.data) {
        setAccountingPeriod(result.data);
        console.log('[useAgAgendaPage] Accounting period loaded:', result.data);
      } else if (result.error) {
        console.warn('[useAgAgendaPage] Failed to load accounting period:', result.error);
      }
    };

    fetchAccountingPeriod();
  }, [currentCoproId, agFormData?.budgetExercice]);

  // Load AG form data - prioritize Supabase meeting data over localStorage
  useEffect(() => {
    // If we have a Supabase meeting, use it as source of truth
    if (meeting && meeting.id === agId) {
      setAgFormData({
        type: meeting.meeting_type === 'ordinary' ? 'ORDINAIRE' : 'EXTRAORDINAIRE',
        date: meeting.meeting_date?.split('T')[0] || '',
        heure: meeting.meeting_date?.split('T')[1]?.substring(0, 5) || '',
        lieu: meeting.location || '',
        adresse: meeting.location || '',
        budget: false,
        budgetMontant: '',
        budgetExercice: (new Date().getFullYear() + 1).toString(),
        budgetPostes: [],
      });
    } else {
      // Fallback to loadDraft (localStorage) for non-Supabase AGs
      const loadFallback = async () => {
        const { data: savedAgData } = await loadDraft<AGFormData>(agId, 'session', `ag-draft-${agId}`);
        if (savedAgData) {
          setAgFormData(savedAgData);
        }
      };
      loadFallback();
    }

    // Load roles from Supabase draft or localStorage
    const loadRolesAndPresences = async () => {
      if (isValidUUID(agId)) {
        // Try Supabase first
        const rolesResult = await loadDraft<RolesAG>(agId, 'roles', `roles-ag-${agId}`);
        if (rolesResult.data) {
          setRoles(rolesResult.data);
        }

        const presencesResult = await loadDraft<Record<string, 'PRESENT' | 'REPRESENTE' | 'ABSENT' | 'VOTE_CORRESPONDANCE'>>(
          agId, 'attendance', `ag-presences-${agId}`
        );
        if (presencesResult.data) {
          setPresences(presencesResult.data);
        }
      } else {
        // Non-UUID AG, use loadDraft (localStorage fallback)
        const { data: savedRoles } = await loadDraft<RolesAG>(agId, 'roles', `roles-ag-${agId}`);
        if (savedRoles) {
          setRoles(savedRoles);
        }
        const { data: savedPresences } = await loadDraft<Record<string, 'PRESENT' | 'REPRESENTE' | 'ABSENT' | 'VOTE_CORRESPONDANCE'>>(
          agId, 'attendance', `ag-presences-${agId}`
        );
        if (savedPresences) {
          setPresences(savedPresences);
        }
      }
    };

    loadRolesAndPresences();
  }, [agId, meeting]);

  const getGlobalSuggestions = useCallback((variableNames: string[]): Record<string, string> => {
    const suggestions: Record<string, string> = {};
    const exercice = agFormData?.budgetExercice || (new Date().getFullYear() + 1).toString();

    // Use accounting period dates if available, otherwise fallback to calendar year
    const periodStartDate = accountingPeriod?.start_date
      ? new Date(accountingPeriod.start_date).toLocaleDateString('fr-FR')
      : `01/01/${exercice}`;
    const periodEndDate = accountingPeriod?.end_date
      ? new Date(accountingPeriod.end_date).toLocaleDateString('fr-FR')
      : `31/12/${exercice}`;
    const periodYear = accountingPeriod?.year?.toString() || exercice;
    const periodLabel = accountingPeriod?.label || `Exercice ${exercice}`;

    for (const name of variableNames) {
      const lowerName = name.toLowerCase();
      if (lowerName === 'date' || lowerName === 'date_du_jour') {
        suggestions[name] = formatDateFR(new Date());
      } else if (lowerName === 'date_debut' || lowerName === 'exercice_debut') {
        // Use real accounting period start date from Supabase
        suggestions[name] = periodStartDate;
      } else if (lowerName === 'date_fin' || lowerName === 'exercice_fin' || lowerName === 'date_cloture') {
        // Use real accounting period end date from Supabase
        suggestions[name] = periodEndDate;
      } else if (lowerName === 'annee' || lowerName === 'exercice' || lowerName === 'annee_exercice') {
        suggestions[name] = periodYear;
      } else if (lowerName === 'exercice_label' || lowerName === 'libelle_exercice') {
        // New: formatted label from accounting period
        suggestions[name] = periodLabel;
      } else if (lowerName === 'nom_syndic' || lowerName === 'syndic') {
        suggestions[name] = MOCK_CONTRAT_SYNDIC.cabinetNom || MOCK_CONTRAT_SYNDIC.nomSyndic || '';
      } else if (lowerName === 'adresse_syndic') {
        suggestions[name] = MOCK_CONTRAT_SYNDIC.adresse || '';
      } else if (lowerName === 'telephone_syndic' || lowerName === 'tel_syndic') {
        suggestions[name] = MOCK_CONTRAT_SYNDIC.telephone || '';
      } else if (lowerName === 'email_syndic') {
        suggestions[name] = MOCK_CONTRAT_SYNDIC.email || '';
      } else if (lowerName === 'nom_copropriete' || lowerName === 'copropriete') {
        suggestions[name] = MOCK_PARAMETRES.informationsCopro?.nom || 'Résidence Les Jardins';
      } else if (lowerName === 'adresse_copropriete' || lowerName === 'adresse') {
        suggestions[name] = MOCK_PARAMETRES.informationsCopro?.adresse || '';
      } else if (lowerName === 'solde' || lowerName === 'solde_compte') {
        suggestions[name] = formatMontant(45230.00);
      }
    }
    return suggestions;
  }, [agFormData?.budgetExercice, accountingPeriod]);

  const prefillResolutionVariables = useCallback((resolution: Resolution): Resolution => {
    if (!resolution.variables) return resolution;
    const updatedVariables = { ...resolution.variables };

    if (roles.presidentSeance && resolution.templateId === 'ag-01') updatedVariables['nom'] = roles.presidentSeance.nom;
    if (roles.secretaireSeance && resolution.templateId === 'ag-02') updatedVariables['nom'] = roles.secretaireSeance.nom;
    if (roles.scrutateur && resolution.templateId === 'ag-03') updatedVariables['nom'] = roles.scrutateur.nom;

    if (agFormData?.budget && agFormData.budgetMontant) {
      if (resolution.templateId === 'fin-06') {
        const exercice = agFormData.budgetExercice || (new Date().getFullYear() + 1).toString();
        updatedVariables['date_debut'] = `01/01/${exercice}`;
        updatedVariables['date_fin'] = `31/12/${exercice}`;
        updatedVariables['montant'] = parseFloat(agFormData.budgetMontant).toLocaleString('fr-FR');
      }
      if (resolution.templateId === 'ag-06') {
        const budgetAmount = parseFloat(agFormData.budgetMontant) || 0;
        updatedVariables['montant'] = Math.round(budgetAmount * 0.05).toLocaleString('fr-FR');
        updatedVariables['pourcentage'] = '5';
      }
    }

    const variableNames = extractVariableNames(resolution.texte);
    const globalSuggestions = getGlobalSuggestions(variableNames);
    for (const [varName, value] of Object.entries(globalSuggestions)) {
      if (!updatedVariables[varName]) updatedVariables[varName] = value;
    }

    return { ...resolution, variables: updatedVariables };
  }, [roles, agFormData, getGlobalSuggestions]);

  // Load resolutions - from Supabase if available, otherwise localStorage
  useEffect(() => {
    if (!agId) { setIsLoading(false); return; }

    // If we have Supabase data, use it
    if (useSupabase && !dbLoading && dbResolutions.length > 0) {
      const frontendResolutions = dbResolutions.map(dbToFrontendResolution);
      setResolutions(frontendResolutions);
      setIsLoading(false);
      return;
    }

    // Otherwise, use loadDraft (localStorage fallback)
    if (!useSupabase || (dbLoading === false && dbResolutions.length === 0)) {
      const loadResolutions = async () => {
        try {
          const { data: savedResolutions } = await loadDraft<Resolution[]>(agId, 'resolutions', `ag-resolutions-${agId}`);
          if (savedResolutions && Array.isArray(savedResolutions) && savedResolutions.length > 0) {
            setResolutions(savedResolutions);
            const { data: wasJustCreated } = await loadDraft<{ resolutionsCreated: boolean }>(agId, 'milestones', `ag-resolutions-created-${agId}`);
            if (wasJustCreated?.resolutionsCreated) {
              setSuccessMessageCount(savedResolutions.length);
              setShowSuccessMessage(true);
              // Clear the milestone
              await saveDraft(agId, 'milestones', { resolutionsCreated: false }, `ag-resolutions-created-${agId}`);
              setTimeout(() => setShowSuccessMessage(false), 5000);
            }
            setIsLoading(false);
            return;
          }
          let agType = agFormData?.type;
          if (!agType) {
            const { data: savedAgData } = await loadDraft<AGFormData>(agId, 'session', `ag-draft-${agId}`);
            if (savedAgData) {
              agType = savedAgData.type;
            }
          }
          if (agType === 'ORDINAIRE') {
            const generated = genererResolutionsAGOrdinaire();
            if (generated && generated.length > 0) {
              // Sauvegarder dans Supabase (pas localStorage)
              await saveDraft(agId, 'resolutions', generated, `ag-resolutions-${agId}`);
              setResolutions(generated);
              setSuccessMessageCount(generated.length);
              setShowSuccessMessage(true);
              await saveDraft(agId, 'milestones', { resolutionsCreated: true }, `ag-resolutions-created-${agId}`);
              setTimeout(() => setShowSuccessMessage(false), 5000);
            }
          }
        } catch { /* ignore */ } finally { setIsLoading(false); }
      };
      loadResolutions();
    }
  }, [agId, agFormData?.type, useSupabase, dbLoading, dbResolutions]);

  useEffect(() => {
    if (resolutions.length > 0 && (Object.keys(roles).length > 0 || agFormData?.budget)) {
      const updated = resolutions.map(prefillResolutionVariables);
      if (JSON.stringify(updated) !== JSON.stringify(resolutions)) setResolutions(updated);
    }
  }, [roles, agFormData, prefillResolutionVariables, resolutions]);

  // Save resolutions via saveDraft as backup (for non-Supabase AGs only)
  // Note: For Supabase AGs, resolutions are saved via addResolutionMutation - pas de localStorage
  useEffect(() => {
    if (resolutions.length > 0 && !useSupabase) {
      saveDraft(agId, 'resolutions', resolutions, `ag-resolutions-${agId}`);
    }
    // Note: Le compte de résolutions est obtenu depuis v_ag_drafts_progress - plus de localStorage
  }, [resolutions, agId, useSupabase]);

  const handleAddFromBank = useCallback(async (template: ResolutionTemplate) => {
    const variableNames = extractVariableNames(template.texte);
    const globalSuggestions = getGlobalSuggestions(variableNames);
    const variables: Record<string, string> = {};
    for (const varName of variableNames) {
      variables[varName] = globalSuggestions[varName] || '';
    }

    // If using Supabase, add to database with variables
    if (useSupabase && currentCoproId && isManager) {
      const result = await addResolutionMutation.execute({
        ag_id: agId,
        title: template.titre,
        description: template.texte,
        majority_type: toDbMajorityType(template.majorite),
        resolution_number: resolutions.length + 1,
        variables: variables, // Pass pre-filled variables to Supabase
      });

      if (result.success) {
        await refreshResolutions();
      } else {
        // Fallback to local
        const newResolution: Resolution = {
          id: 'res-' + Date.now(),
          templateId: template.id,
          titre: template.titre,
          texte: template.texte,
          majorite: template.majorite,
          variables,
          custom: false,
          categorie: template.categorie
        };
        setResolutions(prev => [...prev, newResolution]);
      }
    } else {
      // Local mode
      const newResolution: Resolution = {
        id: 'res-' + Date.now(),
        templateId: template.id,
        titre: template.titre,
        texte: template.texte,
        majorite: template.majorite,
        variables,
        custom: false,
        categorie: template.categorie
      };
      setResolutions(prev => [...prev, newResolution]);
    }

    setShowBankModal(false);
  }, [getGlobalSuggestions, useSupabase, currentCoproId, isManager, addResolutionMutation, agId, resolutions.length, refreshResolutions]);

  const handleAddCustom = useCallback(async (titre: string, texte: string, majorite: MajorityType) => {
    // If using Supabase, add to database
    if (useSupabase && currentCoproId && isManager) {
      const result = await addResolutionMutation.execute({
        ag_id: agId,
        title: titre,
        description: texte,
        majority_type: toDbMajorityType(majorite),
        resolution_number: resolutions.length + 1,
      });

      if (result.success) {
        await refreshResolutions();
      } else {
        // Fallback to local
        const newResolution: Resolution = { id: 'res-' + Date.now(), titre, texte, majorite, custom: true };
        setResolutions(prev => [...prev, newResolution]);
      }
    } else {
      // Local mode
      const newResolution: Resolution = { id: 'res-' + Date.now(), titre, texte, majorite, custom: true };
      setResolutions(prev => [...prev, newResolution]);
    }

    setShowCustomModal(false);
  }, [useSupabase, currentCoproId, isManager, addResolutionMutation, agId, resolutions.length, refreshResolutions]);

  const handlePrefillObligatoires = useCallback(() => {
    const typeAG: TypeAG = (agFormData?.type || 'ORDINAIRE') as TypeAG;
    const templatesObligatoires = getResolutionsObligatoires(typeAG);
    const existingTemplateIds = new Set(resolutions.map(r => r.templateId).filter(Boolean));
    const templatesToAdd = templatesObligatoires.filter(t => !existingTemplateIds.has(t.id));

    if (templatesToAdd.length === 0) {
      setPrefillWarning({ total: templatesObligatoires.length, added: 0, skipped: templatesObligatoires.length });
      setTimeout(() => setPrefillWarning(null), 5000);
      return;
    }

    const baseTimestamp = Date.now();
    const newResolutions: Resolution[] = templatesToAdd.map((template, index) => {
      const variableNames = extractVariableNames(template.texte);
      const globalSuggestions = getGlobalSuggestions(variableNames);
      const variables: Record<string, string> = {};
      for (const varName of variableNames) {
        variables[varName] = globalSuggestions[varName] || '';
      }
      return {
        id: `res-${baseTimestamp}-${index}-${template.id}`,
        templateId: template.id,
        titre: template.titre,
        texte: template.texte,
        majorite: template.majorite,
        variables,
        custom: false,
        categorie: template.categorie
      };
    });

    const sortedNewResolutions = newResolutions.sort((a, b) => {
      const templateA = templatesObligatoires.find(t => t.id === a.templateId);
      const templateB = templatesObligatoires.find(t => t.id === b.templateId);
      return (templateA?.ordre_suggere || 999) - (templateB?.ordre_suggere || 999);
    });

    setResolutions(prev => [...sortedNewResolutions, ...prev]);

    const skippedCount = templatesObligatoires.length - templatesToAdd.length;
    if (skippedCount > 0) {
      setPrefillWarning({ total: templatesObligatoires.length, added: templatesToAdd.length, skipped: skippedCount });
    } else {
      setSuccessMessageCount(templatesToAdd.length);
      setShowSuccessMessage(true);
    }
    setTimeout(() => { setPrefillWarning(null); setShowSuccessMessage(false); }, 5000);
  }, [agFormData?.type, resolutions, getGlobalSuggestions]);

  const handleReorder = useCallback(async (newResolutions: Resolution[]) => {
    setResolutions(newResolutions);

    // If using Supabase, reorder in database
    if (useSupabase && isManager) {
      const resolutionIds = newResolutions.map(r => r.id);
      await reorderResolutionsMutation.execute(agId, resolutionIds);
    }
  }, [useSupabase, isManager, reorderResolutionsMutation, agId]);

  const handleDelete = useCallback(async (id: string) => {
    setResolutions(prev => prev.filter(r => r.id !== id));

    // If using Supabase, delete from database
    if (useSupabase && isManager) {
      await deleteResolutionMutation.execute(id);
    }
  }, [useSupabase, isManager, deleteResolutionMutation]);

  const handleContinue = useCallback(async () => {
    if (resolutions.length === 0) { alert('Veuillez ajouter au moins une résolution'); return; }

    // Mettre à jour current_step vers étape 3 (convocation) si AG Supabase
    if (isValidUUID(agId)) {
      try {
        const supabase = createClient();
        await (supabase as ReturnType<typeof createClient>).from('ag_meetings').update({
          current_step: 3,
          updated_at: new Date().toISOString(),
        }).eq('id', agId);
      } catch (err) {
        console.warn('[useAgAgendaPage] Failed to update current_step:', err);
      }
    }

    router.push(`/ag/${agId}/convocation`);
  }, [resolutions.length, router, agId]);

  const handleStartEditVariable = useCallback((resId: string, varName: string, currentValue: string, templateId?: string) => {
    setEditingVariable({ resId, varName, templateId });
    setTempVariableValue(currentValue || '');
  }, []);

  const handleSaveVariable = useCallback(async () => {
    if (!editingVariable) return;

    // Calculate new variables
    const targetResolution = resolutions.find(r => r.id === editingVariable.resId);
    if (!targetResolution) return;

    const newVars = { ...(targetResolution.variables || {}), [editingVariable.varName]: tempVariableValue };
    if (editingVariable.varName === 'modalites_paiement_budget' && tempVariableValue) {
      const exercice = agFormData?.budgetExercice || (new Date().getFullYear() + 1).toString();
      newVars['dates_echeances_budget'] = generateEcheancesDates(tempVariableValue, exercice);
    }

    // Update local state immediately
    setResolutions(prev => prev.map(r => {
      if (r.id === editingVariable.resId) {
        return { ...r, variables: newVars };
      }
      return r;
    }));

    // Persist to Supabase if using Supabase mode
    if (useSupabase && currentCoproId && isManager) {
      try {
        const result = await updateResolutionMutation.execute(editingVariable.resId, {
          variables: newVars,
        });
        if (!result.success) {
          console.error('[useAgAgendaPage] Failed to persist variable:', result.error);
        } else {
          console.log('[useAgAgendaPage] Variable saved to Supabase:', editingVariable.varName);
        }
      } catch (err) {
        console.error('[useAgAgendaPage] Error persisting variable:', err);
      }
    }

    setEditingVariable(null);
    setTempVariableValue('');
  }, [editingVariable, tempVariableValue, agFormData?.budgetExercice, resolutions, useSupabase, currentCoproId, isManager, updateResolutionMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditingVariable(null);
    setTempVariableValue('');
  }, []);

  // Inline resolution editing handlers
  const handleEditResolution = useCallback((resolution: Resolution) => {
    setEditingResolution(resolution);
    setUpdateResolutionError(null);
  }, []);

  const handleCancelEditResolution = useCallback(() => {
    setEditingResolution(null);
    setUpdateResolutionError(null);
  }, []);

  const handleUpdateResolution = useCallback(async (data: ResolutionEditData) => {
    if (!editingResolution) return;

    setIsUpdatingResolution(true);
    setUpdateResolutionError(null);

    try {
      // Update in Supabase if applicable
      if (useSupabase && currentCoproId && isManager) {
        // Get existing variables from the resolution being edited
        const existingVariables = editingResolution.variables || {};

        const result = await updateResolutionMutation.execute(data.id, {
          title: data.titre,
          description: data.texte,
          majority_type: toDbMajorityType(data.majorite),
          is_customized: true,
          variables: existingVariables,
        });

        if (!result.success) {
          console.error('[useAgAgendaPage] Update resolution error:', result.error);
          setUpdateResolutionError(result.error || 'Erreur lors de la mise à jour');
          return;
        }

        // Refresh from database
        await refreshResolutions();
      }

      // Update local state
      setResolutions(prev => prev.map(r => {
        if (r.id === data.id) {
          return {
            ...r,
            titre: data.titre,
            texte: data.texte,
            majorite: data.majorite,
            custom: true, // Mark as customized
          };
        }
        return r;
      }));

      setEditingResolution(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      console.error('[useAgAgendaPage] Update resolution error:', err);
      setUpdateResolutionError(message);
    } finally {
      setIsUpdatingResolution(false);
    }
  }, [editingResolution, useSupabase, currentCoproId, isManager, refreshResolutions, updateResolutionMutation]);

  const goBack = useCallback(() => router.back(), [router]);

  // Use voters from Supabase if available, otherwise mock
  const coproprietairesForEditor = useMemo(() => {
    if (voters.length > 0) {
      return voters.map(v => {
        const parts = v.name.split(' ');
        return { id: v.coproprietaire_id, nom: parts.slice(1).join(' ') || parts[0] || '', prenom: parts[0] || '' };
      });
    }
    // Fallback to mock - but voters should come from Supabase
    return [];
  }, [voters]);

  return {
    resolutions,
    showBankModal,
    setShowBankModal,
    showCustomModal,
    setShowCustomModal,
    agFormData,
    editingVariable,
    tempVariableValue,
    setTempVariableValue,
    presences,
    showSuccessMessage,
    successMessageCount,
    isLoading: isLoading || dbLoading,
    prefillWarning,
    editorContainerRef,
    coproprietairesForEditor,
    handleAddFromBank,
    handleAddCustom,
    handlePrefillObligatoires,
    handleReorder,
    handleDelete,
    handleContinue,
    handleStartEditVariable,
    handleSaveVariable,
    handleCancelEdit,
    goBack,
    getResolutionById,
    // New properties for Supabase integration
    useSupabase,
    isManager,
    meeting,
    // Inline resolution editing
    editingResolution,
    isUpdatingResolution,
    updateResolutionError,
    handleEditResolution,
    handleUpdateResolution,
    handleCancelEditResolution,
    // Accounting period for exercise dates
    accountingPeriod,
  };
}
