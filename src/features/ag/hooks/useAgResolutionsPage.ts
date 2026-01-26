'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  useResolutionLibrary,
  type SortOption,
} from '@/hooks/modules/useResolutionLibrary';
import type { MajorityType, TypeAG, ResolutionTemplate } from '@/lib/constants/resolutions';
import type { ICustomResolution } from '@/types/models/custom-resolution';

interface AvailableAG {
  id: string;
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE';
  date: string;
  lieu: string;
}

interface StoredResolution {
  id: string;
  templateId?: string;
  titre: string;
  texte: string;
  majorite: MajorityType;
  variables?: Record<string, string>;
  custom: boolean;
  categorie?: string;
}

export function useAgResolutionsPage() {
  const library = useResolutionLibrary({ pageSize: 24 });

  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [availableAGs, setAvailableAGs] = useState<AvailableAG[]>([]);
  const [showAddToAGModal, setShowAddToAGModal] = useState(false);
  const [selectedResolutionForAG, setSelectedResolutionForAG] = useState<ResolutionTemplate | null>(null);
  const [addedToAGId, setAddedToAGId] = useState<string | null>(null);
  const [customResolutions, setCustomResolutions] = useState<ICustomResolution[]>([]);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingResolution, setEditingResolution] = useState<ICustomResolution | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem('custom-resolutions-library');
    if (saved) {
      setCustomResolutions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const loadAvailableAGs = () => {
      const agKeys = Object.keys(localStorage).filter(key => key.startsWith('ag-draft-'));
      const ags: AvailableAG[] = [];
      const today = new Date().toISOString().split('T')[0];

      for (const key of agKeys) {
        const agId = key.replace('ag-draft-', '');
        const isCompleted = localStorage.getItem(`ag-completed-${agId}`);

        if (!isCompleted) {
          try {
            const draftData = JSON.parse(localStorage.getItem(key) || '{}');
            if (draftData.date && draftData.date >= today) {
              ags.push({
                id: agId,
                type: draftData.type || 'ORDINAIRE',
                date: draftData.date,
                lieu: draftData.lieu || 'Non défini',
              });
            }
          } catch { /* ignore */ }
        }
      }
      ags.sort((a, b) => a.date.localeCompare(b.date));
      setAvailableAGs(ags);
    };
    loadAvailableAGs();
  }, []);

  const saveCustomResolutions = (resolutions: ICustomResolution[]) => {
    localStorage.setItem('custom-resolutions-library', JSON.stringify(resolutions));
    setCustomResolutions(resolutions);
  };

  const handleSaveResolution = useCallback((resolution: ICustomResolution) => {
    const existingIndex = customResolutions.findIndex(r => r.id === resolution.id);
    if (existingIndex >= 0) {
      const updated = [...customResolutions];
      updated[existingIndex] = resolution;
      saveCustomResolutions(updated);
    } else {
      saveCustomResolutions([...customResolutions, resolution]);
    }
    setShowEditorModal(false);
    setEditingResolution(undefined);
  }, [customResolutions]);

  const handleOpenEditor = useCallback(() => {
    setEditingResolution(undefined);
    setShowEditorModal(true);
  }, []);

  const handleEditResolution = useCallback((resolution: ICustomResolution) => {
    setEditingResolution(resolution);
    setShowEditorModal(true);
  }, []);

  const handleDeleteResolution = useCallback((id: string) => {
    if (confirm('Supprimer cette résolution de la bibliothèque ?')) {
      saveCustomResolutions(customResolutions.filter(r => r.id !== id));
    }
  }, [customResolutions]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleOpenAddToAG = useCallback((resolution: ResolutionTemplate) => {
    setSelectedResolutionForAG(resolution);
    setShowAddToAGModal(true);
  }, []);

  const handleAddToAG = useCallback((agId: string) => {
    if (!selectedResolutionForAG) return;

    const existingKey = `ag-resolutions-${agId}`;
    let existingResolutions: StoredResolution[] = [];
    try {
      const saved = localStorage.getItem(existingKey);
      if (saved) existingResolutions = JSON.parse(saved);
    } catch { existingResolutions = []; }

    const alreadyExists = existingResolutions.some(r => r.templateId === selectedResolutionForAG.id);
    if (alreadyExists) {
      setShowAddToAGModal(false);
      setSelectedResolutionForAG(null);
      return;
    }

    const variables: Record<string, string> = {};
    if (selectedResolutionForAG.variables) {
      selectedResolutionForAG.variables.forEach(varName => { variables[varName] = ''; });
    }

    const newResolution: StoredResolution = {
      id: 'res-' + Date.now(),
      templateId: selectedResolutionForAG.id,
      titre: selectedResolutionForAG.titre,
      texte: selectedResolutionForAG.texte,
      majorite: selectedResolutionForAG.majorite,
      variables,
      custom: false,
      categorie: selectedResolutionForAG.categorie,
    };

    localStorage.setItem(existingKey, JSON.stringify([...existingResolutions, newResolution]));
    setAddedToAGId(agId);
    setTimeout(() => setAddedToAGId(null), 2000);
    setShowAddToAGModal(false);
    setSelectedResolutionForAG(null);
  }, [selectedResolutionForAG]);

  const toggleCategoryFilter = useCallback((category: string) => {
    const newCategories = library.filters.categories.includes(category)
      ? library.filters.categories.filter(c => c !== category)
      : [...library.filters.categories, category];
    library.setFilters({ categories: newCategories });
  }, [library]);

  const toggleAgTypeFilter = useCallback((agType: TypeAG) => {
    const newAgTypes = library.filters.agTypes.includes(agType)
      ? library.filters.agTypes.filter(t => t !== agType)
      : [...library.filters.agTypes, agType];
    library.setFilters({ agTypes: newAgTypes });
  }, [library]);

  const toggleMajoriteFilter = useCallback((majorite: MajorityType) => {
    const newMajorites = library.filters.majorites.includes(majorite)
      ? library.filters.majorites.filter(m => m !== majorite)
      : [...library.filters.majorites, majorite];
    library.setFilters({ majorites: newMajorites });
  }, [library]);

  const toggleTagFilter = useCallback((tag: string) => {
    const newTags = library.filters.tags.includes(tag)
      ? library.filters.tags.filter(t => t !== tag)
      : [...library.filters.tags, tag];
    library.setFilters({ tags: newTags });
  }, [library]);

  const toggleCategoryExpanded = useCallback((category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const closeAddToAGModal = useCallback(() => {
    setShowAddToAGModal(false);
    setSelectedResolutionForAG(null);
  }, []);

  const closeEditorModal = useCallback(() => {
    setShowEditorModal(false);
    setEditingResolution(undefined);
  }, []);

  const groupedResolutions = library.resolutions.reduce((acc, res) => {
    const cat = res.categorie;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(res);
    return acc;
  }, {} as Record<string, ResolutionTemplate[]>);

  const activeFiltersCount =
    library.filters.categories.length +
    library.filters.agTypes.length +
    library.filters.majorites.length +
    library.filters.tags.length +
    (library.filters.scope !== 'all' ? 1 : 0) +
    (library.filters.status !== 'all' ? 1 : 0) +
    (library.filters.obligatoireOnly ? 1 : 0);

  return {
    ...library,
    showFilters,
    setShowFilters,
    copiedId,
    expandedCategories,
    availableAGs,
    showAddToAGModal,
    selectedResolutionForAG,
    addedToAGId,
    customResolutions,
    showEditorModal,
    editingResolution,
    groupedResolutions,
    activeFiltersCount,
    handleSaveResolution,
    handleOpenEditor,
    handleEditResolution,
    handleDeleteResolution,
    handleCopy,
    handleOpenAddToAG,
    handleAddToAG,
    toggleCategoryFilter,
    toggleAgTypeFilter,
    toggleMajoriteFilter,
    toggleTagFilter,
    toggleCategoryExpanded,
    closeAddToAGModal,
    closeEditorModal,
  };
}
