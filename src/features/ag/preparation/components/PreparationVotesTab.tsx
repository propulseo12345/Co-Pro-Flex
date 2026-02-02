'use client';

import {
  VotesProgressSummary,
  CoproList,
  CoproVoteEditor,
  VotesEmptyState,
} from '@/components/features/ag';
import type {
  CoproprietaireWithVoteStatus,
  VoteCorrespondanceState,
  VotesCorrespondanceProgress,
} from '@/hooks/modules/useVotesCorrespondance';
import styles from '@/app/(dashboard)/ag/[id]/preparation/preparation.module.css';

interface Resolution {
  id: string;
  titre: string;
  texte?: string;
  majorite?: string;
  numero?: number;
}

type VoteChoice = 'POUR' | 'CONTRE' | 'ABSTENTION' | null;

interface PreparationVotesTabProps {
  coproprietaires: CoproprietaireWithVoteStatus[];
  resolutions: Resolution[];
  selectedCoproId: string | null;
  selectedCopro: CoproprietaireWithVoteStatus | null;
  selectedCoproState: VoteCorrespondanceState | null;
  selectedCoproIndex: number;
  progress: VotesCorrespondanceProgress;
  validationErrors: string[];
  canComplete: boolean;
  totalCopros: number;
  onSelectCopro: (id: string | null) => void;
  onVote: (resolutionId: string, choice: VoteChoice) => void;
  onVoteAll: (choice: VoteChoice) => void;
  onClearVotes: () => void;
  onSetTantiemes: (value: number) => void;
  onResetTantiemes: () => void;
  onUploadJustificatif: (file: File) => Promise<void>;
  onRemoveJustificatif: () => void;
  onMarkAsComplete: () => void;
  onMarkAsDraft: () => void;
  onPrevCopro: () => void;
  onNextCopro: () => void;
  onSaveAll: () => void;
  onExport: () => void;
}

export function PreparationVotesTab({
  coproprietaires,
  resolutions,
  selectedCoproId,
  selectedCopro,
  selectedCoproState,
  selectedCoproIndex,
  progress,
  validationErrors,
  canComplete,
  totalCopros,
  onSelectCopro,
  onVote,
  onVoteAll,
  onClearVotes,
  onSetTantiemes,
  onResetTantiemes,
  onUploadJustificatif,
  onRemoveJustificatif,
  onMarkAsComplete,
  onMarkAsDraft,
  onPrevCopro,
  onNextCopro,
  onSaveAll,
  onExport,
}: PreparationVotesTabProps) {
  return (
    <>
      <VotesProgressSummary progress={progress} onExport={onExport} />

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          <CoproList
            coproprietaires={coproprietaires}
            selectedCoproId={selectedCoproId}
            onSelectCopro={onSelectCopro}
          />
          <button onClick={onSaveAll} className="btn btn-secondary w-full">
            Sauvegarder
          </button>
        </div>

        <div className={styles.mainContent}>
          {selectedCopro && selectedCoproState ? (
            <CoproVoteEditor
              copro={selectedCopro}
              voteState={selectedCoproState}
              resolutions={resolutions}
              currentIndex={selectedCoproIndex}
              totalCopros={totalCopros}
              validationErrors={validationErrors}
              canMarkAsComplete={canComplete}
              onVote={onVote}
              onVoteAll={onVoteAll}
              onClearVotes={onClearVotes}
              onSetTantiemes={onSetTantiemes}
              onResetTantiemes={onResetTantiemes}
              onUploadJustificatif={onUploadJustificatif}
              onRemoveJustificatif={onRemoveJustificatif}
              onMarkAsComplete={onMarkAsComplete}
              onMarkAsDraft={onMarkAsDraft}
              onPrevCopro={onPrevCopro}
              onNextCopro={onNextCopro}
              onSave={onSaveAll}
            />
          ) : (
            <VotesEmptyState hasResolutions={resolutions.length > 0} />
          )}
        </div>
      </div>
    </>
  );
}
