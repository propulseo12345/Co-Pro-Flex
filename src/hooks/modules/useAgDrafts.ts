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
  meeting_type: 'ordinary' | 'extraordinary' | 'mixed';
  meeting_date: string | null;
  location: string | null;
  status: string;
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
  meeting_type: 'ordinary' | 'extraordinary' | 'mixed';
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
  // Étape suggérée
  suggestedStep: number;
  // Nouveau: ratio de complétion (0..1)
  completionRatio: number;
  // Nouveau: dernière activité
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
  meeting_type?: 'ordinary' | 'extraordinary' | 'mixed';
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
   * OPTIMISÉ: utilise v_ag_drafts_progress (1 seule requête)
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

      // Une seule requête via la vue agrégée
      const { data: progressData, error: queryError } = await supabase
        .from('v_ag_drafts_progress')
        .select('*')
        .eq('copro_id', currentCoproId)
        .eq('status', 'draft')
        .order('last_activity_at', { ascending: false });

      if (queryError) throw new Error(queryError.message);

      if (!progressData || progressData.length === 0) {
        setDrafts([]);
        setIsLoading(false);
        return;
      }

      // Mapper les données vers le format AgDraft
      const mappedDrafts = (progressData as AgDraftProgress[]).map(mapProgressToDraft);
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
   * Supprime un brouillon d'AG
   */
  const deleteDraft = useCallback(async (agId: string): Promise<boolean> => {
    try {
      const supabase = createUntypedClient();

      // Supprimer les votes liés (via résolutions)
      const { data: resolutions } = await supabase
        .from('ag_resolutions')
        .select('id')
        .eq('ag_id', agId);

      if (resolutions && resolutions.length > 0) {
        const resolutionIds = resolutions.map((r: { id: string }) => r.id);
        await supabase
          .from('ag_votes')
          .delete()
          .in('resolution_id', resolutionIds);
      }

      // Supprimer les résolutions
      await supabase
        .from('ag_resolutions')
        .delete()
        .eq('ag_id', agId);

      // Supprimer les présences
      await supabase
        .from('ag_attendance')
        .delete()
        .eq('ag_id', agId);

      // Supprimer l'AG elle-même
      const { error: deleteError } = await supabase
        .from('ag_meetings')
        .delete()
        .eq('id', agId)
        .eq('status', 'draft'); // Sécurité: ne supprimer que les drafts

      if (deleteError) throw new Error(deleteError.message);

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
