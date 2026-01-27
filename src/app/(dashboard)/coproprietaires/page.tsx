'use client';

import { Search, ChevronDown, Edit, Trash2, RefreshCw } from 'lucide-react';
import { useCoproprietairesPage } from '@/hooks/modules/useCoproprietairesPage';
import { CoproprietairesTable, CoproprietaireEditModal } from '@/components/features/coproprietaires';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import styles from './coproprietaires.module.css';

export default function CoproprietairesPage() {
  const { currentCoproId } = useCopro();
  const {
    activeTab, handleTabChange, searchQuery, setSearchQuery, filteredData,
    openMenuId, setOpenMenuId, menuPosition, menuRef, buttonRefs,
    editingCopro, setEditingCopro, editForm, setEditForm,
    handleEdit, handleSave, handleDelete, getDataForTab,
    isLoading, error, refresh, isSaving,
  } = useCoproprietairesPage();

  // Mode Single Copro: si pas encore chargé, afficher loading
  if (!currentCoproId) {
    return (
      <div className="container">
        <div className={styles.header}><h1 className={styles.title}>Mes copropriétaires</h1></div>
        <LoadingState message="Chargement de la copropriété..." />
      </div>
    );
  }

  return (
    <div className="container">
      <div className={styles.header}>
        <h1 className={styles.title}>Mes copropriétaires</h1>
        <button
          className="btn btn-secondary"
          onClick={() => refresh()}
          disabled={isLoading}
          title="Rafraîchir"
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ''} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'COPROPRIETAIRE' ? styles.tabActive : ''}`} onClick={() => handleTabChange('COPROPRIETAIRE')}>Copropriétaires</button>
        <button className={`${styles.tab} ${activeTab === 'LOCATAIRE' ? styles.tabActive : ''}`} onClick={() => handleTabChange('LOCATAIRE')}>Locataires</button>
        <button className={`${styles.tab} ${activeTab === 'ANCIEN' ? styles.tabActive : ''}`} onClick={() => handleTabChange('ANCIEN')}>Anciens copropriétaires</button>
      </div>

      <div className={styles.actionsBar}>
        <div className={styles.searchContainer}>
          <Search size={18} className={styles.searchIcon} aria-hidden="true" />
          <input type="text" placeholder="Rechercher" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={styles.searchInput} />
          {searchQuery && <button onClick={() => setSearchQuery('')} className={styles.clearButton} aria-label="Effacer la recherche">×</button>}
        </div>
        <div className={styles.actionButtons}>
          <button className="btn btn-secondary">Plus d'actions<ChevronDown size={16} aria-hidden="true" /></button>
          <button className="btn btn-primary">Charges récupérables</button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <LoadingState message="Chargement des copropriétaires..." />}

      {/* Error state */}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}

      {/* Empty state */}
      {!isLoading && !error && filteredData.length === 0 && (
        <EmptyState
          title={activeTab === 'LOCATAIRE' ? 'Aucun locataire' : `Aucun ${activeTab === 'ANCIEN' ? 'ancien copropriétaire' : 'copropriétaire'}`}
          message={
            activeTab === 'LOCATAIRE'
              ? 'La gestion des locataires sera disponible prochainement.'
              : searchQuery
              ? 'Aucun résultat pour votre recherche.'
              : 'Aucun copropriétaire trouvé pour cette copropriété.'
          }
        />
      )}

      {/* Data table */}
      {!isLoading && !error && filteredData.length > 0 && (
        <CoproprietairesTable data={filteredData} buttonRefs={buttonRefs} openMenuId={openMenuId} onToggleMenu={setOpenMenuId} />
      )}

      {openMenuId && menuPosition && (
        <div ref={menuRef} className={styles.actionMenu} style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}>
          {(() => {
            const copro = getDataForTab().find(c => c.id === openMenuId);
            if (!copro) return null;
            return (
              <>
                <button className={styles.actionMenuItem} onClick={() => handleEdit(copro)}><Edit size={16} aria-hidden="true" />Modifier</button>
                <button className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`} onClick={() => handleDelete(copro.id)}><Trash2 size={16} aria-hidden="true" />Archiver</button>
              </>
            );
          })()}
        </div>
      )}

      <CoproprietaireEditModal
        copro={editingCopro}
        form={editForm}
        onFormChange={setEditForm}
        onClose={() => setEditingCopro(null)}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
