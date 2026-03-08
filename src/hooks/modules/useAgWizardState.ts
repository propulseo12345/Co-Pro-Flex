'use client';

/**
 * Hook central pour la gestion de l'état du wizard AG
 *
 * ARCHITECTURE PRODUCTION:
 * - Source unique de vérité : Supabase
 * - AUCUN localStorage pour les données métier
 * - Persistance automatique de l'étape courante
 * - Chargement de l'état complet à l'ouverture
 *
 * Usage:
 *   const wizard = useAgWizardState(agId);
 *   wizard.currentStep  // Étape actuelle (1-8)
 *   wizard.goToStep(3)  // Naviguer vers étape 3
 *   wizard.completeStep(2)  // Marquer étape 2 comme complétée
 *   wizard.stepData  // Données de progression par étape
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// Types
export type WizardMode = 'guided' | 'expert';

export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface StepInfo {
  status: StepStatus;
  completed_at?: string;
  skipped_at?: string;
}

export interface StepData {
  [stepNumber: string]: StepInfo;
}

export interface AgWizardStats {
  resolutions_count: number;
  attendance_count: number;
  votes_count: number;
}

export interface AgMilestone {
  milestone_type: string;
  completed_at: string;
}

export interface AgSessionDrafts {
  attendance?: unknown;
  votes?: unknown;
  roles?: unknown;
  resolutions?: unknown;
  session?: unknown;
}

export interface AgWizardState {
  ag_id: string;
  copro_id: string;
  title: string;
  meeting_type: 'ordinary' | 'extraordinary' | 'special';
  meeting_date: string | null;
  location: string | null;
  status: string;
  current_step: number;
  step_data: StepData;
  wizard_mode: WizardMode;
  opening_notes: string | null;
  created_at: string;
  updated_at: string;
  stats: AgWizardStats;
  milestones: AgMilestone[];
  session_drafts: AgSessionDrafts;
}

interface UseAgWizardStateReturn {
  // État
  isLoading: boolean;
  error: string | null;
  state: AgWizardState | null;

  // Propriétés dérivées
  currentStep: number;
  stepData: StepData;
  wizardMode: WizardMode;
  stats: AgWizardStats | null;
  milestones: AgMilestone[];

  // Helpers
  isStepCompleted: (step: number) => boolean;
  isStepAccessible: (step: number) => boolean;
  getStepStatus: (step: number) => StepStatus;

  // Actions
  goToStep: (step: number) => Promise<void>;
  completeStep: (step: number, nextStep?: number) => Promise<void>;
  skipStep: (step: number) => Promise<void>;
  setWizardMode: (mode: WizardMode) => Promise<void>;
  refresh: () => Promise<void>;

  // Navigation
  navigateToStep: (step: number) => void;
  navigateToCurrentStep: () => void;
}

// Mapping étape -> path (9 étapes)
const STEP_PATHS: Record<number, string> = {
  1: 'edit',
  2: 'agenda',
  3: 'convocation',
  4: 'envoi',
  5: 'votes-correspondance',
  6: 'feuille-presence',
  7: 'session',
  8: 'pv',
  9: 'finalisation',
};

// Prérequis par étape (quelles étapes doivent être complétées avant)
const STEP_PREREQUISITES: Record<number, number[]> = {
  1: [],
  2: [], // Peut commencer même sans étape 1 complétée (infos de base)
  3: [2], // Nécessite résolutions
  4: [3], // Nécessite convocation préparée
  5: [4], // Nécessite envoi fait
  6: [4], // Nécessite envoi fait (peut skip votes par correspondance)
  7: [6], // Nécessite feuille de présence validée
  8: [7], // Nécessite session terminée
  9: [8], // Nécessite PV généré
};

export function useAgWizardState(agId: string | null): UseAgWizardStateReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AgWizardState | null>(null);

  /**
   * Charge l'état complet du wizard depuis Supabase
   */
  const loadState = useCallback(async () => {
    if (!agId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      const { data, error: rpcError } = await supabase
        .rpc('get_ag_wizard_state', { p_ag_id: agId });

      if (rpcError) throw new Error(rpcError.message);

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to load wizard state');
      }

      setState(data as AgWizardState);
    } catch (err) {
      console.error('[useAgWizardState] Error loading state:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');

      // Fallback: essayer de charger directement depuis ag_meetings
      try {
        const supabase = createUntypedClient();
        const { data: meeting, error: meetingError } = await supabase
          .from('ag_meetings')
          .select('*')
          .eq('id', agId)
          .single();

        if (!meetingError && meeting) {
          setState({
            ag_id: meeting.id,
            copro_id: meeting.copro_id,
            title: meeting.title,
            meeting_type: meeting.meeting_type,
            meeting_date: meeting.meeting_date,
            location: meeting.location,
            status: meeting.status,
            current_step: meeting.current_step || 1,
            step_data: meeting.step_data || {},
            wizard_mode: meeting.wizard_mode || 'guided',
            opening_notes: meeting.opening_notes,
            created_at: meeting.created_at,
            updated_at: meeting.updated_at,
            stats: { resolutions_count: 0, attendance_count: 0, votes_count: 0 },
            milestones: [],
            session_drafts: {},
          });
          setError(null);
        }
      } catch {
        // Ignore fallback error
      }
    } finally {
      setIsLoading(false);
    }
  }, [agId]);

  /**
   * Charge l'état au montage et quand agId change
   */
  useEffect(() => {
    loadState();
  }, [loadState]);

  /**
   * Sauvegarde l'état du wizard
   */
  const saveState = useCallback(async (
    currentStep?: number,
    stepData?: StepData,
    wizardMode?: WizardMode
  ) => {
    if (!agId) return;

    try {
      const supabase = createUntypedClient();

      const { data, error: rpcError } = await supabase.rpc('save_ag_wizard_state', {
        p_ag_id: agId,
        p_current_step: currentStep ?? null,
        p_step_data: stepData ? stepData : null,
        p_wizard_mode: wizardMode ?? null,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data?.success) throw new Error(data?.error || 'Save failed');

      // Mettre à jour l'état local
      if (state) {
        setState(prev => prev ? {
          ...prev,
          current_step: currentStep ?? prev.current_step,
          step_data: stepData ? { ...prev.step_data, ...stepData } : prev.step_data,
          wizard_mode: wizardMode ?? prev.wizard_mode,
          updated_at: data.updated_at,
        } : null);
      }
    } catch (err) {
      console.error('[useAgWizardState] Error saving state:', err);
      throw err;
    }
  }, [agId, state]);

  /**
   * Navigue vers une étape
   */
  const goToStep = useCallback(async (step: number) => {
    if (!agId || step < 1 || step > 9) return;

    await saveState(step);
  }, [agId, saveState]);

  /**
   * Marque une étape comme complétée
   */
  const completeStep = useCallback(async (step: number, nextStep?: number) => {
    if (!agId) return;

    try {
      const supabase = createUntypedClient();

      const { data, error: rpcError } = await supabase.rpc('complete_ag_wizard_step', {
        p_ag_id: agId,
        p_step: step,
        p_next_step: nextStep ?? null,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!data?.success) throw new Error(data?.error || 'Complete step failed');

      // Mettre à jour l'état local
      setState(prev => {
        if (!prev) return null;
        const newStepData = {
          ...prev.step_data,
          [step.toString()]: {
            status: 'completed' as StepStatus,
            completed_at: new Date().toISOString(),
          },
        };
        return {
          ...prev,
          step_data: newStepData,
          current_step: data.current_step,
        };
      });
    } catch (err) {
      console.error('[useAgWizardState] Error completing step:', err);
      throw err;
    }
  }, [agId]);

  /**
   * Saute une étape (pour les étapes optionnelles)
   */
  const skipStep = useCallback(async (step: number) => {
    if (!agId) return;

    const newStepData: StepData = {
      [step.toString()]: {
        status: 'skipped',
        skipped_at: new Date().toISOString(),
      },
    };

    await saveState(step + 1, newStepData);
  }, [agId, saveState]);

  /**
   * Change le mode du wizard
   */
  const setWizardMode = useCallback(async (mode: WizardMode) => {
    await saveState(undefined, undefined, mode);
  }, [saveState]);

  /**
   * Vérifie si une étape est complétée
   */
  const isStepCompleted = useCallback((step: number): boolean => {
    if (!state?.step_data) return false;
    const stepInfo = state.step_data[step.toString()];
    return stepInfo?.status === 'completed';
  }, [state?.step_data]);

  /**
   * Vérifie si une étape est accessible
   */
  const isStepAccessible = useCallback((step: number): boolean => {
    if (!state) return step === 1;

    // Étape 1 toujours accessible
    if (step === 1) return true;

    // Vérifier les prérequis
    const prerequisites = STEP_PREREQUISITES[step] || [];

    // Pour étape 2: accessible si l'AG existe
    if (step === 2) return true;

    // Pour les autres: vérifier les données existantes
    if (step === 3) return state.stats.resolutions_count > 0;
    if (step === 4) return state.stats.resolutions_count > 0;
    if (step === 5) return state.stats.resolutions_count > 0;
    if (step === 6) return state.stats.resolutions_count > 0;
    if (step === 7) return state.stats.resolutions_count > 0;
    if (step === 8) return state.stats.resolutions_count > 0 && isStepCompleted(7);
    if (step === 9) return ['pv_generated', 'pv_signed', 'pv_sent', 'finalized'].includes(state.status);

    return prerequisites.every(prereq => isStepCompleted(prereq));
  }, [state, isStepCompleted]);

  /**
   * Retourne le statut d'une étape
   */
  const getStepStatus = useCallback((step: number): StepStatus => {
    if (!state?.step_data) return 'pending';
    const stepInfo = state.step_data[step.toString()];
    return stepInfo?.status || 'pending';
  }, [state?.step_data]);

  /**
   * Navigation vers le path d'une étape
   */
  const navigateToStep = useCallback((step: number) => {
    if (!agId) return;
    const path = STEP_PATHS[step];
    if (path) {
      router.push(`/ag/${agId}/${path}`);
    }
  }, [agId, router]);

  /**
   * Navigation vers l'étape courante
   */
  const navigateToCurrentStep = useCallback(() => {
    if (!state) return;
    navigateToStep(state.current_step);
  }, [state, navigateToStep]);

  // Propriétés dérivées mémoïsées
  const currentStep = useMemo(() => state?.current_step || 1, [state?.current_step]);
  const stepData = useMemo(() => state?.step_data || {}, [state?.step_data]);
  const wizardMode = useMemo(() => state?.wizard_mode || 'guided', [state?.wizard_mode]);
  const stats = useMemo(() => state?.stats || null, [state?.stats]);
  const milestones = useMemo(() => state?.milestones || [], [state?.milestones]);

  return {
    // État
    isLoading,
    error,
    state,

    // Propriétés dérivées
    currentStep,
    stepData,
    wizardMode,
    stats,
    milestones,

    // Helpers
    isStepCompleted,
    isStepAccessible,
    getStepStatus,

    // Actions
    goToStep,
    completeStep,
    skipStep,
    setWizardMode,
    refresh: loadState,

    // Navigation
    navigateToStep,
    navigateToCurrentStep,
  };
}

/**
 * Hook pour charger et sauvegarder les données d'une étape spécifique
 */
export function useAgStepData<T>(
  agId: string | null,
  draftType: 'session' | 'attendance' | 'votes' | 'roles' | 'resolutions'
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les données
  const load = useCallback(async () => {
    if (!agId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      const { data: result, error: rpcError } = await supabase.rpc('get_ag_session_draft', {
        p_ag_id: agId,
        p_draft_type: draftType,
      });

      if (rpcError) throw new Error(rpcError.message);

      if (result?.success && result?.draft_data) {
        setData(result.draft_data as T);
      } else {
        setData(null);
      }
    } catch (err) {
      console.error(`[useAgStepData:${draftType}] Error loading:`, err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [agId, draftType]);

  // Sauvegarder les données
  const save = useCallback(async (newData: T): Promise<boolean> => {
    if (!agId) return false;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      const { data: result, error: rpcError } = await supabase.rpc('save_ag_session_draft', {
        p_ag_id: agId,
        p_draft_type: draftType,
        p_draft_data: newData,
      });

      if (rpcError) throw new Error(rpcError.message);
      if (!result?.success) throw new Error(result?.error || 'Save failed');

      setData(newData);
      return true;
    } catch (err) {
      console.error(`[useAgStepData:${draftType}] Error saving:`, err);
      setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [agId, draftType]);

  // Charger au montage
  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    isLoading,
    isSaving,
    error,
    save,
    refresh: load,
  };
}
