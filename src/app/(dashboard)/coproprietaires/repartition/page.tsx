'use client';

import { useRepartitionPage } from '@/hooks/modules/useRepartitionPage';
import { RepartitionKeyCard } from '@/components/features/lots';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import styles from './repartition.module.css';

export default function RepartitionPage() {
  const { currentCoproId } = useCopro();
  const {
    keys, isLoading, error, refresh,
    selectedKeyId, handleSelectKey, detail,
  } = useRepartitionPage();

  if (!currentCoproId) return <LoadingState message="Chargement..." />;

  return (
    <div className="container">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h1>Clés de répartition</h1>
          <p>Ventilation des charges par clé et par lot</p>
        </div>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
