'use client';

import { Search, ChevronDown, Edit, Trash2, RefreshCw, Plus } from 'lucide-react';
import { useCoproprietairesPage } from '@/hooks/modules/useCoproprietairesPage';
import { CoproprietairesTable, CoproprietaireEditModal } from '@/components/features/coproprietaires';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import styles from './coproprietaires.module.css';

export default function CoproprietairesPage() {
  const { currentCoproId, error: coproError, refreshCopros } = useCopro();
  const {
    activeTab, handleTabChange, searchQuery, setSearchQuery, filteredData,
    openMenuId, setOpenMenuId, menuPosition, menuRef, buttonRefs,
    editingCopro, isCreating, editForm, setEditForm,
    handleEdit, handleCreateNew, handleCloseModal, handleSave, handleDelete, getDataForTab,
    isLoading, error, refresh, isSaving,
  } = useCoproprietairesPage();

  if (!currentCoproId) {
    // L'erreur du contexte copro doit s'afficher, pas tourner en spinner muet.
    return coproError
      ? <ErrorState message={coproError} onRetry={refreshCopros} />
      : <LoadingState message="Chargement de la copropriété..." />;
  }

  // KPI calculations
  const allCopros = getDataForTab();
  const totalCopros = allCopros.length;
  const soldeGlobal = allCopros.reduce((s, c) => s + c.solde, 0);
  const nbImpayes = allCopros.filter(c => c.solde < 0).length;

  return (
    <div className="container">
      {/* TopBar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Copropriétaires</h1>
          <p>Annuaire et suivi des copropriétaires</p>
        </div>
        <div className={styles.topBarActions}>
          <button className="btn btn-primary" onClick={handleCreateNew}>
            <Plus size={16} aria-hidden="true" /> Nouveau copropriétaire
          </button>
          <button className={styles.refreshBtn} onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Copropriétaires</span>
          <span className={styles.kpiValue}>{totalCopros}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Solde global</span>
          <span className={soldeGlobal >= 0 ? styles.kpiValueSuccess : styles.kpiValueDanger}>
            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(soldeGlobal)}
          </span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avec impayés</span>
          <span className={nbImpayes > 0 ? styles.kpiValueDanger : styles.kpiValue}>{nbImpayes}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>À jour</span>
          <span className={styles.kpiValueSuccess}>{totalCopros - nbImpayes}</span>
        </div>
      </div>

      {/* Segmented Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'COPROPRIETAIRE' ? styles.tabActive : ''}`} onClick={() => handleTabChange('COPROPRIETAIRE')}>
          Copropriétaires
        </button>
        <button className={`${styles.tab} ${activeTab === 'LOCATAIRE' ? styles.tabActive : ''}`} onClick={() => handleTabChange('LOCATAIRE')}>
          Locataires
        </button>
        <button className={`${styles.tab} ${activeTab === 'ANCIEN' ? styles.tabActive : ''}`} onClick={() => handleTabChange('ANCIEN')}>
          Anciens
        </button>
      </div>

      {/* Actions Bar */}
      <div className={styles.actionsBar}>
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Rechercher un copropriétaire..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          {searchQuery && <button onClick={() => setSearchQuery('')} className={styles.clearButton}>×</button>}
        </div>
        <div className={styles.actionButtons}>
          <button className={styles.ghostBtn}>
            <ChevronDown size={16} />
            Plus d&apos;actions
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading && <LoadingState message="Chargement des copropriétaires..." />}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}
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
      {!isLoading && !error && filteredData.length > 0 && (
        <CoproprietairesTable data={filteredData} buttonRefs={buttonRefs} openMenuId={openMenuId} onToggleMenu={setOpenMenuId} />
      )}

      {/* Context Menu */}
      {openMenuId && menuPosition && (
        <div ref={menuRef} className={styles.actionMenu} style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}>
          {(() => {
            const copro = getDataForTab().find(c => c.id === openMenuId);
            if (!copro) return null;
            return (
              <>
                <button className={styles.actionMenuItem} onClick={() => handleEdit(copro)}><Edit size={16} />Modifier</button>
                <button className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`} onClick={() => handleDelete(copro.id)}><Trash2 size={16} />Archiver</button>
              </>
            );
          })()}
        </div>
      )}

      {/* Edit Modal */}
      <CoproprietaireEditModal
        copro={editingCopro}
        isCreating={isCreating}
        form={editForm}
        onFormChange={setEditForm}
        onClose={handleCloseModal}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  );
}
