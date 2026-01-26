'use client';

import { useState, useCallback } from 'react';
import { FolderOpen, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useDossiers } from '@/hooks/modules/useDossiers';
import { DossierModal, DossiersTable } from '@/components/features/dossiers';
import {
  IDossier,
  DossierCategorie,
  DossierStatut,
  DossierFormData,
  DOSSIER_CATEGORIE_LABELS,
  DOSSIER_STATUT_LABELS,
} from '@/types/models/dossier';
import styles from './dossiers.module.css';

export default function DossiersPage() {
  const { dossiers, stats, isLoading, error, filters, createDossier, updateDossier, markAsComplete, deleteDossier, updateFilters, resetFilters } = useDossiers();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingDossier, setEditingDossier] = useState<IDossier | undefined>();

  const handleOpenCreate = useCallback(() => { setEditingDossier(undefined); setModalMode('create'); setModalOpen(true); }, []);
  const handleOpenEdit = useCallback((dossier: IDossier) => { setEditingDossier(dossier); setModalMode('edit'); setModalOpen(true); }, []);
  const handleSubmit = useCallback((data: DossierFormData) => { modalMode === 'create' ? createDossier(data) : editingDossier && updateDossier(editingDossier.id, data); }, [modalMode, editingDossier, createDossier, updateDossier]);
  const handleDelete = useCallback((id: string) => { if (confirm('Supprimer ce dossier ?')) deleteDossier(id); }, [deleteDossier]);
  const handleStatClick = useCallback((statut: DossierStatut | 'TOUS') => { updateFilters({ statut }); }, [updateFilters]);

  if (isLoading) return <div className={styles.container}><div className={styles.loadingState}><div className={styles.spinner} /><p>Chargement des dossiers...</p></div></div>;
  if (error) return <div className={styles.container}><div className={styles.errorState}><AlertTriangle size={32} /><p>{error}</p></div></div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerInfo}><h1>Dossiers de la copropriété</h1><p>Gérez les tâches et dossiers prioritaires</p></div>
        <div className={styles.headerActions}><button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={18} />Nouveau dossier</button></div>
      </div>

      {stats.enRetard > 0 && (<div className={styles.deadlineAlert}><AlertTriangle size={18} /><span><strong>{stats.enRetard}</strong> dossier{stats.enRetard > 1 ? 's' : ''} en retard</span></div>)}

      <div className={styles.stats}>
        <div className={clsx(styles.statCard, filters.statut === 'TOUS' && styles.statCardActive)} onClick={() => handleStatClick('TOUS')}><span className={styles.statValue}>{stats.total}</span><span className={styles.statLabel}>Total</span></div>
        <div className={clsx(styles.statCard, filters.statut === DossierStatut.A_FAIRE && styles.statCardActive)} onClick={() => handleStatClick(DossierStatut.A_FAIRE)}><span className={styles.statValue}>{stats.aFaire}</span><span className={styles.statLabel}>À faire</span></div>
        <div className={clsx(styles.statCard, filters.statut === DossierStatut.EN_COURS && styles.statCardActive)} onClick={() => handleStatClick(DossierStatut.EN_COURS)}><span className={styles.statValue}>{stats.enCours}</span><span className={styles.statLabel}>En cours</span></div>
        <div className={clsx(styles.statCard, styles.statCardUrgent)} onClick={() => updateFilters({ statut: DossierStatut.BLOQUE })}><span className={styles.statValue}>{stats.bloques}</span><span className={styles.statLabel}>Bloqués</span></div>
        <div className={clsx(styles.statCard, styles.statCardRetard)}><span className={styles.statValue}>{stats.enRetard}</span><span className={styles.statLabel}>En retard</span></div>
        <div className={clsx(styles.statCard, filters.statut === DossierStatut.TERMINE && styles.statCardActive)} onClick={() => handleStatClick(DossierStatut.TERMINE)}><span className={styles.statValue}>{stats.termines}</span><span className={styles.statLabel}>Terminés</span></div>
      </div>

      <div className={styles.filters}>
        <input type="text" placeholder="Rechercher..." value={filters.search} onChange={e => updateFilters({ search: e.target.value })} className={styles.searchInput} />
        <select value={filters.categorie} onChange={e => updateFilters({ categorie: e.target.value as DossierCategorie | 'TOUS' })} className={styles.filterSelect}>
          <option value="TOUS">Toutes catégories</option>
          {Object.entries(DOSSIER_CATEGORIE_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
        </select>
        <select value={filters.statut} onChange={e => updateFilters({ statut: e.target.value as DossierStatut | 'TOUS' })} className={styles.filterSelect}>
          <option value="TOUS">Tous statuts</option>
          {Object.entries(DOSSIER_STATUT_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
        </select>
        {(filters.search || filters.categorie !== 'TOUS' || filters.statut !== 'TOUS') && (<button className={styles.resetFilters} onClick={resetFilters}><RefreshCw size={14} />Réinitialiser</button>)}
      </div>

      <div className={styles.tableContainer}>
        {dossiers.length === 0 ? (
          <div className={styles.emptyState}>
            <FolderOpen size={48} /><h3>Aucun dossier</h3>
            <p>{filters.search || filters.categorie !== 'TOUS' || filters.statut !== 'TOUS' ? 'Aucun dossier ne correspond à vos critères' : 'Créez votre premier dossier pour commencer'}</p>
            {filters.search || filters.categorie !== 'TOUS' || filters.statut !== 'TOUS' ? (<button className="btn btn-secondary" onClick={resetFilters}>Réinitialiser les filtres</button>) : (<button className="btn btn-primary" onClick={handleOpenCreate}><Plus size={16} />Nouveau dossier</button>)}
          </div>
        ) : (
          <DossiersTable dossiers={dossiers} onMarkComplete={markAsComplete} onEdit={handleOpenEdit} onDelete={handleDelete} />
        )}
      </div>

      <DossierModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} initialData={editingDossier} mode={modalMode} />
    </div>
  );
}
