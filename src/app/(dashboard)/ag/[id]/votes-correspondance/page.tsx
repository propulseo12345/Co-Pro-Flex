'use client';

import { useEffect } from 'react';
import Stepper from '@/components/features/ag/Stepper';
import { DataState } from '@/components/ui/DataState/DataState';
import { updateAgCurrentStep } from '@/lib/ag/api';
import {
  useVotesCorrespondancePage,
} from '@/features/ag/votes-correspondance/hooks';
import {
  PageHeader,
  StatusBar,
  OwnersPanel,
  VotesPanel,
} from '@/features/ag/votes-correspondance/components';
import styles from './votes-correspondance.module.css';

export default function VotesCorrespondancePage() {
  const {
    agId,
    currentCoproId,
    searchTerm,
    setSearchTerm,
    modeReception,
    setModeReception,
    submitResult,
    owners,
    resolutions,
    status,
    selectedOwner,
    pendingVotes,
    isLoading,
    isSubmitting,
    error,
    selectOwner,
    setVote,
    clearVotes,
    refresh,
    canSubmit,
    votedCount,
    totalResolutions,
    filteredOwners,
    handleSubmit,
    getExistingVote,
  } = useVotesCorrespondancePage();

  // Update current step in DB (step 5 = Votes par correspondance)
  useEffect(() => {
    if (!isLoading && agId) {
      updateAgCurrentStep(agId, 5);
    }
  }, [isLoading, agId]);

  // Mode Single Copro: si pas encore charge, afficher un spinner
  if (!currentCoproId) {
    return (
      <div className="container">
        <div className={styles.emptyState}>
          <div style={{ animation: 'spin 1s linear infinite', width: 48, height: 48, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: '50%' }} />
          <h3>Chargement...</h3>
          <p>Chargement de la copropriete en cours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PageHeader agId={agId} />

      <Stepper currentStep={5} agId={agId} />

      {status && (
        <StatusBar status={status} onRefresh={refresh} />
      )}

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={owners.length === 0}
        loadingMessage="Chargement des coproprietaires..."
        emptyMessage="Aucun coproprietaire trouve"
        onRetry={refresh}
      >
        <div className={styles.layout}>
          <OwnersPanel
            owners={filteredOwners}
            selectedOwnerId={selectedOwner?.id || null}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onSelectOwner={selectOwner}
          />

          <VotesPanel
            selectedOwner={selectedOwner}
            resolutions={resolutions}
            pendingVotes={pendingVotes}
            modeReception={modeReception}
            votedCount={votedCount}
            totalResolutions={totalResolutions}
            canSubmit={canSubmit}
            isSubmitting={isSubmitting}
            submitResult={submitResult}
            onSelectOwner={selectOwner}
            onModeReceptionChange={setModeReception}
            onSetVote={setVote}
            onClearVotes={clearVotes}
            onSubmit={handleSubmit}
            getExistingVote={getExistingVote}
          />
        </div>
      </DataState>
    </div>
  );
}
