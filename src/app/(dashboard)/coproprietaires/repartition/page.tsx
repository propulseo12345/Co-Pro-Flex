'use client';

import { useState } from 'react';
import { useRepartitionPage } from '@/hooks/modules/useRepartitionPage';
import { RepartitionKeyCard, CreateKeyModal, EditKeyModal } from '@/components/features/lots';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import type { RepartitionKeyWithTotals } from '@/lib/lots/api';
import { Plus } from 'lucide-react';
import styles from './repartition.module.css';

export default function RepartitionPage() {
  const { currentCoproId } = useCopro();
  const {
    keys, isLoading, error, refresh,
    selectedKeyId, handleSelectKey, detail,
    createKey, updateKey, deleteKey, isMutating,
    showCreateModal, setShowCreateModal,
  } = useRepartitionPage();

  const [editingKey, setEditingKey] = useState<RepartitionKeyWithTotals | null>(null);

  if (!currentCoproId) return <LoadingState message="Chargement..." />;

  return (
    <div className="container">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Clés de répartition</h1>
          <p>Ventilation des charges par clé et par lot</p>
        </div>
        <button className={styles.addBtn} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Nouvelle clé
        </button>
      </div>

      {isLoading && <LoadingState message="Chargement des clés..." />}
      {error && !isLoading && <ErrorState message={error} onRetry={refresh} />}
      {!isLoading && !error && keys.length === 0 && (
        <EmptyState title="Aucune clé" message="Aucune clé de répartition configurée." />
      )}

      {!isLoading && !error && keys.length > 0 && (
        <div className={styles.keysGrid}>
          {keys.map(k => (
            <RepartitionKeyCard
              key={k.key_id}
              keyData={k}
              isSelected={selectedKeyId === k.key_id}
              onSelect={() => handleSelectKey(k.key_id)}
              detail={selectedKeyId === k.key_id ? detail : null}
              onDelete={() => deleteKey(k.key_id)}
              onEdit={() => setEditingKey(k)}
            />
          ))}
        </div>
      )}

      <CreateKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={createKey}
        isMutating={isMutating}
      />

      <EditKeyModal
        keyData={editingKey}
        onClose={() => setEditingKey(null)}
        onUpdate={updateKey}
        isMutating={isMutating}
      />
    </div>
  );
}
