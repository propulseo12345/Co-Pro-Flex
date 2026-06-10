'use client';

import Link from 'next/link';
import {
  Search, ArrowLeft, Plus, X, Filter, ChevronDown, ChevronUp,
  SlidersHorizontal, ChevronLeft, ChevronRight, RotateCcw, FileText,
  AlertCircle,
} from 'lucide-react';
import type { SortOption } from '@/hooks/modules/useResolutionLibrary';
import { CustomResolutionEditor } from '@/components/features/ag/CustomResolutionEditor';
import { useAgResolutionsPage } from '@/features/ag/hooks/useAgResolutionsPage';
import {
  ResolutionCard,
  CustomResolutionCard,
  ResolutionsFilters,
  AddToAGModal,
} from '@/features/ag/components/resolutions';
import styles from './resolutions.module.css';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'popular', label: 'Plus utilisées' },
  { value: 'alphabetical', label: 'Alphabétique' },
  { value: 'category', label: 'Par catégorie' },
  { value: 'recent', label: 'Récentes' },
];

export default function ResolutionsCatalogPage() {
  const page = useAgResolutionsPage();

  return (
    <div className="container">
      <Link href="/ag/dashboard" className={styles.backLink}>
        <ArrowLeft size={16} aria-hidden="true" /> Retour au tableau de bord
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Bibliothèque de résolutions</h1>
          <p className={styles.subtitle}>
            {page.totalCount} modèles pré-rédigés conformes à la législation française
          </p>
        </div>
        <button onClick={page.handleOpenEditor} className="btn btn-primary">
          <Plus size={16} aria-hidden="true" />
          Créer un modèle
        </button>
      </div>

      <div className={styles.searchBar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <input
            type="text"
            placeholder="Rechercher par titre, texte, tags..."
            className={styles.searchInput}
            value={page.filters.query}
            onChange={(e) => page.search(e.target.value)}
          />
          {page.filters.query && (
            <button className={styles.clearSearch} onClick={() => page.search('')} aria-label="Effacer">
              <X size={16} />
            </button>
          )}
        </div>

        <div className={styles.searchActions}>
          <div className={styles.sortWrapper}>
            <SlidersHorizontal size={16} />
            <select
              value={page.sortBy}
              onChange={(e) => page.setSortBy(e.target.value as SortOption)}
              className={styles.sortSelect}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <button
            className={`${styles.filterToggle} ${page.showFilters ? styles.filterToggleActive : ''}`}
            onClick={() => page.setShowFilters(!page.showFilters)}
          >
            <Filter size={16} />
            Filtres
            {page.activeFiltersCount > 0 && (
              <span className={styles.filterBadge}>{page.activeFiltersCount}</span>
            )}
          </button>

          {page.isFiltered && (
            <button className={styles.resetButton} onClick={page.resetFilters} title="Réinitialiser">
              <RotateCcw size={16} />
            </button>
          )}
        </div>
      </div>

      {page.showFilters && (
        <ResolutionsFilters
          filters={page.filters}
          categories={page.categories}
          allTags={page.allTags}
          onToggleCategory={page.toggleCategoryFilter}
          onToggleAgType={page.toggleAgTypeFilter}
          onToggleMajorite={page.toggleMajoriteFilter}
          onToggleTag={page.toggleTagFilter}
          onSetObligatoireOnly={(v) => page.setFilters({ obligatoireOnly: v })}
        />
      )}

      <div className={styles.stats}>
        <span>
          {page.isFiltered ? (
            <><strong>{page.filteredCount}</strong> résolution{page.filteredCount > 1 ? 's' : ''} trouvée{page.filteredCount > 1 ? 's' : ''} sur {page.totalCount}</>
          ) : (
            <><strong>{page.totalCount}</strong> résolutions disponibles</>
          )}
        </span>
        {page.customResolutions.length > 0 && (
          <>
            <span className={styles.statsDivider}>•</span>
            <span className={styles.statsCustom}>
              {page.customResolutions.length} personnalisée{page.customResolutions.length > 1 ? 's' : ''}
            </span>
          </>
        )}
      </div>

      {page.customResolutions.length > 0 && !page.isFiltered && (
        <div className={styles.categorySection}>
          <div className={styles.categoryHeader} onClick={() => page.toggleCategoryExpanded('__custom__')}>
            <h2 className={styles.categoryTitle}>
              <span className={styles.customIndicator}>Mes modèles personnalisés</span>
            </h2>
            <div className={styles.categoryMeta}>
              <span className={styles.categoryCount}>{page.customResolutions.length}</span>
              {page.expandedCategories.has('__custom__') ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </div>
          </div>
          {!page.expandedCategories.has('__custom__') && (
            <div className={styles.grid}>
              {page.customResolutions.map(res => (
                <CustomResolutionCard
                  key={res.id}
                  resolution={res}
                  copiedId={page.copiedId}
                  onCopy={page.handleCopy}
                  onEdit={page.handleEditResolution}
                  onDelete={page.handleDeleteResolution}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Garde cabinet absent */}
      {!page.cabinetId && (
        <div className={styles.stats}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>Aucun cabinet associé à votre compte — la création de modèles est désactivée.</span>
        </div>
      )}

      {page.sortBy === 'category' ? (
        Object.entries(page.groupedResolutions).map(([category, categoryResolutions]) => (
          <div key={category} className={styles.categorySection}>
            <div className={styles.categoryHeader} onClick={() => page.toggleCategoryExpanded(category)}>
              <h2 className={styles.categoryTitle}>{category}</h2>
              <div className={styles.categoryMeta}>
                <span className={styles.categoryCount}>{categoryResolutions.length}</span>
                {page.expandedCategories.has(category) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>
            {!page.expandedCategories.has(category) && (
              <div className={styles.grid}>
                {categoryResolutions.map(res => (
                  <ResolutionCard
                    key={res.id}
                    resolution={res}
                    copiedId={page.copiedId}
                    onCopy={page.handleCopy}
                    onAddToAG={page.handleOpenAddToAG}
                    hasAvailableAGs={page.availableAGs.length > 0}
                    onDuplicate={page.cabinetId ? (id) => { void page.handleDuplicateResolution(id); } : undefined}
                    onEdit={page.handleEditResolution}
                    onDelete={page.cabinetId ? (id) => { void page.handleDeleteResolution(id); } : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        page.hasResults && (
          <div className={styles.grid}>
            {page.resolutions.map(res => (
              <ResolutionCard
                key={res.id}
                resolution={res}
                copiedId={page.copiedId}
                onCopy={page.handleCopy}
                onAddToAG={page.handleOpenAddToAG}
                hasAvailableAGs={page.availableAGs.length > 0}
                onDuplicate={page.cabinetId ? (id) => { void page.handleDuplicateResolution(id); } : undefined}
                onEdit={page.handleEditResolution}
                onDelete={page.cabinetId ? (id) => { void page.handleDeleteResolution(id); } : undefined}
              />
            ))}
          </div>
        )
      )}

      {!page.hasResults && (
        <div className={styles.emptyState}>
          <FileText size={48} aria-hidden="true" />
          <p>Aucune résolution trouvée</p>
          {page.isFiltered && (
            <button className="btn btn-secondary" onClick={page.resetFilters}>
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {page.totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.paginationBtn} onClick={page.prevPage} disabled={page.page === 1}>
            <ChevronLeft size={18} /> Précédent
          </button>
          <div className={styles.paginationInfo}>
            Page <strong>{page.page}</strong> sur <strong>{page.totalPages}</strong>
          </div>
          <button className={styles.paginationBtn} onClick={page.nextPage} disabled={page.page === page.totalPages}>
            Suivant <ChevronRight size={18} />
          </button>
        </div>
      )}

      {page.showEditorModal && (
        <div className={styles.modalOverlay} onClick={page.closeEditorModal}>
          <div className={styles.editorModalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* Erreur éditeur (refus silencieux corrigé) */}
            {page.editorError && (
              <div className={styles.errorBanner}>
                <AlertCircle size={16} aria-hidden="true" />
                <span>{page.editorError}</span>
              </div>
            )}
            <CustomResolutionEditor
              resolution={page.editingResolution}
              onSave={page.handleSaveResolution}
              onCancel={page.closeEditorModal}
            />
          </div>
        </div>
      )}

      {page.showAddToAGModal && page.selectedResolutionForAG && (
        <AddToAGModal
          resolution={page.selectedResolutionForAG}
          availableAGs={page.availableAGs}
          addedToAGId={page.addedToAGId}
          onAddToAG={page.handleAddToAG}
          onClose={page.closeAddToAGModal}
        />
      )}
    </div>
  );
}
