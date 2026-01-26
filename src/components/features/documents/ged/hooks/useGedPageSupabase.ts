'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { useSupabase } from '@/hooks/useSupabase';
import { useGedPage as useGedPageData } from '@/hooks/modules/useDocumentsData';
import * as documentsApi from '@/lib/documents/api';
import type { Document, DocumentFolder, DocumentCategory } from '@/lib/documents/api';
import {
  MOCK_DOCUMENTS_GED,
  GED_FOLDERS,
  getFolderPath as getMockFolderPath,
  getSubFolders as getMockSubFolders,
  getDocumentsInFolder as getMockDocumentsInFolder,
  type DocumentWithFolder,
  type GEDFolder,
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
  DocumentWithRelevance,
  DetectedEntityType,
  LinkedEntityType,
  ExtractedDocumentData,
} from '../domain/types';
import { ITEMS_PER_PAGE } from '../domain/constants';
import { fuzzyMatch, calculateRelevanceScore, getCategoryLabel, hasActiveFilters } from '../domain/utils';

type UnifiedDocument = DocumentWithFolder | (Document & { relevanceScore?: number });
type UnifiedFolder = GEDFolder | DocumentFolder;

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
    dossierId: doc.folder_id,
    confidentialite: doc.confidentiality,
    coproprieteId: doc.copro_id,
    url: doc.file_path,
    annee: doc.year || new Date(doc.created_at).getFullYear(),
  } as DocumentWithFolder;
}

function normalizeFolder(folder: DocumentFolder): GEDFolder {
  return {
    id: folder.id,
    nom: folder.name,
    parentId: folder.parent_id,
    icon: folder.icon,
    color: folder.color,
    ordre: folder.sort_order,
  };
}

export function useGedPageSupabase() {
  const { currentCoproId, isManager } = useCopro();
  const { isConnected, isLoading: authLoading } = useSupabase();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('dateAjout');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('folders');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedDocForLink, setSelectedDocForLink] = useState<DocumentWithFolder | null>(null);
  const [detectedEntityType, setDetectedEntityType] = useState<DetectedEntityType | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedDocumentData>({});

  const [previewDocument, setPreviewDocument] = useState<DocumentWithFolder | null>(null);
  const [showVersioningAlerts, setShowVersioningAlerts] = useState(true);
  const [showAccessRightsModal, setShowAccessRightsModal] = useState(false);
  const [selectedDocForAccess, setSelectedDocForAccess] = useState<DocumentWithFolder | null>(null);

  const [supabaseDocuments, setSupabaseDocuments] = useState<Document[]>([]);
  const [supabaseFolders, setSupabaseFolders] = useState<DocumentFolder[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const { filterAccessibleDocuments, canManageAccess, logAccessAction } = useDocumentPermissions();

  const useSupabaseData = isConnected && currentCoproId && !authLoading;

  useEffect(() => {
    if (!useSupabaseData || !currentCoproId) return;

    const loadSupabaseData = async () => {
      setDataLoading(true);
      setDataError(null);

      try {
        const [docs, folders] = await Promise.all([
          documentsApi.getDocuments(currentCoproId),
          documentsApi.getFolders(currentCoproId),
        ]);

        setSupabaseDocuments(docs);
        setSupabaseFolders(folders);
      } catch (err) {
        setDataError(err instanceof Error ? err.message : 'Erreur de chargement');
        console.error('Error loading GED data:', err);
      } finally {
        setDataLoading(false);
      }
    };

    loadSupabaseData();
  }, [useSupabaseData, currentCoproId]);

  const normalizedDocuments = useMemo(() => {
    if (useSupabaseData && supabaseDocuments.length > 0) {
      return supabaseDocuments.map(normalizeDocument);
    }
    return MOCK_DOCUMENTS_GED;
  }, [useSupabaseData, supabaseDocuments]);

  const normalizedFolders = useMemo(() => {
    if (useSupabaseData && supabaseFolders.length > 0) {
      return supabaseFolders.map(normalizeFolder);
    }
    return GED_FOLDERS;
  }, [useSupabaseData, supabaseFolders]);

  const documentsNeedingAttention = useMemo(() => getDocumentsNeedingAttention(), []);

  const currentFolder = useMemo(() => {
    return currentFolderId ? normalizedFolders.find((f) => f.id === currentFolderId) : null;
  }, [currentFolderId, normalizedFolders]);

  const breadcrumb = useMemo(() => {
    if (!currentFolderId) return [];

    if (useSupabaseData) {
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
    }

    return getMockFolderPath(currentFolderId);
  }, [currentFolderId, useSupabaseData, normalizedFolders]);

  const subFolders = useMemo(() => {
    if (useSupabaseData) {
      return normalizedFolders
        .filter((f) => f.parentId === currentFolderId)
        .sort((a, b) => a.ordre - b.ordre);
    }
    return getMockSubFolders(currentFolderId);
  }, [currentFolderId, useSupabaseData, normalizedFolders]);

  const rootFolders = useMemo(() => {
    if (useSupabaseData) {
      return normalizedFolders
        .filter((f) => !f.parentId)
        .sort((a, b) => a.ordre - b.ordre);
    }
    return getMockSubFolders(null);
  }, [useSupabaseData, normalizedFolders]);

  const currentFolderDocuments = useMemo(() => {
    if (!currentFolderId) return [];

    if (useSupabaseData) {
      return normalizedDocuments.filter((d) => d.dossierId === currentFolderId);
    }

    return getMockDocumentsInFolder(currentFolderId);
  }, [currentFolderId, useSupabaseData, normalizedDocuments]);

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

      if (files.length === 0) return;

      if (useSupabaseData && currentCoproId) {
        try {
          for (const file of files) {
            const category: DocumentCategory = currentFolder?.icon === 'Users' ? 'pv_ag' :
              currentFolder?.icon === 'Receipt' ? 'facture' :
              currentFolder?.icon === 'FileSignature' ? 'contrat' : 'autre';

            await documentsApi.uploadDocument(file, currentCoproId, category, {
              folderId: currentFolderId || undefined,
              title: file.name,
            });
          }

          const docs = await documentsApi.getDocuments(currentCoproId);
          setSupabaseDocuments(docs);

          alert(`${files.length} fichier(s) importé(s) avec succès.`);
        } catch (err) {
          alert(`Erreur d'import: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        }
      } else {
        const folderName = currentFolder?.nom || 'Racine';
        alert(
          `${files.length} fichier(s) sélectionné(s) pour import dans "${folderName}".\n\nConnectez-vous pour activer l'upload Supabase.`
        );
      }
    },
    [currentFolder, currentFolderId, currentCoproId, useSupabaseData]
  );

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

      if (module && selectedDocForLink && useSupabaseData) {
        try {
          await documentsApi.linkDocumentToEntity(
            selectedDocForLink.id,
            entityType,
            entityId || '',
            'related'
          );
          alert(`Liaison créée avec succès.`);
        } catch (err) {
          alert(`Erreur: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        }
        handleCloseLinkModal();
      } else if (module && selectedDocForLink) {
        alert(
          `Liaison créée !\n\nDocument : ${selectedDocForLink.nom}\nType : ${module.label}\n${entityId ? `Entité : ${entityId}` : 'Nouvelle entité à créer'}\n\nCette fonctionnalité sera pleinement opérationnelle après connexion.`
        );
        handleCloseLinkModal();
      }
    },
    [selectedDocForLink, handleCloseLinkModal, useSupabaseData]
  );

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

  const handleOpenAccessRights = useCallback((doc: DocumentWithFolder) => {
    setSelectedDocForAccess(doc);
    setShowAccessRightsModal(true);
  }, []);

  const handleCloseAccessRights = useCallback(() => {
    setSelectedDocForAccess(null);
    setShowAccessRightsModal(false);
  }, []);

  return {
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

    showLinkModal,
    selectedDocForLink,
    detectedEntityType,
    extractedData,

    previewDocument,

    showVersioningAlerts,
    setShowVersioningAlerts,
    documentsNeedingAttention,

    showAccessRightsModal,
    selectedDocForAccess,
    canManageAccess,

    currentFolder,
    breadcrumb,
    subFolders,
    rootFolders,

    isLoading: dataLoading || authLoading,
    error: dataError,
    isConnected: useSupabaseData,

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
