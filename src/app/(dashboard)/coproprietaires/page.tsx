'use client';

import { Search, ChevronDown, Edit, Trash2 } from 'lucide-react';
import { useCoproprietairesPage } from '@/hooks/modules/useCoproprietairesPage';
import { CoproprietairesTable, CoproprietaireEditModal } from '@/components/features/coproprietaires';
import styles from './coproprietaires.module.css';

export default function CoproprietairesPage() {
  const {
    activeTab, handleTabChange, searchQuery, setSearchQuery, filteredData,
    openMenuId, setOpenMenuId, menuPosition, menuRef, buttonRefs,
    editingCopro, setEditingCopro, editForm, setEditForm,
    handleEdit, handleSave, handleDelete, getDataForTab,
  } = useCoproprietairesPage();

  return (
    <div className="container">
      <div className={styles.header}><h1 className={styles.title}>Mes copropriétaires</h1></div>

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

      <CoproprietairesTable data={filteredData} buttonRefs={buttonRefs} openMenuId={openMenuId} onToggleMenu={setOpenMenuId} />

      {openMenuId && menuPosition && (
        <div ref={menuRef} className={styles.actionMenu} style={{ top: `${menuPosition.top}px`, right: `${menuPosition.right}px` }}>
          {(() => {
            const copro = getDataForTab().find(c => c.id === openMenuId);
            if (!copro) return null;
            return (
              <>
                <button className={styles.actionMenuItem} onClick={() => handleEdit(copro)}><Edit size={16} aria-hidden="true" />Modifier</button>
                <button className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`} onClick={() => handleDelete(copro.id)}><Trash2 size={16} aria-hidden="true" />Supprimer</button>
              </>
            );
          })()}
        </div>
      )}

      <CoproprietaireEditModal copro={editingCopro} form={editForm} onFormChange={setEditForm} onClose={() => setEditingCopro(null)} onSave={handleSave} />
    </div>
  );
}
