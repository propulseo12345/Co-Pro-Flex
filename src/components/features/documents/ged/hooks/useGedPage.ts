'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  MOCK_DOCUMENTS_GED,
  GED_FOLDERS,
  getFolderPath,
  getSubFolders,
  getDocumentsInFolder,
} from '@/data/mock/documents-ged';
import {
  detectDocumentEntityType,
  extractDataFromFileName,
  getLinkableModule,
} from '@/lib/services/document-linking.service';
import { getDocumentsNeedingAttention } from '@/lib/services/document-versioning.service';
import { useDocumentPermissions } from '@/hooks/modules/useDocumentPermissions';
import type {
  SortField,
  SortOrder,
  ViewMode,
  NavigationMode,
  SearchFilters,
  DocumentWithFolder,
  DocumentWithRelevance,
  DetectedEntityType,
  ExtractedDocumentData,
  LinkedEntityType,
} from '../domain/types';
import { ITEMS_PER_PAGE } from '../domain/constants';
import { fuzzyMatch, calculateRelevanceScore, getCategoryLabel, hasActiveFilters } from '../domain/utils';

export function useGedPage() {
  // Main states
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('dateAjout');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('folders');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Link modal states
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDocForLink, setSelectedDocForLink] = useState<DocumentWithFolder | null>(null);
  const [detectedEntityType, setDetectedEntityType] = useState<DetectedEntityType | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData>({});

  // Preview state
  const [previewDocument, setPreviewDocument] = useState<DocumentWithFolder | null>(null);

  // Versioning alerts
  const [showVersioningAlerts, setShowVersioningAlerts] = useState(true);

  // Access rights modal
  const [showAccessRightsModal, setShowAccessRightsModal] = useState(false);
  const [selectedDocForAccess, setSelectedDocForAccess] = useState<DocumentWithFolder | null>(null);

  // Permissions hook
  const { filterAccessibleDocuments, canManageAccess, logAccessAction } = useDocumentPermissions();

  // Documents needing attention
  const documentsNeedingAttention = useMemo(() => getDocumentsNeedingAttention(), []);

  // Current folder
  const currentFolder = useMemo(() => {
    return currentFolderId ? GED_FOLDERS.find((f) => f.id === currentFolderId) : null;
  }, [currentFolderId]);

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    return currentFolderId ? getFolderPath(currentFolderId) : [];
  }, [currentFolderId]);

  // Sub-folders
  const subFolders = useMemo(() => getSubFolders(currentFolderId), [currentFolderId]);

  // Root folders
  const rootFolders = useMemo(() => getSubFolders(null), []);

  // Documents in current folder
  const currentFolderDocuments = useMemo(() => {
    if (currentFolderId) {
      return getDocumentsInFolder(currentFolderId);
    }
    return [];
  }, [currentFolderId]);

  // Available years
  const availableYears = useMemo(() => {
    const years = new Set(MOCK_DOCUMENTS_GED.map((d) => new Date(d.dateAjout).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, []);

  // Filter and sort documents
  const getFilteredDocuments = useCallback(
    (searchQuery: string, filters: SearchFilters): DocumentWithRelevance[] => {
      let docs: DocumentWithRelevance[] = [];
      const hasFilters = hasActiveFilters(filters);

      // Search mode: search all documents
      if (navigationMode === 'search' || (searchQuery && searchQuery.length >= 2)) {
        docs = MOCK_DOCUMENTS_GED.map((doc) => ({
          ...doc,
          relevanceScore: calculateRelevanceScore(doc, searchQuery, filters),
        })).filter((doc) => {
          if (searchQuery && searchQuery.length >= 2) {
            const match = fuzzyMatch(doc.nom, searchQuery);
            const catMatch = getCategoryLabel(doc.categorie).toLowerCase().includes(searchQuery.toLowerCase());
            if (!match.matches && !catMatch) return false;
          }
          return true;
        });
      } else if (navigationMode === 'folders' && currentFolderId) {
        docs = [...currentFolderDocuments];
      } else if (navigationMode === 'all') {
        docs = [...MOCK_DOCUMENTS_GED];
      }

      // Apply advanced filters
      if (hasFilters) {
        docs = docs.filter((doc) => {
          if (filters.categories.length > 0 && !filters.categories.includes(doc.categorie)) {
            return false;
          }

          const docDate = new Date(doc.dateAjout);
          if (filters.dateFrom && docDate < new Date(filters.dateFrom)) return false;
          if (filters.dateTo && docDate > new Date(filters.dateTo)) return false;

          const sizeNum = parseFloat(doc.taille);
          if (filters.sizeMin && sizeNum < parseFloat(filters.sizeMin)) return false;
          if (filters.sizeMax && sizeNum > parseFloat(filters.sizeMax)) return false;

          if (filters.fileTypes.length > 0) {
            const extension = doc.nom.split('.').pop()?.toLowerCase() || '';
            if (!filters.fileTypes.some((t) => extension.includes(t.toLowerCase()))) return false;
          }

          return true;
        });
      }

      // Sort
      docs.sort((a, b) => {
        let comparison = 0;

        if (sortField === 'pertinence' && searchQuery) {
          comparison = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        } else {
          switch (sortField) {
            case 'nom':
              comparison = a.nom.localeCompare(b.nom);
              break;
            case 'dateAjout':
              comparison = new Date(a.dateAjout).getTime() - new Date(b.dateAjout).getTime();
              break;
            case 'taille':
              comparison = parseFloat(a.taille) - parseFloat(b.taille);
              break;
            case 'categorie':
              comparison = a.categorie.localeCompare(b.categorie);
              break;
          }
        }

        return sortField === 'pertinence' ? comparison : sortOrder === 'asc' ? comparison : -comparison;
      });

      // Filter by access rights
      return filterAccessibleDocuments(docs);
    },
    [navigationMode, currentFolderId, currentFolderDocuments, sortField, sortOrder, filterAccessibleDocuments]
  );

  // Pagination helper
  const getPaginatedDocuments = useCallback(
    (documents: DocumentWithRelevance[]) => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return documents.slice(start, start + ITEMS_PER_PAGE);
    },
    [currentPage]
  );

  const getTotalPages = useCallback((totalDocuments: number) => {
    return Math.ceil(totalDocuments / ITEMS_PER_PAGE);
  }, []);

  // Navigation
  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setCurrentPage(1);
    setNavigationMode('folders');
  }, []);

  const handleModeChange = useCallback((mode: NavigationMode) => {
    setNavigationMode(mode);
    if (mode === 'folders') {
      setCurrentFolderId(null);
    }
    if (mode === 'all') {
      setSortField('dateAjout');
    }
    setCurrentPage(1);
  }, []);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const folderName = currentFolder?.nom || 'Racine';
        alert(
          `${files.length} fichier(s) sélectionné(s) pour import dans "${folderName}".\n\nFonctionnalité disponible après intégration Supabase.`
        );
      }
    },
    [currentFolder]
  );

  // Link modal
  const handleOpenLinkModal = useCallback((doc: DocumentWithFolder) => {
    setSelectedDocForLink(doc);
    const detected = detectDocumentEntityType(doc.nom, doc.categorie);
    setDetectedEntityType(detected);
    const extracted = extractDataFromFileName(doc.nom);
    setExtractedData(extracted);
    setShowLinkModal(true);
  }, []);

  const handleCloseLinkModal = useCallback(() => {
    setShowLinkModal(false);
    setSelectedDocForLink(null);
    setDetectedEntityType(null);
    setExtractedData({});
  }, []);

  const handleCreateLink = useCallback(
    (entityType: LinkedEntityType, entityId?: string) => {
      const module = getLinkableModule(entityType);
      if (module && selectedDocForLink) {
        alert(
          `Liaison créée !\n\nDocument : ${selectedDocForLink.nom}\nType : ${module.label}\n${entityId ? `Entité : ${entityId}` : 'Nouvelle entité à créer'}\n\nCette fonctionnalité sera pleinement opérationnelle après intégration Supabase.`
        );
        handleCloseLinkModal();
      }
    },
    [selectedDocForLink, handleCloseLinkModal]
  );

  // Preview
  const handlePreviewDocument = useCallback(
    (doc: DocumentWithFolder) => {
      logAccessAction(doc.id, 'VIEW', true);
      setPreviewDocument(doc);
    },
    [logAccessAction]
  );

  const handleClosePreview = useCallback(() => {
    setPreviewDocument(null);
  }, []);

  // Access rights
  const handleOpenAccessRights = useCallback((doc: DocumentWithFolder) => {
    setSelectedDocForAccess(doc);
    setShowAccessRightsModal(true);
  }, []);

  const handleCloseAccessRights = useCallback(() => {
    setSelectedDocForAccess(null);
    setShowAccessRightsModal(false);
  }, []);

  return {
    // State
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    currentPage,
    setCurrentPage,
    isDragOver,
    showChecklist,
    setShowChecklist,
    navigationMode,
    setNavigationMode,
    currentFolderId,

    // Link modal
    showLinkModal,
    selectedDocForLink,
    detectedEntityType,
    extractedData,

    // Preview
    previewDocument,

    // Versioning
    showVersioningAlerts,
    setShowVersioningAlerts,
    documentsNeedingAttention,

    // Access rights
    showAccessRightsModal,
    selectedDocForAccess,
    canManageAccess,

    // Computed
    currentFolder,
    breadcrumb,
    subFolders,
    rootFolders,
    availableYears,

    // Methods
    getFilteredDocuments,
    getPaginatedDocuments,
    getTotalPages,
    navigateToFolder,
    handleModeChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleOpenLinkModal,
    handleCloseLinkModal,
    handleCreateLink,
    handlePreviewDocument,
    handleClosePreview,
    handleOpenAccessRights,
    handleCloseAccessRights,
  };
}
