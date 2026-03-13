'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCopro } from '@/providers/CoproContext';
import * as documentsApi from '@/lib/documents/api';
import type { Document, DocumentFolder, DocumentCategory, DocumentStats } from '@/lib/documents/api';
import {
  detectDocumentEntityType,
  extractDataFromFileName,
  getLinkableModule,
} from '@/lib/services/document-linking.service';
import { useDocumentPermissions } from '@/hooks/modules/useDocumentPermissions';
import type {
  SortField,
  SortOrder,
  ViewMode,
  NavigationMode,
  SearchFilters,
  DocumentWithRelevance,
  DetectedEntityType,
  LinkedEntityType,
  ExtractedDocumentData,
  GEDFolder,
  DocumentWithFolder,
} from '../domain/types';
import { ITEMS_PER_PAGE, CATEGORY_LABELS } from '../domain/constants';

// ============================================================================
// NORMALIZERS
// ============================================================================

function normalizeDocument(doc: Document): DocumentWithFolder {
  return {
    id: doc.id,
    nom: doc.file_name,
    titre: doc.title || doc.file_name,
    description: doc.description,
    dateAjout: doc.created_at,
    taille: doc.file_size ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} Mo` : '0 Mo',
    type: doc.mime_type?.includes('pdf') ? 'PDF' : doc.mime_type?.includes('image') ? 'IMAGE' : 'AUTRE',
    categorie: (doc.category || 'autre').toUpperCase(),
    tags: doc.tags || [],
    dossierId: doc.folder_id || null,
    confidentialite: doc.confidentiality,
    coproprieteId: doc.copro_id,
    url: doc.file_path,
    annee: doc.year || new Date(doc.created_at).getFullYear(),
  };
}

function normalizeFolder(folder: DocumentFolder): GEDFolder {
  return {
    id: folder.id,
    nom: folder.name,
    parentId: folder.parent_id,
    icon: folder.icon,
    color: folder.color,
    ordre: folder.sort_order,
    description: folder.description,
    documentCount: folder.document_count,
    subfolderCount: folder.subfolder_count,
  };
}

// ============================================================================
// UTILS
// ============================================================================

function fuzzyMatch(str: string, pattern: string): { matches: boolean; score: number } {
  const lowerStr = str.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  if (lowerStr.includes(lowerPattern)) return { matches: true, score: 100 };
  // Simple fuzzy: check if all chars are in order
  let j = 0;
  for (let i = 0; i < lowerStr.length && j < lowerPattern.length; i++) {
    if (lowerStr[i] === lowerPattern[j]) j++;
  }
  return { matches: j === lowerPattern.length, score: j === lowerPattern.length ? 50 : 0 };
}

function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || CATEGORY_LABELS[category.toLowerCase()] || category;
}

function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.categories.length > 0 ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.sizeMin !== '' ||
    filters.sizeMax !== '' ||
    filters.fileTypes.length > 0
  );
}

function calculateRelevanceScore(doc: DocumentWithFolder, query: string, filters: SearchFilters): number {
  let score = 0;
  if (!query) return score;

  const lowerQuery = query.toLowerCase();
  const lowerName = doc.nom.toLowerCase();
  const lowerTitle = (doc.titre || '').toLowerCase();

  // Exact match in name
  if (lowerName === lowerQuery) score += 100;
  else if (lowerName.includes(lowerQuery)) score += 80;

  // Match in title
  if (lowerTitle.includes(lowerQuery)) score += 60;

  // Category match
  if (getCategoryLabel(doc.categorie).toLowerCase().includes(lowerQuery)) score += 40;

  // Recent bonus
  const docDate = new Date(doc.dateAjout);
  const daysSinceUpload = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpload < 30) score += 20;
  else if (daysSinceUpload < 90) score += 10;

  return score;
}

// ============================================================================
// HOOK
// ============================================================================

export function useGedPageSupabase() {
  const { currentCoproId } = useCopro();

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('dateAjout');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('folders');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Link modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDocForLink, setSelectedDocForLink] = useState<DocumentWithFolder | null>(null);
  const [detectedEntityType, setDetectedEntityType] = useState<DetectedEntityType | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData>({});

  // Preview
  const [previewDocument, setPreviewDocument] = useState<DocumentWithFolder | null>(null);
  const [showVersioningAlerts, setShowVersioningAlerts] = useState(true);
  const [showAccessRightsModal, setShowAccessRightsModal] = useState(false);
  const [selectedDocForAccess, setSelectedDocForAccess] = useState<DocumentWithFolder | null>(null);

  // Data state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { filterAccessibleDocuments, canManageAccess, logAccessAction } = useDocumentPermissions();

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  useEffect(() => {
    if (!currentCoproId) {
      setDocuments([]);
      setFolders([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [docsData, foldersData, statsData] = await Promise.all([
          documentsApi.getDocuments(currentCoproId),
          documentsApi.getFolders(currentCoproId),
          documentsApi.getDocumentStats(currentCoproId),
        ]);

        setDocuments(docsData);
        setFolders(foldersData);
        setStats(statsData);
      } catch (err) {
        console.error('Error loading GED data:', err);
        // Extract more details from Supabase error
        const errorMessage = err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null
            ? JSON.stringify(err)
            : 'Erreur de chargement';
        setError(`Erreur: ${errorMessage}. Vérifiez que vous êtes connecté et membre de cette copropriété.`);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [currentCoproId]);

  // ============================================================================
  // NORMALIZED DATA
  // ============================================================================

  const normalizedDocuments = useMemo(() => documents.map(normalizeDocument), [documents]);
  const normalizedFolders = useMemo(() => folders.map(normalizeFolder), [folders]);

  // Documents needing attention (expiring soon) - empty for now, could be fetched from v_documents_expiring
  const documentsNeedingAttention = useMemo(() => ({
    obsolete: [] as DocumentWithFolder[],
    overdue: [] as DocumentWithFolder[],
  }), []);

  // Current folder
  const currentFolder = useMemo(() => {
    return currentFolderId ? normalizedFolders.find((f) => f.id === currentFolderId) : null;
  }, [currentFolderId, normalizedFolders]);

  // Breadcrumb
  const breadcrumb = useMemo(() => {
    if (!currentFolderId) return [];

    const path: GEDFolder[] = [];
    let id: string | null = currentFolderId;
    while (id) {
      const folder = normalizedFolders.find((f) => f.id === id);
      if (folder) {
        path.unshift(folder);
        id = folder.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [currentFolderId, normalizedFolders]);

  // Sub-folders
  const subFolders = useMemo(() => {
    return normalizedFolders
      .filter((f) => f.parentId === currentFolderId)
      .sort((a, b) => a.ordre - b.ordre);
  }, [currentFolderId, normalizedFolders]);

  // Root folders
  const rootFolders = useMemo(() => {
    return normalizedFolders
      .filter((f) => !f.parentId)
      .sort((a, b) => a.ordre - b.ordre);
  }, [normalizedFolders]);

  // Documents in current folder
  const currentFolderDocuments = useMemo(() => {
    if (!currentFolderId) return [];
    return normalizedDocuments.filter((d) => d.dossierId === currentFolderId);
  }, [currentFolderId, normalizedDocuments]);

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  const getFilteredDocuments = useCallback(
    (searchQuery: string, filters: SearchFilters): DocumentWithRelevance[] => {
      let docs: DocumentWithRelevance[] = [];
      const hasFilters = hasActiveFilters(filters);

      if (navigationMode === 'search' || (searchQuery && searchQuery.length >= 2)) {
        docs = normalizedDocuments.map((doc) => ({
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
        docs = [...normalizedDocuments];
      }

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

      return filterAccessibleDocuments(docs);
    },
    [navigationMode, currentFolderId, currentFolderDocuments, normalizedDocuments, sortField, sortOrder, filterAccessibleDocuments]
  );

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

  // ============================================================================
  // NAVIGATION
  // ============================================================================

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

  // ============================================================================
  // DRAG AND DROP UPLOAD
  // ============================================================================

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);

      if (files.length === 0 || !currentCoproId) return;

      try {
        for (const file of files) {
          // Determine category based on folder
          const category: DocumentCategory = currentFolder?.icon === 'Users' ? 'pv_ag' :
            currentFolder?.icon === 'Receipt' ? 'facture' :
            currentFolder?.icon === 'FileSignature' ? 'contrat' : 'autre';

          await documentsApi.uploadDocument(file, currentCoproId, category, {
            folderId: currentFolderId || undefined,
            title: file.name,
          });
        }

        // Refresh documents
        const docsData = await documentsApi.getDocuments(currentCoproId);
        setDocuments(docsData);

        alert(`${files.length} fichier(s) importé(s) avec succès.`);
      } catch (err) {
        console.error('Upload error:', err);
        alert(`Erreur d'import: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    },
    [currentFolder, currentFolderId, currentCoproId]
  );

  const handleFilesSelected = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);

      if (files.length === 0 || !currentCoproId) return;

      try {
        for (const file of files) {
          // Determine category based on folder
          const category: DocumentCategory = currentFolder?.icon === 'Users' ? 'pv_ag' :
            currentFolder?.icon === 'Receipt' ? 'facture' :
            currentFolder?.icon === 'FileSignature' ? 'contrat' : 'autre';

          await documentsApi.uploadDocument(file, currentCoproId, category, {
            folderId: currentFolderId || undefined,
            title: file.name,
          });
        }

        // Refresh documents
        const docsData = await documentsApi.getDocuments(currentCoproId);
        setDocuments(docsData);

        alert(`${files.length} fichier(s) importé(s) avec succès dans Supabase !`);
      } catch (err) {
        console.error('Upload error:', err);
        alert(`Erreur d'import: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    },
    [currentFolder, currentFolderId, currentCoproId]
  );

  // ============================================================================
  // LINK MODAL
  // ============================================================================

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
    async (entityType: LinkedEntityType, entityId?: string) => {
      const module = getLinkableModule(entityType);

      if (module && selectedDocForLink) {
        try {
          await documentsApi.linkDocumentToEntity(
            selectedDocForLink.id,
            entityType,
            entityId || '',
            'related'
          );
          alert('Liaison créée avec succès.');
        } catch (err) {
          alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        }
        handleCloseLinkModal();
      }
    },
    [selectedDocForLink, handleCloseLinkModal]
  );

  // ============================================================================
  // PREVIEW
  // ============================================================================

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

  // ============================================================================
  // FOLDER CRUD
  // ============================================================================

  const refreshData = useCallback(async () => {
    if (!currentCoproId) return;
    try {
      const [docsData, foldersData, statsData] = await Promise.all([
        documentsApi.getDocuments(currentCoproId),
        documentsApi.getFolders(currentCoproId),
        documentsApi.getDocumentStats(currentCoproId),
      ]);
      setDocuments(docsData);
      setFolders(foldersData);
      setStats(statsData);
    } catch (err) {
      console.error('Error refreshing GED data:', err);
    }
  }, [currentCoproId]);

  const handleCreateFolder = useCallback(async (name: string, parentId?: string | null) => {
    if (!currentCoproId || !name.trim()) return;
    try {
      const maxOrder = normalizedFolders
        .filter(f => f.parentId === (parentId || null))
        .reduce((max, f) => Math.max(max, f.ordre), 0);

      await documentsApi.createFolder({
        copro_id: currentCoproId,
        name: name.trim(),
        parent_id: parentId || null,
        icon: 'Folder',
        color: '#2563eb',
        sort_order: maxOrder + 1,
        is_system: false,
      });
      await refreshData();
    } catch (err) {
      console.error('Error creating folder:', err);
      throw err;
    }
  }, [currentCoproId, normalizedFolders, refreshData]);

  const handleRenameFolder = useCallback(async (folderId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await documentsApi.updateFolder(folderId, { name: newName.trim() });
      await refreshData();
    } catch (err) {
      console.error('Error renaming folder:', err);
      throw err;
    }
  }, [refreshData]);

  const handleDeleteFolder = useCallback(async (folderId: string) => {
    try {
      await documentsApi.deleteFolder(folderId);
      await refreshData();
    } catch (err) {
      console.error('Error deleting folder:', err);
      throw err;
    }
  }, [refreshData]);

  const handleDeleteDocument = useCallback(async (docId: string) => {
    try {
      await documentsApi.deleteDocument(docId);
      await refreshData();
    } catch (err) {
      console.error('Error deleting document:', err);
      throw err;
    }
  }, [refreshData]);

  const handleMoveDocument = useCallback(async (docId: string, targetFolderId: string | null) => {
    try {
      await documentsApi.updateDocument(docId, { folder_id: targetFolderId || undefined });
      await refreshData();
    } catch (err) {
      console.error('Error moving document:', err);
      throw err;
    }
  }, [refreshData]);

  // ============================================================================
  // ACCESS RIGHTS
  // ============================================================================

  const handleOpenAccessRights = useCallback((doc: DocumentWithFolder) => {
    setSelectedDocForAccess(doc);
    setShowAccessRightsModal(true);
  }, []);

  const handleCloseAccessRights = useCallback(() => {
    setSelectedDocForAccess(null);
    setShowAccessRightsModal(false);
  }, []);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // UI State
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

    // Data
    documents: normalizedDocuments,
    folders: normalizedFolders,
    currentFolder,
    breadcrumb,
    subFolders,
    rootFolders,
    stats,

    // Loading state
    isLoading,
    error,
    isConnected: !!currentCoproId,

    // Methods
    getFilteredDocuments,
    getPaginatedDocuments,
    getTotalPages,
    navigateToFolder,
    handleModeChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFilesSelected,
    handleOpenLinkModal,
    handleCloseLinkModal,
    handleCreateLink,
    handlePreviewDocument,
    handleClosePreview,
    handleOpenAccessRights,
    handleCloseAccessRights,

    // CRUD
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleDeleteDocument,
    handleMoveDocument,
    refreshData,
  };
}
