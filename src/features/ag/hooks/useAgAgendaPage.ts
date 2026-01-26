'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { MajorityType, TypeAG, ResolutionTemplate } from '@/lib/constants/resolutions';
import { getResolutionById, generateEcheancesDates, getResolutionsObligatoires } from '@/lib/constants/resolutions';
import { ajouterResolutionsAGOrdinaire } from '@/lib/utils/ag-resolutions';
import { extractVariableNames, formatDateFR, formatMontant } from '@/lib/utils/resolution-variables';
import { MOCK_CONTRAT_SYNDIC, MOCK_PARAMETRES } from '@/data/mock';
import type { Resolution } from '@/components/features/ag';
import { useCopro } from '@/providers/CoproContext';
import { useAgDetail, useAddResolution, useDeleteResolution, useReorderResolutions, useEligibleVoters } from '@/hooks/modules/useAgData';
import type { AgResolutionResult, MajorityType as DbMajorityType } from '@/lib/ag/types';

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
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Check if AG exists in Supabase
  useEffect(() => {
    if (meeting && meeting.id === agId) {
      setUseSupabase(true);
    }
  }, [meeting, agId]);

  // Load AG form data from localStorage (for draft or as fallback)
  useEffect(() => {
    const savedAgData = localStorage.getItem(`ag-draft-${agId}`);
    if (savedAgData) {
      try { setAgFormData(JSON.parse(savedAgData) as AGFormData); } catch { /* ignore */ }
    } else if (meeting) {
      // Convert from Supabase meeting to AGFormData
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
    }

    const savedRoles = localStorage.getItem(`roles-ag-${agId}`);
    if (savedRoles) {
      try { setRoles(JSON.parse(savedRoles)); } catch { /* ignore */ }
    }
    const savedPresences = localStorage.getItem(`ag-presences-${agId}`);
    if (savedPresences) {
      try { setPresences(JSON.parse(savedPresences)); } catch { /* ignore */ }
    }
  }, [agId, meeting]);

  const getGlobalSuggestions = useCallback((variableNames: string[]): Record<string, string> => {
    const suggestions: Record<string, string> = {};
    const exercice = agFormData?.budgetExercice || (new Date().getFullYear() + 1).toString();

    for (const name of variableNames) {
      const lowerName = name.toLowerCase();
      if (lowerName === 'date' || lowerName === 'date_du_jour') {
        suggestions[name] = formatDateFR(new Date());
      } else if (lowerName === 'date_debut' || lowerName === 'exercice_debut') {
        suggestions[name] = `01/01/${exercice}`;
      } else if (lowerName === 'date_fin' || lowerName === 'exercice_fin' || lowerName === 'date_cloture') {
        suggestions[name] = `31/12/${exercice}`;
      } else if (lowerName === 'annee' || lowerName === 'exercice' || lowerName === 'annee_exercice') {
        suggestions[name] = exercice;
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
  }, [agFormData?.budgetExercice]);

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

    // Otherwise, use localStorage
    if (!useSupabase || (dbLoading === false && dbResolutions.length === 0)) {
      const loadResolutions = () => {
        try {
          const savedResolutions = localStorage.getItem(`ag-resolutions-${agId}`);
          if (savedResolutions) {
            const loaded = JSON.parse(savedResolutions);
            if (Array.isArray(loaded) && loaded.length > 0) {
              setResolutions(loaded);
              const wasJustCreated = sessionStorage.getItem(`ag-resolutions-created-${agId}`);
              if (wasJustCreated) {
                setSuccessMessageCount(loaded.length);
                setShowSuccessMessage(true);
                sessionStorage.removeItem(`ag-resolutions-created-${agId}`);
                setTimeout(() => setShowSuccessMessage(false), 5000);
              }
              setIsLoading(false);
              return;
            }
          }
          let agType = agFormData?.type;
          if (!agType) {
            const savedAgData = localStorage.getItem(`ag-draft-${agId}`);
            if (savedAgData) {
              try { agType = JSON.parse(savedAgData).type; } catch { /* ignore */ }
            }
          }
          if (agType === 'ORDINAIRE') {
            const generated = ajouterResolutionsAGOrdinaire(agId);
            if (generated && generated.length > 0) {
              setResolutions(generated);
              setSuccessMessageCount(generated.length);
              setShowSuccessMessage(true);
              sessionStorage.setItem(`ag-resolutions-created-${agId}`, 'true');
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

  // Save resolutions to localStorage (as backup / for draft AGs)
  useEffect(() => {
    if (resolutions.length > 0) localStorage.setItem(`ag-resolutions-${agId}`, JSON.stringify(resolutions));
  }, [resolutions, agId]);

  const handleAddFromBank = useCallback(async (template: ResolutionTemplate) => {
    const variableNames = extractVariableNames(template.texte);
    const globalSuggestions = getGlobalSuggestions(variableNames);
    const variables: Record<string, string> = {};
    for (const varName of variableNames) {
      variables[varName] = globalSuggestions[varName] || '';
    }

    // If using Supabase, add to database
    if (useSupabase && currentCoproId && isManager) {
      const result = await addResolutionMutation.execute({
        ag_id: agId,
        title: template.titre,
        description: template.texte,
        majority_type: toDbMajorityType(template.majorite),
        resolution_number: resolutions.length + 1,
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

  const handleContinue = useCallback(() => {
    if (resolutions.length === 0) { alert('Veuillez ajouter au moins une résolution'); return; }
    router.push(`/ag/${agId}/convocation`);
  }, [resolutions.length, router, agId]);

  const handleStartEditVariable = useCallback((resId: string, varName: string, currentValue: string, templateId?: string) => {
    setEditingVariable({ resId, varName, templateId });
    setTempVariableValue(currentValue || '');
  }, []);

  const handleSaveVariable = useCallback(() => {
    if (!editingVariable) return;
    setResolutions(prev => prev.map(r => {
      if (r.id === editingVariable.resId && r.variables) {
        const newVars = { ...r.variables, [editingVariable.varName]: tempVariableValue };
        if (editingVariable.varName === 'modalites_paiement_budget' && tempVariableValue) {
          const exercice = agFormData?.budgetExercice || (new Date().getFullYear() + 1).toString();
          newVars['dates_echeances_budget'] = generateEcheancesDates(tempVariableValue, exercice);
        }
        return { ...r, variables: newVars };
      }
      return r;
    }));
    setEditingVariable(null);
    setTempVariableValue('');
  }, [editingVariable, tempVariableValue, agFormData?.budgetExercice]);

  const handleCancelEdit = useCallback(() => {
    setEditingVariable(null);
    setTempVariableValue('');
  }, []);

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
  };
}
