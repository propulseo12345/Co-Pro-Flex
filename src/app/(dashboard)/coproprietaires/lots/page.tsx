'use client';

import { Search, Plus, RefreshCw } from 'lucide-react';
import { useLotsRepartitionGrid } from '@/hooks/modules/useLotsRepartitionGrid';
import { LotsRepartitionGrid, CreateLotModal, EditLotModal, CreateKeyModal, EditKeyModal } from '@/components/features/lots';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import type { RepartitionKeyWithTotals, RepartitionBasis } from '@/lib/lots/api';
import styles from './lots.module.css';

export default function LotsPage() {
  const { currentCoproId } = useCopro();
  const {
    keyColumns, gridRows, stats, isLoading, error, isMutating,
    searchQuery, setSearchQuery,
    createLot, updateLot, deleteLot, editingLot, setEditingLot, showCreateLotModal, setShowCreateLotModal,
    createKey, updateKey, deleteKey, editingKey, setEditingKey, showCreateKeyModal, setShowCreateKeyModal,
    updateWeight, refresh,
    owners, assignOwner,
  } = useLotsRepartitionGrid();

  const ownerOptions = owners.map(o => ({ id: o.id, display_name: o.display_name }));

  if (!currentCoproId) {
    return <LoadingState message="Chargement de la copropriété..." />;
  }

  // Map GridKeyColumn to RepartitionKeyWithTotals for EditKeyModal
  const editingKeyData: RepartitionKeyWithTotals | null = editingKey ? {
    key_id: editingKey.key_id,
    copro_id: currentCoproId,
    name: editingKey.name,
    description: null,
    basis: editingKey.basis as 'tantiemes' | 'surface' | 'custom',
    coverage_mode: 'all_lots',
    is_active: true,
    total_weight: editingKey.total_weight,
    lots_count: editingKey.lots_count,
    lots_with_weight_count: editingKey.lots_with_weight_count,
    is_complete: editingKey.is_complete,
  } : null;

  return (
    <div className="container">
      {/* TopBar */}
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Lots & Répartition</h1>
          <p>Tantièmes et clés de répartition des charges</p>
        </div>
        <div className={styles.topBarActions}>
          <button className={styles.refreshBtn} onClick={() => refresh()} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? styles.spinning : ''} />
          </button>
          <button className={styles.outlineBtn} onClick={() => setShowCreateKeyModal(true)}>
            <Plus size={14} />
            Clé
          </button>
          <button className={styles.addBtn} onClick={() => setShowCreateLotModal(true)}>
            <Plus size={16} />
            Lot
          </button>
        </div>
      </div>

      {/* KPIs — 3 cards */}
      <div className={styles.kpiStrip3}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Lots</span>
          <span className={styles.kpiValue}>{stats.totalLots}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Tantièmes généraux</span>
          <span className={styles.kpiValueSuccess}>{stats.totalTantiemes.toLocaleString('fr-FR')}</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Clés spéciales</span>
          <span className={styles.kpiValueBlue}>{keyColumns.length}</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchContainer}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <span className={styles.totalTantiemes}>
          ✓ {stats.totalTantiemes.toLocaleString('fr-FR')} tantièmes
        </span>
      </div>

      {/* Grid */}
      {isLoading && <LoadingState message="Chargement..." />}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}
      {!isLoading && !error && gridRows.length === 0 && (
        <EmptyState title="Aucun lot" message="Aucun lot trouvé." />
      )}
      {!isLoading && !error && gridRows.length > 0 && (
        <LotsRepartitionGrid
          rows={gridRows}
          keyColumns={keyColumns}
          onEditLot={setEditingLot}
          onEditKey={({ color: _color, ...key }) => setEditingKey({
            ...key,
            basis: key.basis as RepartitionBasis,
            copro_id: currentCoproId,
            description: null,
            coverage_mode: 'all_lots' as const,
            is_active: true,
          })}
          onUpdateWeight={updateWeight}
        />
      )}

      {/* Modals */}
      <CreateLotModal
        isOpen={showCreateLotModal}
        onClose={() => setShowCreateLotModal(false)}
        onCreate={createLot}
        isMutating={isMutating}
        owners={ownerOptions}
        onAssignOwner={assignOwner}
      />
      <EditLotModal
        lot={editingLot}
        onClose={() => setEditingLot(null)}
        onUpdate={updateLot}
        onDelete={deleteLot}
        isMutating={isMutating}
        owners={ownerOptions}
        onAssignOwner={assignOwner}
        currentOwnerId={editingLot?.coproprietaire_id}
      />
      <CreateKeyModal
        isOpen={showCreateKeyModal}
        onClose={() => setShowCreateKeyModal(false)}
        onCreate={createKey}
        isMutating={isMutating}
      />
      <EditKeyModal
        keyData={editingKeyData}
        onClose={() => setEditingKey(null)}
        onUpdate={updateKey}
        onDelete={deleteKey}
        isMutating={isMutating}
      />
    </div>
  );
}
