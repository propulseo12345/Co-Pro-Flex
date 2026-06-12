'use client';

/**
 * Hook pour gérer les brouillons d'AG (status = 'draft')
 * Source de vérité : Supabase uniquement
 *
 * OPTIMISATION 2026-01-28: Utilise v_ag_drafts_progress pour éviter N+1 queries
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { getCurrentBusinessYear } from '@/lib/time/period';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

/**
 * Type pour les données retournées par v_ag_drafts_progress
 */
interface AgDraftProgress {
  ag_id: string;
  copro_id: string;
  title: string;
  meeting_type: 'ordinary' | 'extraordinary' | 'special';
  meeting_date: string | null;
  location: string | null;
  status: string;
  current_step: number;
  max_step_reached: number | null;
  step_data: Record<string, unknown> | null;
  wizard_mode: string | null;
  created_at: string;
  updated_at: string;
  resolutions_count: number;
  attendance_count: number;
  votes_count: number;
  has_resolutions: boolean;
  has_attendance: boolean;
  has_votes: boolean;
  completion_ratio: number;
  last_activity_at: string;
}

export interface AgDraft {
  id: string;
  title: string;
  meeting_type: 'ordinary' | 'extraordinary' | 'special';
  meeting_date: string | null;
  location: string | null;
  status: 'draft';
  created_at: string;
  updated_at: string;
  // Progression calculée
  hasResolutions: boolean;
  resolutionsCount: number;
  hasAttendance: boolean;
  attendanceCount: number;
  hasVotes: boolean;
  votesCount: number;
  // Étape suggérée (basée sur données)
  suggestedStep: number;
  // Étape courante (source DB - utilisée pour la navigation)
  currentStep: number;
  // Étape maximale atteinte (pour l'affichage de la progression)
  maxStepReached: number;
  // Ratio de complétion en pourcentage (0..100), basé sur l'étape du wizard
  completionRatio: number;
  // Dernière activité
  lastActivityAt: string;
}

interface UseAgDraftsReturn {
  drafts: AgDraft[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createDraft: (data: CreateDraftInput) => Promise<string | null>;
  deleteDraft: (agId: string) => Promise<boolean>;
  getLatestDraft: () => AgDraft | null;
}

export interface CreateDraftInput {
  title?: string;
  meeting_type?: 'ordinary' | 'extraordinary' | 'special';
  meeting_date?: string;
  location?: string;
}

/**
 * Génère une date par défaut pour un nouveau brouillon (dans 30 jours)
 */
function getDefaultMeetingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30); // 30 jours dans le futur par défaut
  return date.toISOString();
}

/**
 * Calcule l'étape suggérée basée sur les données existantes
 */
function calculateSuggestedStep(draft: {
  hasResolutions: boolean;
  hasAttendance: boolean;
  hasVotes: boolean;
  meeting_date: string | null;
  location: string | null;
}): number {
  // Étape 1: Infos générales (date, lieu)
  // Étape 2: Résolutions
  // Étape 3: Participants
  // Étape 4: Votes par correspondance
  // Étape 5: Convocation

  if (draft.hasVotes) return 5; // Prêt pour convocation
  if (draft.hasAttendance) return 4; // Peut gérer les votes
  if (draft.hasResolutions) return 3; // Peut gérer les participants
  if (draft.meeting_date && draft.location) return 2; // Peut ajouter résolutions
  return 1; // Doit remplir infos de base
}

/**
 * Convertit les données de la vue en AgDraft
 */
function mapProgressToDraft(row: AgDraftProgress): AgDraft {
  const currentStep = row.current_step || 1;
  const maxStepReached = row.max_step_reached || currentStep;

  return {
    id: row.ag_id,
    title: row.title,
    meeting_type: row.meeting_type,
    meeting_date: row.meeting_date,
    location: row.location,
    status: 'draft',
    created_at: row.created_at,
    updated_at: row.updated_at,
    hasResolutions: row.has_resolutions,
    resolutionsCount: row.resolutions_count,
    hasAttendance: row.has_attendance,
    attendanceCount: row.attendance_count,
    hasVotes: row.has_votes,
    votesCount: row.votes_count,
    suggestedStep: calculateSuggestedStep({
      hasResolutions: row.has_resolutions,
      hasAttendance: row.has_attendance,
      hasVotes: row.has_votes,
      meeting_date: row.meeting_date,
      location: row.location,
    }),
    // Source de vérité DB pour la navigation
    currentStep: currentStep,
    // Étape maximale atteinte pour l'affichage
    maxStepReached: Math.max(maxStepReached, currentStep),
    completionRatio: row.completion_ratio,
    lastActivityAt: row.last_activity_at,
  };
}

export function useAgDrafts(): UseAgDraftsReturn {
  const { currentCoproId } = useCopro();
  const [drafts, setDrafts] = useState<AgDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Charge tous les brouillons d'AG pour la copro actuelle
   * Essaie d'abord la vue optimisée, puis fallback sur ag_meetings directement
   */
  const loadDrafts = useCallback(async () => {
    if (!currentCoproId) {
      setDrafts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      // Essayer d'abord la vue agrégée optimisée
      let progressData: AgDraftProgress[] | null = null;
      let useViewFailed = false;

      try {
        const { data, error: viewError } = await supabase
          .from('v_ag_drafts_progress')
          .select('*')
          .eq('copro_id', currentCoproId)
          .order('last_activity_at', { ascending: false });

        if (viewError) {
          // View query failed, using fallback
          useViewFailed = true;
        } else {
          progressData = data as AgDraftProgress[];
        }
      } catch {
        // View not available, using fallback
        useViewFailed = true;
      }

      // Fallback: requête directe sur ag_meetings
      if (useViewFailed || !progressData) {
        const { data: meetings, error: meetingsError } = await supabase
          .from('ag_meetings')
          .select('*')
          .eq('copro_id', currentCoproId)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false });

        if (meetingsError) throw new Error(meetingsError.message);

        if (!meetings || meetings.length === 0) {
          setDrafts([]);
          setIsLoading(false);
          return;
        }

        // Mapper les meetings en format AgDraft (sans les stats avancées)
        const fallbackDrafts: AgDraft[] = meetings.map((m: {
          id: string;
          title: string;
          meeting_type: 'ordinary' | 'extraordinary' | 'special';
          meeting_date: string | null;
          location: string | null;
          current_step?: number;
          max_step_reached?: number;
          created_at: string;
          updated_at: string;
        }) => {
          const currentStep = m.current_step || 1;
          const maxStepReached = m.max_step_reached || currentStep;
          return {
            id: m.id,
            title: m.title,
            meeting_type: m.meeting_type,
            meeting_date: m.meeting_date,
            location: m.location,
            status: 'draft' as const,
            created_at: m.created_at,
            updated_at: m.updated_at,
            hasResolutions: false,
            resolutionsCount: 0,
            hasAttendance: false,
            attendanceCount: 0,
            hasVotes: false,
            votesCount: 0,
            suggestedStep: 1,
            currentStep: currentStep,
            maxStepReached: Math.max(maxStepReached, currentStep),
            completionRatio: 0,
            lastActivityAt: m.updated_at,
          };
        });

        setDrafts(fallbackDrafts);
        setIsLoading(false);
        return;
      }

      if (!progressData || progressData.length === 0) {
        setDrafts([]);
        setIsLoading(false);
        return;
      }

      // Mapper les données vers le format AgDraft
      const mappedDrafts = progressData.map(mapProgressToDraft);
      setDrafts(mappedDrafts);

    } catch (err) {
      console.error('[useAgDrafts] Error loading drafts:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des brouillons');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  /**
   * Crée un nouveau brouillon d'AG
   */
  const createDraft = useCallback(async (data: CreateDraftInput): Promise<string | null> => {
    if (!currentCoproId) {
      setError('Aucune copropriété sélectionnée');
      return null;
    }

    try {
      const supabase = createUntypedClient();
      const year = getCurrentBusinessYear();

      // meeting_date est NOT NULL dans la DB, on doit toujours fournir une valeur
      const newDraft = {
        copro_id: currentCoproId,
        title: data.title || `AG ${year}`,
        meeting_type: data.meeting_type || 'ordinary',
        meeting_date: data.meeting_date || getDefaultMeetingDate(),
        location: data.location || null,
        status: 'draft',
      };

      const { data: created, error: createError } = await supabase
        .from('ag_meetings')
        .insert(newDraft)
        .select()
        .single();

      if (createError) throw new Error(createError.message);

      // Rafraîchir la liste
      await loadDrafts();

      return created.id;
    } catch (err) {
      console.error('[useAgDrafts] Error creating draft:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du brouillon');
      return null;
    }
  }, [currentCoproId, loadDrafts]);

  /**
   * Supprime un brouillon d'AG via la RPC Supabase
   * La RPC gère atomiquement :
   * - Vérification que l'AG est bien un brouillon
   * - Suppression de toutes les données liées (votes, résolutions, présences, etc.)
   * - Archivage des documents associés
   */
  const deleteDraft = useCallback(async (agId: string): Promise<boolean> => {
    try {
      const supabase = createUntypedClient();

      // Appeler la RPC qui gère la suppression atomique
      const { data, error: rpcError } = await supabase.rpc('delete_ag_draft', {
        p_ag_id: agId,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      // La RPC retourne un objet JSON avec { success, error?, ... }
      if (!data?.success) {
        const errorMessage = data?.error || 'Erreur lors de la suppression du brouillon';
        throw new Error(errorMessage);
      }

      // Draft deleted successfully

      // Rafraîchir la liste
      await loadDrafts();

      return true;
    } catch (err) {
      console.error('[useAgDrafts] Error deleting draft:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du brouillon');
      return false;
    }
  }, [loadDrafts]);

  /**
   * Récupère le draft le plus récent (pour reprise automatique)
   */
  const getLatestDraft = useCallback((): AgDraft | null => {
    if (drafts.length === 0) return null;
    return drafts[0]; // Déjà trié par last_activity_at desc
  }, [drafts]);

  // Charger les drafts au montage et quand la copro change
  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  return {
    drafts,
    isLoading,
    error,
    refresh: loadDrafts,
    createDraft,
    deleteDraft,
    getLatestDraft,
  };
}

/**
 * Hook pour obtenir ou créer un draft automatiquement
 * Utilisé sur /ag/new pour la reprise automatique
 */
export function useAgDraftAutoResume() {
  const { drafts, isLoading, createDraft, getLatestDraft } = useAgDrafts();
  const [resolvedDraftId, setResolvedDraftId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    const resolve = async () => {
      setIsResolving(true);

      // Chercher un draft existant
      const latestDraft = getLatestDraft();

      if (latestDraft) {
        // Reprendre le draft existant
        setResolvedDraftId(latestDraft.id);
      } else {
        // Créer un nouveau draft
        const newId = await createDraft({});
        setResolvedDraftId(newId);
      }

      setIsResolving(false);
    };

    resolve();
  }, [isLoading, getLatestDraft, createDraft]);

  return {
    draftId: resolvedDraftId,
    isResolving: isLoading || isResolving,
    draft: drafts.find(d => d.id === resolvedDraftId) || null,
  };
}
