'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { MOCK_DOCUMENTS_GED, DOCUMENT_CATEGORIES, GED_FOLDERS } from '@/data/mock/documents-ged';
import type { SearchFilters, SearchSuggestion, NavigationMode, SortField } from '../domain/types';
import { DEFAULT_FILTERS, MAX_SEARCH_HISTORY, SEARCH_HISTORY_KEY } from '../domain/constants';
import { fuzzyMatch, getCategoryColor, hasActiveFilters } from '../domain/utils';

export function useDocumentSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load search history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        try {
          setSearchHistory(JSON.parse(saved));
        } catch {
          // Ignore parsing errors
        }
      }
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) return;

    setSearchHistory((prev) => {
      const filtered = prev.filter((h) => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_SEARCH_HISTORY);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Remove from history
  const removeFromHistory = useCallback((query: string) => {
    setSearchHistory((prev) => {
      const updated = prev.filter((h) => h !== query);
      if (typeof window !== 'undefined') {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  // Search suggestions
  const searchSuggestions = useMemo((): SearchSuggestion[] => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    const suggestions: SearchSuggestion[] = [];

    // Category suggestions
    DOCUMENT_CATEGORIES.slice(1).forEach((cat) => {
      if (cat.label.toLowerCase().includes(query)) {
        suggestions.push({
          type: 'category',
          label: cat.label,
          value: cat.value,
          color: getCategoryColor(cat.value),
        });
      }
    });

    // Folder suggestions
    GED_FOLDERS.filter((f) => f.nom.toLowerCase().includes(query))
      .slice(0, 3)
      .forEach((folder) => {
        suggestions.push({
          type: 'folder',
          label: folder.nom,
          value: folder.id,
          color: folder.color,
        });
      });

    // Document suggestions
    MOCK_DOCUMENTS_GED.filter((d) => fuzzyMatch(d.nom, searchQuery).matches)
      .slice(0, 5)
      .forEach((doc) => {
        suggestions.push({
          type: 'document',
          label: doc.nom,
          value: doc.id,
          color: getCategoryColor(doc.categorie),
        });
      });

    return suggestions.slice(0, 8);
  }, [searchQuery]);

  const activeFilters = useMemo(() => hasActiveFilters(filters), [filters]);

  const handleClearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const handleCategoryFilter = useCallback((category: string) => {
    setFilters((prev) => {
      const categories = prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category];
      return { ...prev, categories };
    });
  }, []);

  const handleFileTypeFilter = useCallback((type: string) => {
    const typeLower = type.toLowerCase();
    setFilters((prev) => ({
      ...prev,
      fileTypes: prev.fileTypes.includes(typeLower)
        ? prev.fileTypes.filter((t) => t !== typeLower)
        : [...prev.fileTypes, typeLower],
    }));
  }, []);

  const updateDateFrom = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, dateFrom: value }));
  }, []);

  const updateDateTo = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, dateTo: value }));
  }, []);

  const updateSizeMin = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, sizeMin: value }));
  }, []);

  const updateSizeMax = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, sizeMax: value }));
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    showSearchDropdown,
    setShowSearchDropdown,
    showAdvancedFilters,
    setShowAdvancedFilters,
    filters,
    setFilters,
    searchHistory,
    isSearchFocused,
    setIsSearchFocused,
    searchSuggestions,
    activeFilters,
    saveToHistory,
    removeFromHistory,
    handleClearFilters,
    handleCategoryFilter,
    handleFileTypeFilter,
    updateDateFrom,
    updateDateTo,
    updateSizeMin,
    updateSizeMax,
  };
}
