'use client';

import { useTantiemesPage } from '@/features/finance/tantiemes';
import {
  TantiemesHeader,
  TantiemesInfoSection,
  TantiemesStatsSection,
  LotsTable,
  OwnersTable,
  VoteExampleSection,
} from '@/features/finance/tantiemes';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/DataState/DataState';
import styles from './tantiemes.module.css';

export default function TantiemesPage() {
  const {
    // Data
    lots,
    ownerAggregates,
    totalTantiemes,
    totalLots,
    isManager,

    // Loading/error
    isLoading,
    error,
    isMutating,

    // Edit state
    editingId,
    editValues,

    // Handlers
    handleEdit,
    handleSave,
    handleCancel,
    handleRefChange,
    handleTantiemesChange,

    // Actions
    refresh,
  } = useTantiemesPage();

  // Loading state
  if (isLoading) {
    return (
      <div className="container">
        <LoadingState message="Chargement des tantièmes..." />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container">
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="container">
      <TantiemesHeader isLoading={isLoading} onRefresh={refresh} />

      <TantiemesInfoSection />

      <TantiemesStatsSection
        totalTantiemes={totalTantiemes}
        totalLots={totalLots}
        ownersCount={ownerAggregates.length}
      />

      {/* Lots Table */}
      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Tantièmes par lot</h2>
        {lots.length === 0 ? (
          <EmptyState
            title="Aucun lot"
            message="Aucun lot n'a été créé pour cette copropriété."
          />
        ) : (
          <LotsTable
            lots={lots}
            totalTantiemes={totalTantiemes}
            isManager={isManager}
            editingId={editingId}
            editValues={editValues}
            isMutating={isMutating}
            onEdit={handleEdit}
            onSave={handleSave}
            onCancel={handleCancel}
            onRefChange={handleRefChange}
            onTantiemesChange={handleTantiemesChange}
          />
        )}
      </div>

      {/* Owners Summary */}
      <div className={styles.tableSection}>
        <h2 className={styles.sectionTitle}>Tantièmes par copropriétaire</h2>
        <OwnersTable
          owners={ownerAggregates}
          totalTantiemes={totalTantiemes}
          totalLots={totalLots}
        />
      </div>

      <VoteExampleSection />
    </div>
  );
}
