'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  useResolutionLibrary,
} from '@/hooks/modules/useResolutionLibrary';
import type { MajorityType, TypeAG, ResolutionTemplate } from '@/lib/constants/resolutions';
import type { ICustomResolution } from '@/types/models/custom-resolution';
import type { ResolutionTemplateRow } from '@/lib/ag/resolutionTemplates/types';
import { createTemplate, updateTemplate, deleteTemplate, duplicateTemplate } from '@/lib/ag/resolutionTemplates/api';
import { useResolutionTemplates } from '@/providers/ResolutionTemplatesProvider';
import { loadDraft, saveDraft } from '@/lib/ag/draft-persistence';
import { useAgDrafts } from '@/hooks/modules/useAgDrafts';

/** Mappe un modèle « org » (banque en base) vers la forme d'affichage ICustomResolution. */
function rowToCustomResolution(row: ResolutionTemplateRow): ICustomResolution {
  return {
    id: row.id,
    createdAt: row.createdAt ?? '',
    updatedAt: row.updatedAt ?? '',
    createdBy: '',
    organizationId: row.cabinet_id ?? '',
    titre: row.titre,
    texte: row.texte,
    categorie: row.categorie,
    majorite: row.majorite,
    variables: (row.variables ?? []).map((key) => ({
      key,
      label: key,
      type: 'text' as const,
      required: false,
    })),
    scope: 'org',
    isTemplate: true,
    legalRef: row.legalRef,
    usageCount: row.usageCount ?? 0,
    tags: row.tags ?? [],
  };
}

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
  const { drafts: agDrafts, isLoading: isLoadingDrafts } = useAgDrafts();
  const { templates, cabinetId, coproId, refresh } = useResolutionTemplates();

  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddToAGModal, setShowAddToAGModal] = useState(false);
  const [selectedResolutionForAG, setSelectedResolutionForAG] = useState<ResolutionTemplate | null>(null);
  const [addedToAGId, setAddedToAGId] = useState<string | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingResolution, setEditingResolution] = useState<ICustomResolution | undefined>(undefined);

  // Modèles personnalisés = modèles « org » du snapshot (banque en base), plus de localStorage.
  const customResolutions = useMemo<ICustomResolution[]>(
    () => templates.filter((t) => t.scope === 'org').map(rowToCustomResolution),
    [templates]
  );

  // Mapper les brouillons d'AG Supabase vers le format AvailableAG
  const availableAGs = useMemo((): AvailableAG[] => {
    if (isLoadingDrafts) return [];

    const today = new Date().toISOString().split('T')[0];

    return agDrafts
      .filter(draft => {
        // Inclure les AG avec une date future ou sans date (en cours de préparation)
        if (!draft.meeting_date) return true;
        const draftDate = draft.meeting_date.split('T')[0];
        return draftDate >= today;
      })
      .map((draft): AvailableAG => ({
        id: draft.id,
        type: draft.meeting_type === 'ordinary' ? 'ORDINAIRE' : 'EXTRAORDINAIRE',
        date: draft.meeting_date ? draft.meeting_date.split('T')[0] : '',
        lieu: draft.location || 'Non défini',
      }))
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
  }, [agDrafts, isLoadingDrafts]);

  const [editorError, setEditorError] = useState<string | null>(null);

  const handleSaveResolution = useCallback(async (resolution: ICustomResolution) => {
    setEditorError(null);
    const payload = {
      titre: resolution.titre,
      categorie: resolution.categorie,
      texte: resolution.texte,
      majorite: resolution.majorite,
      tags: resolution.tags,
      variables: resolution.variables.map((v) => v.key),
    };

    // Un modèle déjà présent dans le snapshot = mise à jour ; sinon création.
    const exists = templates.some((t) => t.id === resolution.id);
    if (exists) {
      const result = await updateTemplate(resolution.id, payload);
      if (!result.success) {
        setEditorError(result.error);
        return;
      }
    } else if (cabinetId) {
      const result = await createTemplate(cabinetId, payload, coproId);
      if (!result.success) {
        setEditorError(result.error);
        return;
      }
    } else {
      // Correction du refus silencieux : cabinetId est null, on ne peut pas créer.
      setEditorError('Aucun cabinet associé à votre compte. Impossible de créer un modèle.');
      return;
    }
    await refresh();
    setShowEditorModal(false);
    setEditingResolution(undefined);
  }, [templates, cabinetId, coproId, refresh]);

  const handleOpenEditor = useCallback(() => {
    setEditingResolution(undefined);
    setShowEditorModal(true);
  }, []);

  const handleEditResolution = useCallback((resolution: ICustomResolution | ResolutionTemplateRow) => {
    // Accepte les deux formes : ICustomResolution (depuis les cartes custom) ou ResolutionTemplateRow (depuis ResolutionCard)
    if ('cabinet_id' in resolution) {
      setEditingResolution(rowToCustomResolution(resolution as ResolutionTemplateRow));
    } else {
      setEditingResolution(resolution as ICustomResolution);
    }
    setShowEditorModal(true);
  }, []);

  const handleDeleteResolution = useCallback(async (id: string) => {
    setEditorError(null);
    if (!confirm('Supprimer cette résolution de la bibliothèque ?')) return;
    const result = await deleteTemplate(id);
    if (result.success) {
      await refresh();
    } else {
      setEditorError(result.error);
    }
  }, [refresh]);

  const handleDuplicateResolution = useCallback(async (id: string) => {
    setEditorError(null);
    if (!cabinetId) {
      setEditorError('Aucun cabinet associé à votre compte.');
      return;
    }
    const result = await duplicateTemplate(id, cabinetId, null);
    if (result.success) {
      await refresh();
    } else {
      setEditorError(result.error);
    }
  }, [cabinetId, refresh]);

  const handleCopy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleOpenAddToAG = useCallback((resolution: ResolutionTemplate) => {
    setSelectedResolutionForAG(resolution);
    setShowAddToAGModal(true);
  }, []);

  const handleAddToAG = useCallback(async (agId: string) => {
    if (!selectedResolutionForAG) return;

    const existingKey = `ag-resolutions-${agId}`;
    let existingResolutions: StoredResolution[] = [];
    const { data: saved } = await loadDraft<StoredResolution[]>(agId, 'resolutions', existingKey);
    if (saved) existingResolutions = saved;

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

    await saveDraft(agId, 'resolutions', [...existingResolutions, newResolution], existingKey);
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
  }, {} as Record<string, ResolutionTemplateRow[]>);

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
    editorError,
    cabinetId,
    groupedResolutions,
    activeFiltersCount,
    handleSaveResolution,
    handleOpenEditor,
    handleEditResolution,
    handleDeleteResolution,
    handleDuplicateResolution,
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
