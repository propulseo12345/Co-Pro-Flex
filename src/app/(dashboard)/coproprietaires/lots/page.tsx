'use client';

import { useState } from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useLotsPage } from '@/hooks/modules/useLotsPage';
import { LotTable, CreateLotModal, EditLotModal } from '@/components/features/lots';
import type { LotWithOwner } from '@/lib/lots/api';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import styles from './lots.module.css';

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'Tous les types' },
  { value: 'appartement', label: 'Appartement' },
  { value: 'studio', label: 'Studio' },
  { value: 'parking', label: 'Parking' },
  { value: 'cave', label: 'Cave' },
  { value: 'local_commercial', label: 'Commerce' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'garage', label: 'Garage' },
];

export default function LotsPage() {
  const { currentCoproId } = useCopro();
  const {
    filteredLots, isLoading, error, searchQuery, setSearchQuery,
    filterType, setFilterType, sortField, sortDirection, handleSort,
    stats, showCreateModal, setShowCreateModal,
    createLot, updateLot, deleteLot, isMutating, refresh,
  } = useLotsPage();

  const [editingLot, setEditingLot] = useState<LotWithOwner | null>(null);

  if (!currentCoproId) {
    return <LoadingState message="Chargement de la copropriété..." />;
  }

  return (
    <div className="container">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Lots &amp; Tantièmes</h1>
          <p>Gestion des lots et de la répartition des charges</p>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.refreshBtn} onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          </button>
          <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Nouveau lot
          </button>
        </div>
      </div>

      <div className={styles.kpiStrip}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total lots</span>
          <span className={styles.kpiValue}>{stats.totalLots}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total tantièmes</span>
          <span className={styles.kpiValue}>{stats.totalTantiemes.toLocaleString('fr-FR')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Avec propriétaire</span>
          <span className={styles.kpiValueSuccess}>{stats.lotsWithOwner}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Non attribués</span>
          <span className={stats.lotsWithoutOwner > 0 ? styles.kpiValueWarning : styles.kpiValue}>
            {stats.lotsWithoutOwner}
          </span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Rechercher un lot ou propriétaire..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className={styles.filterSelect}
          value={filterType}
          onChange={e => setFilterType(e.target.value as typeof filterType)}
        >
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className={styles.totalTantiemes}>
          {filteredLots.reduce((s, l) => s + l.tantiemes_generaux, 0).toLocaleString('fr-FR')} tantièmes affichés
        </span>
      </div>

      {isLoading && <LoadingState message="Chargement des lots..." />}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}
      {!isLoading && !error && filteredLots.length === 0 && (
        <EmptyState title="Aucun lot" message="Aucun lot trouvé pour cette copropriété." />
      )}
      {!isLoading && !error && filteredLots.length > 0 && (
        <LotTable
          lots={filteredLots}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onEdit={setEditingLot}
        />
      )}

      <CreateLotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createLot}
        isMutating={isMutating}
      />

      <EditLotModal
        lot={editingLot}
        onClose={() => setEditingLot(null)}
        onUpdate={updateLot}
        onDelete={deleteLot}
        isMutating={isMutating}
      />
    </div>
  );
}
