/**
 * Hook Documents / GED - NIVEAU 6C
 * Gère les données documents avec Supabase
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import * as documentsApi from '@/lib/documents/api';
import type {
  Document,
  DocumentFolder,
  DocumentCategory,
  DocumentStats,
  DocumentsByCategory,
  DocumentConfidentiality,
} from '@/lib/documents/api';

// ============================================================================
// TYPES
// ============================================================================

export type SortField = 'file_name' | 'created_at' | 'file_size' | 'category';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'grid' | 'list';
export type NavigationMode = 'folders' | 'all' | 'search';

export interface DocumentFilters {
  categories: DocumentCategory[];
  dateFrom: string;
  dateTo: string;
  sizeMin: string;
  sizeMax: string;
  confidentiality?: DocumentConfidentiality;
}

// ============================================================================
// HOOK: useDocuments
// ============================================================================

export function useDocuments(coproId: string | null) {
  const { isConnected } = useSupabase();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async (options?: Parameters<typeof documentsApi.getDocuments>[1]) => {
    if (!coproId || !isConnected) return;

    setLoading(true);
    setError(null);

    try {
      const data = await documentsApi.getDocuments(coproId, options);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  }, [coproId, isConnected]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const searchDocuments = useCallback(async (query: string) => {
    if (!coproId || !query) return;

    setLoading(true);
    try {
      const data = await documentsApi.searchDocuments(coproId, query);
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de recherche');
    } finally {
      setLoading(false);
    }
  }, [coproId]);

  const uploadDocument = useCallback(async (
    file: File,
    category: DocumentCategory,
    options?: Parameters<typeof documentsApi.uploadDocument>[3]
  ) => {
    if (!coproId) throw new Error('Copro ID requis');

    const doc = await documentsApi.uploadDocument(file, coproId, category, options);
    setDocuments(prev => [doc, ...prev]);
    return doc;
  }, [coproId]);

  const archiveDocument = useCallback(async (id: string) => {
    const updated = await documentsApi.archiveDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    return updated;
  }, []);

  const deleteDocument = useCallback(async (id: string) => {
    await documentsApi.deleteDocument(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    searchDocuments,
    uploadDocument,
    archiveDocument,
    deleteDocument,
    refetch: fetchDocuments,
  };
}

// ============================================================================
// HOOK: useFolders
// ============================================================================

export function useFolders(coproId: string | null) {
  const { isConnected } = useSupabase();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = useCallback(async () => {
    if (!coproId || !isConnected) return;

    setLoading(true);
    setError(null);

    try {
      const data = await documentsApi.getFolders(coproId);
      setFolders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [coproId, isConnected]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  const rootFolders = useMemo(() =>
    folders.filter(f => !f.parent_id).sort((a, b) => a.sort_order - b.sort_order),
    [folders]
  );

  const getSubFolders = useCallback((parentId: string | null) =>
    folders.filter(f => f.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order),
    [folders]
  );

  const getFolderById = useCallback((id: string) =>
    folders.find(f => f.id === id),
    [folders]
  );

  const createFolder = useCallback(async (folder: Partial<DocumentFolder>) => {
    const created = await documentsApi.createFolder({ ...folder, copro_id: coproId! });
    setFolders(prev => [...prev, created]);
    return created;
  }, [coproId]);

  const updateFolder = useCallback(async (id: string, updates: Partial<DocumentFolder>) => {
    const updated = await documentsApi.updateFolder(id, updates);
    setFolders(prev => prev.map(f => f.id === id ? updated : f));
    return updated;
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await documentsApi.deleteFolder(id);
    setFolders(prev => prev.filter(f => f.id !== id));
  }, []);

  return {
    folders,
    rootFolders,
    loading,
    error,
    getSubFolders,
    getFolderById,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: fetchFolders,
  };
}

// ============================================================================
// HOOK: useDocumentStats
// ============================================================================

export function useDocumentStats(coproId: string | null) {
  const { isConnected } = useSupabase();
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [byCategory, setByCategory] = useState<DocumentsByCategory[]>([]);
  const [expiring, setExpiring] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!coproId || !isConnected) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        const [statsData, categoryData, expiringData] = await Promise.all([
          documentsApi.getDocumentStats(coproId),
          documentsApi.getDocumentsByCategory(coproId),
          documentsApi.getExpiringDocuments(coproId),
        ]);
        setStats(statsData);
        setByCategory(categoryData);
        setExpiring(expiringData);
      } catch (err) {
        console.error('Error fetching document stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [coproId, isConnected]);

  return { stats, byCategory, expiring, loading };
}

// ============================================================================
// HOOK: useGedPage (Principal - pour la page GED)
// ============================================================================

export function useGedPage(coproId: string | null) {
  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [navigationMode, setNavigationMode] = useState<NavigationMode>('folders');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filters
  const [filters, setFilters] = useState<DocumentFilters>({
    categories: [],
    dateFrom: '',
    dateTo: '',
    sizeMin: '',
    sizeMax: '',
  });

  // Data hooks
  const { documents, loading: docsLoading, fetchDocuments, uploadDocument, archiveDocument, deleteDocument } = useDocuments(coproId);
  const { folders, rootFolders, getSubFolders, getFolderById } = useFolders(coproId);
  const { stats, expiring } = useDocumentStats(coproId);

  // Current folder
  const currentFolder = useMemo(() =>
    currentFolderId ? getFolderById(currentFolderId) : null,
    [currentFolderId, getFolderById]
  );

  // Breadcrumb
  const [breadcrumb, setBreadcrumb] = useState<DocumentFolder[]>([]);
  useEffect(() => {
    if (!currentFolderId) {
      setBreadcrumb([]);
      return;
    }

    const buildPath = async () => {
      const path = await documentsApi.getFolderPath(currentFolderId);
      setBreadcrumb(path);
    };
    buildPath();
  }, [currentFolderId]);

  // Sub folders
  const subFolders = useMemo(() =>
    getSubFolders(currentFolderId),
    [currentFolderId, getSubFolders]
  );

  // Filter documents
  const filteredDocuments = useMemo(() => {
    let docs = [...documents];

    // Filter by folder if in folder mode
    if (navigationMode === 'folders' && currentFolderId) {
      docs = docs.filter(d => d.folder_id === currentFolderId);
    }

    // Apply filters
    if (filters.categories.length > 0) {
      docs = docs.filter(d => d.category && filters.categories.includes(d.category));
    }
    if (filters.dateFrom) {
      docs = docs.filter(d => d.created_at >= filters.dateFrom);
    }
    if (filters.dateTo) {
      docs = docs.filter(d => d.created_at <= filters.dateTo);
    }
    if (filters.sizeMin) {
      const min = parseFloat(filters.sizeMin) * 1024 * 1024;
      docs = docs.filter(d => (d.file_size || 0) >= min);
    }
    if (filters.sizeMax) {
      const max = parseFloat(filters.sizeMax) * 1024 * 1024;
      docs = docs.filter(d => (d.file_size || 0) <= max);
    }

    // Sort
    docs.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'file_name':
          comparison = a.file_name.localeCompare(b.file_name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'file_size':
          comparison = (a.file_size || 0) - (b.file_size || 0);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return docs;
  }, [documents, navigationMode, currentFolderId, filters, sortField, sortOrder]);

  // Pagination
  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDocuments, currentPage]);

  // Navigation
  const navigateToFolder = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setNavigationMode('folders');
    setCurrentPage(1);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      setNavigationMode('search');
      await fetchDocuments({ search: query });
    } else if (navigationMode === 'search') {
      setNavigationMode('folders');
      await fetchDocuments({ folderId: currentFolderId || undefined });
    }
    setCurrentPage(1);
  }, [fetchDocuments, currentFolderId, navigationMode]);

  const clearFilters = useCallback(() => {
    setFilters({
      categories: [],
      dateFrom: '',
      dateTo: '',
      sizeMin: '',
      sizeMax: '',
    });
  }, []);

  // Document actions
  const handleUpload = useCallback(async (
    file: File,
    category: DocumentCategory,
    options?: { title?: string; description?: string; tags?: string[] }
  ) => {
    return uploadDocument(file, category, {
      ...options,
      folderId: currentFolderId || undefined,
    });
  }, [uploadDocument, currentFolderId]);

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
    navigationMode,
    setNavigationMode,
    currentFolderId,
    searchQuery,
    filters,
    setFilters,

    // Data
    documents: paginatedDocuments,
    allDocuments: filteredDocuments,
    folders,
    rootFolders,
    subFolders,
    currentFolder,
    breadcrumb,
    stats,
    expiring,

    // Computed
    loading: docsLoading,
    totalPages,
    totalDocuments: filteredDocuments.length,

    // Actions
    navigateToFolder,
    handleSearch,
    clearFilters,
    uploadDocument: handleUpload,
    archiveDocument,
    deleteDocument,
    getDocumentUrl: documentsApi.getDocumentUrl,
    downloadDocument: documentsApi.downloadDocument,
  };
}

// ============================================================================
// HOOK: useDocumentVersions
// ============================================================================

export function useDocumentVersions(documentId: string | null) {
  const [versions, setVersions] = useState<documentsApi.DocumentVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    const fetchVersions = async () => {
      setLoading(true);
      try {
        const data = await documentsApi.getDocumentVersions(documentId);
        setVersions(data);
      } catch (err) {
        console.error('Error fetching versions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVersions();
  }, [documentId]);

  return { versions, loading };
}

// Re-export types
export type { Document, DocumentFolder, DocumentCategory, DocumentStats, DocumentConfidentiality };
