'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import {
  IDossier,
  DossierCategorie,
  DossierStatut,
  DossierPriorite,
  DossierFormData
} from '@/types/models/dossier';

// Row type for dossiers table (not in generated types yet)
interface DossierRow {
  id: string;
  titre: string;
  description: string | null;
  categorie: string;
  statut: string;
  priorite: string;
  deadline: string | null;
  copro_id: string;
  created_at: string;
  updated_at: string;
}

// Constante pour cleanup legacy localStorage (one-shot en dev)
const LEGACY_STORAGE_KEY = 'coproflex-dossiers';

export interface DossiersFilters {
  categorie: DossierCategorie | 'TOUS';
  statut: DossierStatut | 'TOUS';
  search: string;
}

export interface UseDossiersOptions {
  coproprieteId?: string;
}

/**
 * Hook de gestion des dossiers (tâches métier)
 * VERSION SUPABASE - Utilise la table dossiers
 *
 * Note: Si la table dossiers n'existe pas encore, le hook retourne un empty state.
 * Les données de démonstration ne sont plus stockées en localStorage.
 */
export function useDossiers(options: UseDossiersOptions = {}) {
  const { currentCoproId } = useCopro();
  const coproprieteId = options.coproprieteId || currentCoproId || '';

  // États
  const [dossiers, setDossiers] = useState<IDossier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DossiersFilters>({
    categorie: 'TOUS',
    statut: 'TOUS',
    search: ''
  });

  // Cleanup legacy localStorage au montage (one-shot)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacyData) {
        // Legacy localStorage cleanup
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  }, []);

  // Chargement depuis Supabase
  useEffect(() => {
    const loadDossiers = async () => {
      if (!coproprieteId) {
        setDossiers([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Essayer de charger depuis la table dossiers
        // Note: Si la table n'existe pas, on retourne un tableau vide
        // Table dossiers may not exist - query avec types explicites
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase as any;
        const { data, error: supabaseError } = await client
          .from('dossiers')
          .select('*')
          .eq('copro_id', coproprieteId)
          .order('deadline', { ascending: true }) as { data: DossierRow[] | null; error: { code?: string; message: string } | null };

        if (supabaseError) {
          // Si la table n'existe pas (code 42P01), retourner empty state sans erreur
          if (supabaseError.code === '42P01') {
            // Table dossiers non disponible - mode empty state
            setDossiers([]);
          } else {
            throw supabaseError;
          }
        } else {
          // Mapper les données Supabase vers IDossier
          const mappedDossiers: IDossier[] = (data || []).map((d: DossierRow) => ({
            id: d.id,
            titre: d.titre,
            description: d.description ?? undefined,
            categorie: d.categorie as DossierCategorie,
            statut: d.statut as DossierStatut,
            priorite: d.priorite as DossierPriorite,
            deadline: d.deadline || new Date().toISOString(),
            coproprieteId: d.copro_id,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
          }));
          setDossiers(mappedDossiers);
        }
      } catch (e) {
        console.error('[useDossiers] Erreur chargement:', e);
        setError('Erreur lors du chargement des dossiers');
        setDossiers([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDossiers();
  }, [coproprieteId]);

  // Sauvegarder dans Supabase
  const saveDossier = useCallback(async (dossier: IDossier): Promise<boolean> => {
    try {
      const supabase = createClient();

      // Table dossiers may not exist - cast to any for upsert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error: supabaseError } = await client
        .from('dossiers')
        .upsert({
          id: dossier.id,
          titre: dossier.titre,
          description: dossier.description,
          categorie: dossier.categorie,
          statut: dossier.statut,
          priorite: dossier.priorite,
          deadline: dossier.deadline,
          copro_id: dossier.coproprieteId,
          created_at: dossier.createdAt,
          updated_at: new Date().toISOString(),
        });

      if (supabaseError) {
        // Si la table n'existe pas, log et return false
        if (supabaseError.code === '42P01') {
          // Table dossiers non disponible - sauvegarde impossible
          return false;
        }
        throw supabaseError;
      }

      return true;
    } catch (e) {
      console.error('[useDossiers] Erreur sauvegarde:', e);
      setError('Erreur lors de la sauvegarde');
      return false;
    }
  }, []);

  // Dossiers filtrés et triés par deadline
  const filteredDossiers = useMemo(() => {
    let result = [...dossiers];

    // Filtre par catégorie
    if (filters.categorie !== 'TOUS') {
      result = result.filter(d => d.categorie === filters.categorie);
    }

    // Filtre par statut
    if (filters.statut !== 'TOUS') {
      result = result.filter(d => d.statut === filters.statut);
    }

    // Filtre par recherche
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(d =>
        d.titre.toLowerCase().includes(searchLower) ||
        d.description?.toLowerCase().includes(searchLower)
      );
    }

    // Tri par deadline (plus proche en premier), puis par priorité
    const prioriteOrder = {
      [DossierPriorite.URGENTE]: 0,
      [DossierPriorite.HAUTE]: 1,
      [DossierPriorite.NORMALE]: 2,
      [DossierPriorite.BASSE]: 3
    };

    result.sort((a, b) => {
      // Terminés en dernier
      if (a.statut === DossierStatut.TERMINE && b.statut !== DossierStatut.TERMINE) return 1;
      if (b.statut === DossierStatut.TERMINE && a.statut !== DossierStatut.TERMINE) return -1;

      // Par deadline
      const dateA = new Date(a.deadline).getTime();
      const dateB = new Date(b.deadline).getTime();
      if (dateA !== dateB) return dateA - dateB;

      // Par priorité
      return prioriteOrder[a.priorite] - prioriteOrder[b.priorite];
    });

    return result;
  }, [dossiers, filters]);

  // Statistiques
  const stats = useMemo(() => ({
    total: dossiers.length,
    aFaire: dossiers.filter(d => d.statut === DossierStatut.A_FAIRE).length,
    enCours: dossiers.filter(d => d.statut === DossierStatut.EN_COURS).length,
    bloques: dossiers.filter(d => d.statut === DossierStatut.BLOQUE).length,
    termines: dossiers.filter(d => d.statut === DossierStatut.TERMINE).length,
    urgents: dossiers.filter(d =>
      d.priorite === DossierPriorite.URGENTE &&
      d.statut !== DossierStatut.TERMINE
    ).length,
    enRetard: dossiers.filter(d =>
      new Date(d.deadline) < new Date() &&
      d.statut !== DossierStatut.TERMINE
    ).length
  }), [dossiers]);

  // Créer un dossier
  const createDossier = useCallback(async (data: DossierFormData): Promise<IDossier | null> => {
    const now = new Date().toISOString();
    const newDossier: IDossier = {
      id: `dossier-${Date.now()}`,
      ...data,
      statut: DossierStatut.A_FAIRE,
      coproprieteId,
      createdAt: now,
      updatedAt: now
    };

    const success = await saveDossier(newDossier);
    if (success) {
      setDossiers(prev => [...prev, newDossier]);
      return newDossier;
    }

    // En mode dégradé (sans table), on ajoute quand même en local pour la session
    setDossiers(prev => [...prev, newDossier]);
    return newDossier;
  }, [coproprieteId, saveDossier]);

  // Mettre à jour un dossier
  const updateDossier = useCallback(async (id: string, data: Partial<IDossier>) => {
    const dossier = dossiers.find(d => d.id === id);
    if (!dossier) return;

    const updatedDossier = {
      ...dossier,
      ...data,
      updatedAt: new Date().toISOString()
    };

    await saveDossier(updatedDossier);
    setDossiers(prev => prev.map(d => d.id === id ? updatedDossier : d));
  }, [dossiers, saveDossier]);

  // Marquer comme terminé
  const markAsComplete = useCallback(async (id: string) => {
    await updateDossier(id, { statut: DossierStatut.TERMINE });
  }, [updateDossier]);

  // Supprimer un dossier
  const deleteDossier = useCallback(async (id: string) => {
    try {
      const supabase = createClient();

      // Table dossiers may not exist - cast to any for delete
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { error: supabaseError } = await client
        .from('dossiers')
        .delete()
        .eq('id', id);

      if (supabaseError && supabaseError.code !== '42P01') {
        throw supabaseError;
      }
    } catch (e) {
      console.error('[useDossiers] Erreur suppression:', e);
    }

    setDossiers(prev => prev.filter(d => d.id !== id));
  }, []);

  // Mettre à jour les filtres
  const updateFilters = useCallback((newFilters: Partial<DossiersFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setFilters({
      categorie: 'TOUS',
      statut: 'TOUS',
      search: ''
    });
  }, []);

  return {
    // Données
    dossiers: filteredDossiers,
    allDossiers: dossiers,
    stats,

    // États
    isLoading,
    error,
    filters,

    // Actions
    createDossier,
    updateDossier,
    markAsComplete,
    deleteDossier,
    updateFilters,
    resetFilters
  };
}
