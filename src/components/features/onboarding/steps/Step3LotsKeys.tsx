// src/components/features/onboarding/steps/Step3LotsKeys.tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { StepHeader } from '../shared/StepHeader';
import { LotsRepartitionGrid, CreateLotModal, EditLotModal, CreateKeyModal, EditKeyModal } from '@/components/features/lots';
import { useLotsRepartitionGrid } from '@/hooks/modules/useLotsRepartitionGrid';
import type { RepartitionKeyWithTotals, RepartitionBasis } from '@/lib/lots/api';
import styles from './Step3LotsKeys.module.css';

interface Step3Props {
  coproId: string;
  onComplete: () => void;
  onBack: () => void;
}

export function Step3LotsKeys({ coproId, onComplete, onBack }: Step3Props) {
  const {
    keyColumns, gridRows, stats, isLoading, isMutating,
    createLot, updateLot, deleteLot,
    editingLot, setEditingLot,
    showCreateLotModal, setShowCreateLotModal,
    createKey, updateKey, deleteKey,
    editingKey, setEditingKey,
    showCreateKeyModal, setShowCreateKeyModal,
    updateWeight,
    owners, assignOwner,
    generalKeyId, keysCount,
    refresh,
  } = useLotsRepartitionGrid(coproId);

  // Auto-créer la clé "Charges générales" (category=general) si aucune clé n'existe.
  // Garde sur keysCount (toutes clés) : isLoading couvre le chargement, donc pas de
  // double création même si la clé générale n'est pas encore identifiée.
  const defaultKeyCreated = useRef(false);
  useEffect(() => {
    if (defaultKeyCreated.current || isLoading) return;
    if (keysCount > 0) return; // au moins une clé existe déjà
    defaultKeyCreated.current = true;
    createKey({
      name: 'Charges générales',
      basis: 'tantiemes' as RepartitionBasis,
      category: 'general',
      coverage_mode: 'all_lots',
    }).then(() => refresh());
  }, [isLoading, keysCount, createKey, refresh]);

  // Amorçage : créer automatiquement 1 lot par copropriétaire (une seule fois par montage).
  // Conditions : clé générale prête, des copropriétaires existent, aucun lot encore.
  // La garde useRef évite la double-exécution dans un même montage ; comme on ne
  // s'amorce que s'il y a 0 lot, aucun risque de re-création une fois les lots créés.
  const lotsSeeded = useRef(false);
  const [seeding, setSeeding] = useState(false);
  useEffect(() => {
    if (lotsSeeded.current || seeding) return;
    if (isLoading || isMutating) return;
    if (!generalKeyId) return; // attendre la clé générale (sa ligne sera créée par lot)
    if (gridRows.length > 0) return; // des lots existent déjà
    if (owners.length === 0) return; // rien à amorcer

    lotsSeeded.current = true;
    setSeeding(true);
    (async () => {
      try {
        for (let i = 0; i < owners.length; i++) {
          const created = await createLot({ ref: `Lot ${i + 1}`, tantiemes_generaux: 0 });
          if (created?.id) await assignOwner(created.id, owners[i].id);
        }
        await refresh();
      } finally {
        setSeeding(false);
      }
    })();
  }, [seeding, isLoading, isMutating, generalKeyId, gridRows.length, owners, createLot, assignOwner, refresh]);

  const ownerOptions = owners.map(o => ({ id: o.id, display_name: o.display_name }));
  const lotCount = gridRows?.length ?? 0;
  const hasLots = lotCount > 0;

  // Map GridKeyColumn → RepartitionKeyWithTotals pour EditKeyModal
  const editingKeyData: RepartitionKeyWithTotals | null = editingKey ? {
    key_id: editingKey.key_id,
    copro_id: coproId,
    name: editingKey.name,
    description: null,
    basis: editingKey.basis as RepartitionBasis,
    coverage_mode: editingKey.coverage_mode,
    is_active: true,
    total_weight: editingKey.total_weight,
    lots_count: editingKey.lots_count,
    lots_with_weight_count: editingKey.lots_with_weight_count,
    is_complete: editingKey.is_complete,
  } : null;

  const handleEditKey = useCallback(({ color: _color, ...key }: typeof keyColumns[number]) => {
    setEditingKey({
      ...key,
      basis: key.basis as RepartitionBasis,
      copro_id: coproId,
      description: null,
      coverage_mode: key.coverage_mode,
      is_active: true,
    });
  }, [setEditingKey, coproId]);

  return (
    <div className={styles.container}>
      <StepHeader
        title="Lots & Clés de répartition"
        description="Créez les lots, assignez-les à leurs propriétaires et définissez les tantièmes."
        count={hasLots ? `${lotCount} lot${lotCount > 1 ? 's' : ''}` : undefined}
      />

      {/* Actions */}
      <div className={styles.actions}>
        <button
          className={styles.btnAddLot}
          onClick={() => setShowCreateLotModal(true)}
        >
          <Plus size={16} />
          Ajouter un lot
        </button>
        <button
          className={styles.btnAddKey}
          onClick={() => setShowCreateKeyModal(true)}
        >
          <Plus size={14} />
          Ajouter une clé
        </button>
      </div>

      {/* KPI strip */}
      {hasLots && (
        <div className={styles.kpiStrip}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Lots</span>
            <span className={styles.kpiValue}>{stats.totalLots}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Tantièmes</span>
            <span className={styles.kpiValueSuccess}>{stats.totalTantiemes.toLocaleString('fr-FR')}</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Clés spéciales</span>
            <span className={styles.kpiValueBlue}>{keyColumns.length}</span>
          </div>
        </div>
      )}

      {/* Loading skeleton : chargement initial avant amorçage */}
      {isLoading && !seeding && !hasLots && (
        <div className={styles.loading} aria-hidden="true">
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
          <div className={styles.skeletonRow} />
        </div>
      )}

      {/* Seeding state : amorçage des lots en cours */}
      {seeding && !hasLots && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Préparation des lots…</p>
          <p className={styles.emptyHint}>
            Un lot est créé pour chaque copropriétaire saisi à l&apos;étape précédente.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !seeding && !hasLots && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>Aucun lot pour l&apos;instant.</p>
          <p className={styles.emptyHint}>
            Cliquez sur « Ajouter un lot » pour commencer. Vous pourrez ensuite assigner chaque lot
            à un copropriétaire de l&apos;étape précédente et définir ses tantièmes.
          </p>
        </div>
      )}

      {/* Grid */}
      {hasLots && (
        <div className={styles.gridWrapper}>
          <LotsRepartitionGrid
            rows={gridRows}
            keyColumns={keyColumns}
            generalKeyId={generalKeyId}
            onEditLot={setEditingLot}
            onEditKey={handleEditKey}
            onUpdateWeight={updateWeight}
          />
        </div>
      )}

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.btnBack} onClick={onBack}>Retour</button>
        <button
          className={styles.btnNext}
          onClick={onComplete}
          disabled={!hasLots}
        >
          Continuer ({lotCount} lot{lotCount > 1 ? 's' : ''})
        </button>
      </div>

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
