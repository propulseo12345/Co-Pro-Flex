'use client';

import Stepper from '@/components/features/ag/Stepper';
import { QuorumPreviewCard } from '@/components/features/ag';
import {
  PreparationHeader,
  PreparationLoadingState,
  PreparationStepUnavailable,
  PreparationTabs,
  PreparationVotesTab,
  PreparationPouvoirsTab,
  PreparationFooter,
} from '@/features/ag/preparation';
import { usePreparationPage } from '@/features/ag/preparation/hooks';
import styles from './preparation.module.css';

export default function PreparationPage() {
  const {
    // Navigation
    agId,
    handleGoToEnvoi,
    handleContinue,

    // Guard state
    guardState,
    blockReason,
    redirectUrl,

    // Loading
    isLoading,

    // Tab
    activeTab,
    setActiveTab,

    // Quorum
    quorumPrevisionnel,

    // Votes data
    coproprietaires,
    resolutions,
    selectedCoproId,
    selectedCoproState,
    selectedCopro,
    selectedCoproIndex,
    progress,
    validationErrors,
    canComplete,
    totalCopros,

    // Vote handlers
    selectCopro,
    handleVote,
    handleVoteAll,
    handleClearVotes,
    handleSetTantiemes,
    handleResetTantiemes,
    handleUploadJustificatif,
    handleRemoveJustificatif,
    handleMarkAsComplete,
    handleMarkAsDraft,
    handlePrevCopro,
    handleNextCopro,
    handleSaveAll,
    exportCsv,

    // Pouvoirs data
    pouvoirs,
    coproprietairesWithPouvoirs,
    pouvoirsStats,

    // Pouvoirs handlers
    addPouvoir,
    removePouvoir,
    uploadPouvoirJustificatif,
    removePouvoirJustificatif,
    validatePouvoir,
  } = usePreparationPage();

  // Loading state
  if (guardState === 'loading' || isLoading) {
    return <PreparationLoadingState />;
  }

  // Redirecting state
  if (guardState === 'redirecting') {
    return (
      <PreparationStepUnavailable
        agId={agId}
        blockReason={blockReason}
        redirectUrl={redirectUrl}
        isRedirecting
      />
    );
  }

  // Blocked or error state
  if (guardState === 'blocked' || guardState === 'error') {
    return (
      <PreparationStepUnavailable
        agId={agId}
        blockReason={blockReason}
        redirectUrl={redirectUrl}
      />
    );
  }

  return (
    <div className="container">
      <PreparationHeader onGoBack={handleGoToEnvoi} />

      <Stepper currentStep={5} agId={agId} />

      <div className={styles.quorumBanner}>
        <QuorumPreviewCard quorum={quorumPrevisionnel} />
      </div>

      <PreparationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        votesProgress={progress}
        pouvoirsStats={pouvoirsStats}
      />

      {activeTab === 'votes' && (
        <PreparationVotesTab
          coproprietaires={coproprietaires}
          resolutions={resolutions}
          selectedCoproId={selectedCoproId}
          selectedCopro={selectedCopro}
          selectedCoproState={selectedCoproState}
          selectedCoproIndex={selectedCoproIndex}
          progress={progress}
          validationErrors={validationErrors}
          canComplete={canComplete}
          totalCopros={totalCopros}
          onSelectCopro={selectCopro}
          onVote={handleVote}
          onVoteAll={handleVoteAll}
          onClearVotes={handleClearVotes}
          onSetTantiemes={handleSetTantiemes}
          onResetTantiemes={handleResetTantiemes}
          onUploadJustificatif={handleUploadJustificatif}
          onRemoveJustificatif={handleRemoveJustificatif}
          onMarkAsComplete={handleMarkAsComplete}
          onMarkAsDraft={handleMarkAsDraft}
          onPrevCopro={handlePrevCopro}
          onNextCopro={handleNextCopro}
          onSaveAll={handleSaveAll}
          onExport={exportCsv}
        />
      )}

      {activeTab === 'pouvoirs' && (
        <PreparationPouvoirsTab
          pouvoirs={pouvoirs}
          coproprietaires={coproprietairesWithPouvoirs}
          stats={pouvoirsStats}
          quorumPrevisionnel={quorumPrevisionnel}
          onAddPouvoir={addPouvoir}
          onRemovePouvoir={removePouvoir}
          onUploadJustificatif={uploadPouvoirJustificatif}
          onRemoveJustificatif={removePouvoirJustificatif}
          validatePouvoir={validatePouvoir}
        />
      )}

      <PreparationFooter
        agId={agId}
        onGoToEnvoi={handleGoToEnvoi}
        onContinue={handleContinue}
      />
    </div>
  );
}
