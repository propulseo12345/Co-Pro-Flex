'use client';

import { useMemo } from 'react';
import { DataState, LoadingState, ErrorState } from '@/components/ui/DataState/DataState';
import { useCopro } from '@/providers/CoproContext';
import { useAgMeetings } from '@/hooks/modules/useAgData';
import { useAgDrafts } from '@/hooks/modules/useAgDrafts';
import {
  AgPageHeader,
  AgDraftsSection,
  AgNextMeetingCard,
  AgHistorySection,
  AgEmptyState,
  AgStatsCard,
  AgResolutionsLink,
} from '@/components/features/ag';
import styles from './ag.module.css';

export default function AGPage() {
  const { currentCoproId, isManager, error: coproError, refreshCopros } = useCopro();
  const { nextMeeting, pastMeetings, isLoading, error, refresh, stats } = useAgMeetings();
  const {
    drafts,
    isLoading: isDraftsLoading,
    error: draftsError,
    deleteDraft,
    refresh: refreshDrafts,
  } = useAgDrafts();

  // Determine if the next meeting is convoked
  const isConvoked = useMemo(() => {
    if (!nextMeeting) return false;
    return nextMeeting.status === 'convoked' || nextMeeting.status === 'in_progress';
  }, [nextMeeting]);

  // Filter nextMeeting if it's a draft (shown in drafts section)
  const displayNextMeeting = useMemo(() => {
    if (!nextMeeting) return null;
    if (nextMeeting.status === 'draft') return null;
    return nextMeeting;
  }, [nextMeeting]);

  // Single Copro Mode : l'erreur du contexte copro doit s'afficher,
  // pas tourner en spinner muet.
  if (!currentCoproId) {
    return coproError
      ? <ErrorState message={coproError} onRetry={refreshCopros} />
      : <LoadingState message="Chargement de la copropriété..." />;
  }

  const handleDeleteDraft = async (draftId: string): Promise<boolean> => {
    return deleteDraft(draftId);
  };

  return (
    <div className="container">
      <AgPageHeader isManager={isManager} />

      <DataState
        isLoading={isLoading}
        error={error}
        isEmpty={false}
        loadingMessage="Chargement des assemblées générales..."
        onRetry={refresh}
      >
        <div className={styles.centered}>
            {/* Drafts Section */}
            <AgDraftsSection
              drafts={drafts}
              isLoading={isDraftsLoading}
              error={draftsError}
              onRefresh={refreshDrafts}
              onDeleteDraft={handleDeleteDraft}
            />

            {/* Next AG (non-draft) */}
            {displayNextMeeting ? (
              <AgNextMeetingCard ag={displayNextMeeting} isConvoked={isConvoked} />
            ) : (
              !drafts.length && <AgEmptyState isManager={isManager} />
            )}

            {/* Stats Card */}
            {stats && <AgStatsCard stats={stats} />}

            {/* History */}
            <AgHistorySection pastMeetings={pastMeetings} />

            {/* Resolutions Library Link */}
            <AgResolutionsLink />
        </div>
      </DataState>
    </div>
  );
}
