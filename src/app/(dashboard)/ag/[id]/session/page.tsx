'use client';

import { useParams } from 'next/navigation';
import Stepper from '@/components/features/ag/Stepper';
import { StepUnavailable } from '@/components/features/ag';
import { useAGStepGuard } from '@/hooks/modules/useAGStepGuard';
import {
  SessionStartScreen,
  SessionSidebar,
  ResolutionNavBar,
  ResultModal,
  PasserelleModal,
  VariableModal,
  ValidationWarningModal,
} from '@/components/features/ag/Session';
import { checkMajority } from '@/components/features/ag/Session/utils';
import { useAgSessionPage } from '@/features/ag/hooks/useAgSessionPage';
import {
  SessionHeader,
  SessionLoading,
  SessionRedirecting,
  SessionBlocked,
  SessionError,
  SessionRestoredBanner,
  SessionVotingContent,
  SessionFooter,
  ProjectorModal,
} from '@/features/ag/components/session';
import styles from './session.module.css';

export default function SessionPage() {
  const params = useParams();
  const agId = params.id as string;

  const { state: guardState, blockReason, redirectUrl } = useAGStepGuard({
    agId,
    stepId: 'session_ag',
    autoRedirect: true,
    redirectDelay: 100,
  });

  const session = useAgSessionPage({ agId });

  // Guard states
  if (guardState === 'loading') {
    return <SessionLoading />;
  }

  if (guardState === 'redirecting') {
    return <SessionRedirecting blockReason={blockReason} redirectUrl={redirectUrl} agId={agId} />;
  }

  if (guardState === 'blocked' || guardState === 'error') {
    return <SessionBlocked blockReason={blockReason} redirectUrl={redirectUrl} agId={agId} />;
  }

  if (session.isRestoring) {
    return <SessionLoading message={session.persistenceStatus === 'initializing' ? 'Initialisation de la session...' : 'Restauration de la session...'} />;
  }

  if (session.persistenceStatus === 'error' && session.persistenceError) {
    return <SessionError error={session.persistenceError} onRetry={session.retryRestore} onStartNew={session.startNewSession} />;
  }

  return (
    <div className="container">
      {session.hasExistingData && session.restoreResult && (
        <SessionRestoredBanner restoreResult={session.restoreResult} />
      )}

      <SessionHeader
        onBack={session.goBack}
        isOnline={session.isOnline}
        persistenceStatus={session.persistenceStatus}
        hasUnsavedChanges={session.hasUnsavedChanges}
        lastSaveDate={session.lastSaveDate}
      />

      <Stepper currentStep={6} agId={agId} />

      {!session.sessionState.started ? (
        <SessionStartScreen
          presences={session.presences}
          presencesEnrichies={session.presencesEnrichies}
          votesCorrespondanceCount={session.votesCorrespondanceCount}
          onPresenceToggle={session.handlePresenceToggle}
          onSelectAll={session.selectAllPresences}
          onBasculerPresent={session.handleBasculerPresent}
          onAnnulerBascule={session.handleAnnulerBascule}
          onStart={session.handleStartSession}
        />
      ) : (
        <>
          <ResolutionNavBar
            resolutions={session.resolutions}
            currentIndex={session.sessionState.currentResolutionIndex}
            completedResolutions={session.sessionState.completedResolutions}
            onNavigate={session.handleNavigateToResolution}
            disabled={session.isSecondVote}
          />

          <div className={styles.layout}>
            <div className={styles.mainContent}>
              {session.currentResolution && (
                <SessionVotingContent
                  currentResolution={session.currentResolution}
                  currentResolutionIndex={session.sessionState.currentResolutionIndex}
                  totalResolutions={session.resolutions.length}
                  stats={session.stats}
                  votes={session.votes}
                  presences={session.presences}
                  isSecondVote={session.isSecondVote}
                  isCurrentResolutionInfo={session.isCurrentResolutionInfo}
                  allVariables={session.allVariables}
                  prefillVariables={session.prefillVariables}
                  variableValues={session.variableValues}
                  showPrefillDropdown={session.showPrefillDropdown}
                  onVote={session.handleVote}
                  onSelectAllVotes={session.selectAllVotes}
                  onVariableClick={session.handleVariableClick}
                  onPrefillDropdownToggle={session.setShowPrefillDropdown}
                  onPrefillFromCopro={session.handlePrefillFromCopro}
                  onValidateVote={session.handleValidateVote}
                  onValidateSecondVote={session.handleValidateSecondVote}
                  onNextWithValidation={session.handleNextWithValidation}
                  onPrevResolution={session.handlePrevResolution}
                  onGoToPV={session.goToPV}
                />
              )}
            </div>
            <SessionSidebar
              currentResolutionIndex={session.sessionState.currentResolutionIndex}
              totalResolutions={session.resolutions.length}
              presences={session.presences}
              presencesEnrichies={session.presencesEnrichies}
            />
          </div>
        </>
      )}

      {session.sessionState.started && (
        <SessionFooter
          onPause={session.handlePauseSession}
          onSave={session.saveSession}
          onOpenProjector={session.handleOpenProjector}
          onExportCSV={session.handleExportCSV}
        />
      )}

      {session.showPasserelleModal && session.passerelleResolution && session.passerelleVoteInitial && (
        <PasserelleModal
          resolution={session.passerelleResolution}
          voteInitial={session.passerelleVoteInitial}
          onClose={() => session.setShowPasserelleModal(false)}
          onSecondVote={session.handlePasserelleSecondVote}
          onAjournement={session.handlePasserelleAjournement}
        />
      )}

      {session.showResultModal && session.currentResolution && session.stats && (
        <ResultModal
          resolution={session.currentResolution}
          stats={session.stats}
          result={checkMajority(session.currentResolution, session.stats, session.votes)}
          pendingNextResolution={session.pendingNextResolution}
          onClose={session.closeResultModal}
          onConfirmNext={session.confirmNextFromModal}
        />
      )}

      {session.showVariableModal && session.editingVariable && (
        <VariableModal
          variableName={session.editingVariable.name}
          variableValue={session.editingVariable.value}
          onChange={(value) => session.setEditingVariable({ ...session.editingVariable!, value })}
          onClose={session.closeVariableModal}
          onSave={session.handleSaveVariable}
        />
      )}

      {session.showValidationWarning && (
        <ValidationWarningModal
          missingVariables={session.missingVariables}
          onClose={session.closeValidationWarning}
          onConfirmContinue={session.confirmContinueWithWarning}
        />
      )}

      {session.showProjectorModal && (
        <ProjectorModal
          url={session.projectorUrl}
          copied={session.copiedToClipboard}
          onCopy={session.handleCopyProjectorUrl}
          onOpenNewTab={session.handleOpenProjectorNewTab}
          onClose={session.closeProjectorModal}
        />
      )}
    </div>
  );
}
