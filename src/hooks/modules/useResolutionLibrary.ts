/**
 * Hook de gestion de la bibliothèque de résolutions
 *
 * Fournit recherche full-text, filtres avancés, tri et pagination
 */

import { useState, useMemo, useCallback } from 'react';
import {
  CATEGORIES_RESOLUTIONS,
  type ResolutionTemplate,
  type TypeAG,
  type MajorityType,
  type TemplateScope,
  type TemplateStatus,
} from '@/lib/constants/resolutions';
import type { ResolutionTemplateRow } from '@/lib/ag/resolutionTemplates/types';
import { useResolutionTemplates } from '@/providers/ResolutionTemplatesProvider';

// Types pour les filtres
export interface ResolutionFilters {
  query: string;
  categories: string[];
  agTypes: TypeAG[];
  majorites: MajorityType[];
  tags: string[];
  scope: TemplateScope | 'all';
  status: TemplateStatus | 'all';
  obligatoireOnly: boolean;
}

// Types pour le tri
export type SortOption = 'relevance' | 'popular' | 'recent' | 'alphabetical' | 'category';

// Type pour les résultats avec score de pertinence
interface ScoredResolution {
  resolution: ResolutionTemplateRow;
  score: number;
}

// Options du hook
export interface UseResolutionLibraryOptions {
  initialFilters?: Partial<ResolutionFilters>;
  pageSize?: number;
}

// Retour du hook
export interface UseResolutionLibraryReturn {
  // Données
  resolutions: ResolutionTemplateRow[];
  totalCount: number;
  filteredCount: number;
  categories: string[];
  allTags: string[];

  // Filtres
  filters: ResolutionFilters;
  setFilters: (filters: Partial<ResolutionFilters>) => void;
  resetFilters: () => void;

  // Recherche
  search: (query: string) => void;

  // Tri
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;

  // Pagination
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Actions
  getResolutionById: (id: string) => ResolutionTemplateRow | undefined;
  getResolutionsByCategory: (category: string) => ResolutionTemplateRow[];

  // État
  isFiltered: boolean;
  hasResults: boolean;
}

// Filtres par défaut
const DEFAULT_FILTERS: ResolutionFilters = {
  query: '',
  categories: [],
  agTypes: [],
  majorites: [],
  tags: [],
  scope: 'all',
  status: 'all',
  obligatoireOnly: false,
};

/**
 * Calcule un score de pertinence pour une résolution
 */
function calculateRelevanceScore(
  resolution: ResolutionTemplate,
  query: string
): number {
  if (!query.trim()) return 0;

  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);
  let score = 0;

  // Titre (poids le plus élevé)
  const titleLower = resolution.titre.toLowerCase();
  if (titleLower === lowerQuery) {
    score += 100; // Match exact
  } else if (titleLower.includes(lowerQuery)) {
    score += 50; // Match partiel
  } else {
    // Score par mot
    words.forEach(word => {
      if (titleLower.includes(word)) score += 20;
    });
  }

  // Catégorie
  const categorieLower = resolution.categorie.toLowerCase();
  if (categorieLower.includes(lowerQuery)) {
    score += 30;
  } else {
    words.forEach(word => {
      if (categorieLower.includes(word)) score += 10;
    });
  }

  // Tags
  if (resolution.tags) {
    resolution.tags.forEach(tag => {
      const tagLower = tag.toLowerCase();
      if (tagLower === lowerQuery) {
        score += 25;
      } else if (tagLower.includes(lowerQuery)) {
        score += 15;
      } else {
        words.forEach(word => {
          if (tagLower.includes(word)) score += 5;
        });
      }
    });
  }

  // Texte (poids plus faible)
  const texteLower = resolution.texte.toLowerCase();
  words.forEach(word => {
    if (texteLower.includes(word)) score += 2;
  });

  return score;
}

/**
 * Extrait tous les tags uniques de la bibliothèque
 */
function extractAllTags(resolutions: ResolutionTemplate[]): string[] {
  const tagsSet = new Set<string>();
  resolutions.forEach(r => {
    r.tags?.forEach(tag => tagsSet.add(tag));
  });
  return Array.from(tagsSet).sort();
}

/**
 * Hook principal de la bibliothèque de résolutions
 */
export function useResolutionLibrary(
  options: UseResolutionLibraryOptions = {}
): UseResolutionLibraryReturn {
  const { initialFilters = {}, pageSize: defaultPageSize = 20 } = options;

  // Source unique : snapshot de la banque chargé en base via le provider
  const { templates } = useResolutionTemplates();

  // États
  const [filters, setFiltersState] = useState<ResolutionFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(defaultPageSize);

  // Toutes les catégories disponibles
  const categories = useMemo(() => [...CATEGORIES_RESOLUTIONS], []);

  // Tous les tags disponibles
  const allTags = useMemo(() => extractAllTags(templates), [templates]);

  // Filtrage des résolutions
  const filteredResolutions = useMemo(() => {
    let results: ScoredResolution[] = templates.map(r => ({
      resolution: r,
      score: calculateRelevanceScore(r, filters.query),
    }));

    // Filtre par recherche textuelle
    if (filters.query.trim()) {
      results = results.filter(({ score }) => score > 0);
    }

    // Filtre par catégories
    if (filters.categories.length > 0) {
      results = results.filter(({ resolution }) =>
        filters.categories.includes(resolution.categorie)
      );
    }

    // Filtre par type d'AG
    if (filters.agTypes.length > 0) {
      results = results.filter(({ resolution }) => {
        if (!resolution.applicable_ag) return true; // Applicable à tous si non défini
        return filters.agTypes.some(agType =>
          resolution.applicable_ag?.includes(agType)
        );
      });
    }

    // Filtre par majorité
    if (filters.majorites.length > 0) {
      results = results.filter(({ resolution }) =>
        filters.majorites.includes(resolution.majorite)
      );
    }

    // Filtre par tags
    if (filters.tags.length > 0) {
      results = results.filter(({ resolution }) =>
        filters.tags.some(tag => resolution.tags?.includes(tag))
      );
    }

    // Filtre par scope
    if (filters.scope !== 'all') {
      results = results.filter(
        ({ resolution }) => (resolution.scope || 'system') === filters.scope
      );
    }

    // Filtre par status
    if (filters.status !== 'all') {
      results = results.filter(
        ({ resolution }) => (resolution.status || 'active') === filters.status
      );
    }

    // Filtre obligatoire uniquement
    if (filters.obligatoireOnly) {
      results = results.filter(
        ({ resolution }) =>
          resolution.obligatoire_pour && resolution.obligatoire_pour.length > 0
      );
    }

    return results;
  }, [templates, filters]);

  // Tri des résolutions
  const sortedResolutions = useMemo(() => {
    const sorted = [...filteredResolutions];

    switch (sortBy) {
      case 'relevance':
        // Tri par score de pertinence (décroissant)
        sorted.sort((a, b) => b.score - a.score);
        break;

      case 'popular':
        // Tri par nombre d'utilisations (décroissant)
        sorted.sort(
          (a, b) =>
            (b.resolution.usageCount || 0) - (a.resolution.usageCount || 0)
        );
        break;

      case 'recent':
        // Tri par date de mise à jour (plus récent d'abord)
        sorted.sort((a, b) => {
          const dateA = a.resolution.updatedAt || a.resolution.createdAt || '';
          const dateB = b.resolution.updatedAt || b.resolution.createdAt || '';
          return dateB.localeCompare(dateA);
        });
        break;

      case 'alphabetical':
        // Tri alphabétique par titre
        sorted.sort((a, b) =>
          a.resolution.titre.localeCompare(b.resolution.titre, 'fr')
        );
        break;

      case 'category':
        // Tri par catégorie puis par ordre suggéré
        sorted.sort((a, b) => {
          const catCompare = a.resolution.categorie.localeCompare(
            b.resolution.categorie,
            'fr'
          );
          if (catCompare !== 0) return catCompare;
          return (
            (a.resolution.ordre_suggere || 999) -
            (b.resolution.ordre_suggere || 999)
          );
        });
        break;
    }

    return sorted.map(s => s.resolution);
  }, [filteredResolutions, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedResolutions.length / pageSize);
  const paginatedResolutions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedResolutions.slice(start, start + pageSize);
  }, [sortedResolutions, page, pageSize]);

  // Réinitialiser la page quand les filtres changent
  const setFilters = useCallback((newFilters: Partial<ResolutionFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Reset to first page
  }, []);

  // Réinitialiser tous les filtres
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setPage(1);
    setSortBy('relevance');
  }, []);

  // Recherche rapide
  const search = useCallback((query: string) => {
    setFilters({ query });
  }, [setFilters]);

  // Navigation
  const nextPage = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage(p => Math.max(p - 1, 1));
  }, []);

  // Récupérer une résolution par ID
  const getResolutionById = useCallback(
    (id: string): ResolutionTemplateRow | undefined => {
      return templates.find(r => r.id === id);
    },
    [templates]
  );

  // Récupérer les résolutions par catégorie
  const getResolutionsByCategory = useCallback(
    (category: string): ResolutionTemplateRow[] => {
      return templates.filter(r => r.categorie === category);
    },
    [templates]
  );

  // États dérivés
  const isFiltered =
    filters.query !== '' ||
    filters.categories.length > 0 ||
    filters.agTypes.length > 0 ||
    filters.majorites.length > 0 ||
    filters.tags.length > 0 ||
    filters.scope !== 'all' ||
    filters.status !== 'all' ||
    filters.obligatoireOnly;

  const hasResults = paginatedResolutions.length > 0;

  return {
    // Données
    resolutions: paginatedResolutions,
    totalCount: templates.length,
    filteredCount: sortedResolutions.length,
    categories,
    allTags,

    // Filtres
    filters,
    setFilters,
    resetFilters,

    // Recherche
    search,

    // Tri
    sortBy,
    setSortBy,

    // Pagination
    page,
    pageSize,
    totalPages,
    setPage,
    nextPage,
    prevPage,

    // Actions
    getResolutionById,
    getResolutionsByCategory,

    // État
    isFiltered,
    hasResults,
  };
}

export default useResolutionLibrary;
