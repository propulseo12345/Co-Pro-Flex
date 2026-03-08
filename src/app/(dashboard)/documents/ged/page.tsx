'use client';

import { useMemo, useCallback } from 'react';
import { FileText, ArrowLeft, Database, WifiOff } from 'lucide-react';
import DocumentViewerModal from '@/components/ui/DocumentViewerModal/DocumentViewerModal';
import { AccessRightsManager } from '@/components/features/documents/AccessRightsManager';
import { NiveauConfidentialite } from '@/types/enums';
import { useGedPageSupabase, useDocumentSearch } from '@/components/features/documents/ged/hooks';
import { LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import {
  Header, Checklist, VersioningAlerts, SearchBar, AdvancedFilters, ModeSwitch,
  DropZone, Breadcrumb, Toolbar, ActiveFilters, FolderGrid, SearchResults,
  DocumentGrid, DocumentList, Pagination, EmptyState, LinkModal,
  TechnicalDocumentsSection,
} from '@/components/features/documents/ged/components';
import type { SearchSuggestion } from '@/components/features/documents/ged/domain/types';
import styles from './ged.module.css';

export default function GEDPage() {
  const {
    viewMode, setViewMode, sortField, setSortField, sortOrder, setSortOrder,
    currentPage, setCurrentPage, isDragOver, showChecklist, setShowChecklist,
    navigationMode, setNavigationMode, currentFolderId,
    showLinkModal, selectedDocForLink, detectedEntityType, extractedData,
    previewDocument, showVersioningAlerts, setShowVersioningAlerts, documentsNeedingAttention,
    showAccessRightsModal, selectedDocForAccess, canManageAccess,
    documents, folders, currentFolder, breadcrumb, subFolders, rootFolders, stats,
    isLoading, error, isConnected,
    getFilteredDocuments, getPaginatedDocuments, getTotalPages, navigateToFolder, handleModeChange,
    handleDragOver, handleDragLeave, handleDrop, handleFilesSelected, handleOpenLinkModal, handleCloseLinkModal, handleCreateLink,
    handlePreviewDocument, handleClosePreview, handleOpenAccessRights, handleCloseAccessRights,
  } = useGedPageSupabase();

  const {
    searchQuery, setSearchQuery, showSearchDropdown, setShowSearchDropdown,
    showAdvancedFilters, setShowAdvancedFilters, filters, setFilters,
    searchHistory, setIsSearchFocused, searchSuggestions, activeFilters,
    saveToHistory, removeFromHistory, handleClearFilters, handleCategoryFilter, handleFileTypeFilter,
    updateDateFrom, updateDateTo, updateSizeMin, updateSizeMax,
  } = useDocumentSearch({ documents, folders });

  const filteredDocuments = useMemo(() => getFilteredDocuments(searchQuery, filters), [getFilteredDocuments, searchQuery, filters]);
  const paginatedDocuments = useMemo(() => getPaginatedDocuments(filteredDocuments), [getPaginatedDocuments, filteredDocuments]);
  const totalPages = getTotalPages(filteredDocuments.length);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    if (query.length >= 2) { setNavigationMode('search'); setSortField('pertinence'); }
  }, [setSearchQuery, setCurrentPage, setNavigationMode, setSortField]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) { saveToHistory(searchQuery.trim()); setShowSearchDropdown(false); }
  }, [searchQuery, saveToHistory, setShowSearchDropdown]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    if (navigationMode === 'search') { setNavigationMode('folders'); setSortField('dateAjout'); }
  }, [setSearchQuery, navigationMode, setNavigationMode, setSortField]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'category') { setFilters((prev) => ({ ...prev, categories: [suggestion.value] })); setNavigationMode('search'); }
    else if (suggestion.type === 'folder') { navigateToFolder(suggestion.value); }
    else { setSearchQuery(suggestion.label); saveToHistory(suggestion.label); }
    setShowSearchDropdown(false);
  }, [setFilters, setNavigationMode, navigateToFolder, setSearchQuery, saveToHistory, setShowSearchDropdown]);

  const handleHistoryClick = useCallback((query: string) => {
    setSearchQuery(query); setNavigationMode('search'); setSortField('pertinence'); setShowSearchDropdown(false); setCurrentPage(1);
  }, [setSearchQuery, setNavigationMode, setSortField, setShowSearchDropdown, setCurrentPage]);

  const isSearchMode = navigationMode === 'search' && searchQuery;
  const showDocuments = navigationMode === 'all' || navigationMode === 'search' || (navigationMode === 'folders' && currentFolderId);

  if (isLoading) {
    return (
      <div className="container">
        <Header showChecklist={showChecklist} onChecklistToggle={() => setShowChecklist(!showChecklist)} stats={null} rootFolderCount={0} />
        <LoadingState message="Chargement des documents..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <Header showChecklist={showChecklist} onChecklistToggle={() => setShowChecklist(!showChecklist)} stats={null} rootFolderCount={0} />
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="container">
      <Header showChecklist={showChecklist} onChecklistToggle={() => setShowChecklist(!showChecklist)} stats={stats} rootFolderCount={rootFolders.length} />

      {isConnected ? (
        <div className={styles.connectionBadge} data-connected="true">
          <Database size={14} /> Connecté à Supabase
        </div>
      ) : (
        <div className={styles.connectionBadge} data-connected="false">
          <WifiOff size={14} /> Mode démonstration (données fictives)
        </div>
      )}
      {showChecklist && <Checklist />}

      {showVersioningAlerts && (documentsNeedingAttention.obsolete.length > 0 || documentsNeedingAttention.overdue.length > 0) && (
        <VersioningAlerts
          obsoleteCount={documentsNeedingAttention.obsolete.length}
          overdueCount={documentsNeedingAttention.overdue.length}
          onClose={() => setShowVersioningAlerts(false)}
          onViewObsolete={() => { setFilters((prev) => ({ ...prev, categories: ['REGLEMENT'] })); setNavigationMode('search'); }}
          onViewOverdue={() => { setFilters((prev) => ({ ...prev, categories: ['REGLEMENT', 'CONTRAT'] })); setNavigationMode('search'); }}
        />
      )}

      <SearchBar
        searchQuery={searchQuery} showDropdown={showSearchDropdown} searchHistory={searchHistory}
        suggestions={searchSuggestions} hasActiveFilters={activeFilters} showAdvancedFilters={showAdvancedFilters}
        onSearchChange={handleSearch} onSearchSubmit={handleSearchSubmit} onClearSearch={handleClearSearch}
        onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
        onFocus={() => { setIsSearchFocused(true); setShowSearchDropdown(true); }}
        onBlur={() => setIsSearchFocused(false)} onHistoryClick={handleHistoryClick}
        onRemoveFromHistory={removeFromHistory} onSuggestionClick={handleSuggestionClick}
        onDropdownClose={() => setShowSearchDropdown(false)}
      />

      {showAdvancedFilters && (
        <AdvancedFilters filters={filters} hasActiveFilters={activeFilters} onCategoryFilter={handleCategoryFilter}
          onFileTypeFilter={handleFileTypeFilter} onDateFromChange={updateDateFrom} onDateToChange={updateDateTo}
          onSizeMinChange={updateSizeMin} onSizeMaxChange={updateSizeMax} onClearFilters={handleClearFilters} />
      )}

      {isSearchMode ? (
        <SearchResults count={filteredDocuments.length} query={searchQuery} onClear={handleClearSearch} />
      ) : (
        <>
          <ModeSwitch navigationMode={navigationMode} onModeChange={handleModeChange} />
          <DropZone isDragOver={isDragOver} currentFolder={currentFolder ?? null} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} onFilesSelected={handleFilesSelected} />
        </>
      )}

      <div className="card">
        {navigationMode === 'folders' && <Breadcrumb currentFolderId={currentFolderId} breadcrumb={breadcrumb} onNavigate={navigateToFolder} />}

        <Toolbar sortField={sortField} sortOrder={sortOrder} viewMode={viewMode} hasSearchQuery={!!searchQuery}
          onSortFieldChange={(field) => { setSortField(field); if (field !== 'pertinence') setSortOrder('desc'); }}
          onSortOrderToggle={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))} onViewModeChange={setViewMode} />

        <ActiveFilters filters={filters} onCategoryRemove={handleCategoryFilter}
          onDateFromClear={() => setFilters((prev) => ({ ...prev, dateFrom: '' }))}
          onDateToClear={() => setFilters((prev) => ({ ...prev, dateTo: '' }))} onClearAll={handleClearFilters} />

        {navigationMode === 'folders' && subFolders.length > 0 && (
          <FolderGrid folders={subFolders} title={`Dossiers (${subFolders.length})`} onFolderClick={navigateToFolder} />
        )}
        {navigationMode === 'folders' && !currentFolderId && (
          <FolderGrid folders={rootFolders} title="Arborescence documentaire" icon="tree" onFolderClick={navigateToFolder} />
        )}

        {showDocuments && (
          <>
            {navigationMode === 'folders' && currentFolderId && (
              <button className={styles.backButton} onClick={() => navigateToFolder(currentFolder?.parentId || null)}>
                <ArrowLeft size={16} aria-hidden="true" /> Retour
              </button>
            )}
            {navigationMode !== 'search' && filteredDocuments.length > 0 && (
              <div className={styles.sectionTitle}><FileText size={18} aria-hidden="true" /> Documents ({filteredDocuments.length})</div>
            )}
            {paginatedDocuments.length > 0 && (viewMode === 'grid' ? (
              <DocumentGrid documents={paginatedDocuments} canManageAccess={canManageAccess} onPreview={handlePreviewDocument} onLink={handleOpenLinkModal} onAccessRights={handleOpenAccessRights} />
            ) : (
              <DocumentList documents={paginatedDocuments} canManageAccess={canManageAccess} onPreview={handlePreviewDocument} onLink={handleOpenLinkModal} onAccessRights={handleOpenAccessRights} />
            ))}
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}

        {filteredDocuments.length === 0 && (navigationMode === 'search' || navigationMode === 'all' || (navigationMode === 'folders' && currentFolderId && subFolders.length === 0)) && (
          <EmptyState isSearch={navigationMode === 'search'} />
        )}
      </div>

      <TechnicalDocumentsSection />

      {showLinkModal && selectedDocForLink && (
        <LinkModal document={selectedDocForLink} detectedEntityType={detectedEntityType} extractedData={extractedData} onClose={handleCloseLinkModal} onCreateLink={handleCreateLink} />
      )}
      {previewDocument && (
        <DocumentViewerModal
          document={{ id: previewDocument.id, nom: previewDocument.nom, type: previewDocument.type as 'PDF' | 'IMAGE' | 'AUTRE', categorie: previewDocument.categorie, dateAjout: previewDocument.dateAjout, taille: previewDocument.taille, dossierId: previewDocument.dossierId || undefined, filePath: previewDocument.url }}
          onClose={handleClosePreview}
          folders={folders}
        />
      )}
      {showAccessRightsModal && selectedDocForAccess && (
        <AccessRightsManager documentId={selectedDocForAccess.id} documentName={selectedDocForAccess.nom} currentConfidentiality={selectedDocForAccess.confidentialite || NiveauConfidentialite.PUBLIC} onClose={handleCloseAccessRights} />
      )}
    </div>
  );
}
