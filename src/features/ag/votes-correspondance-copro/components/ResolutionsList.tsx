'use client';

import type { Resolution, VoteState, VoteChoice } from '../hooks/useVotesCorrespondanceCoproPage';
import { ResolutionCard } from './ResolutionCard';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface ResolutionsListProps {
  resolutions: Resolution[];
  votes: VoteState[];
  isValidated: boolean;
  isSaving: boolean;
  onVoteChange: (resolutionId: string, choix: VoteChoice) => void;
}

export function ResolutionsList({
  resolutions,
  votes,
  isValidated,
  isSaving,
  onVoteChange,
}: ResolutionsListProps) {
  return (
    <div className={styles.resolutionsList}>
      {resolutions.map((resolution, index) => {
        const vote = votes.find(v => v.resolutionId === resolution.id);

        return (
          <ResolutionCard
            key={resolution.id}
            resolution={resolution}
            index={index}
            vote={vote}
            isValidated={isValidated}
            isSaving={isSaving}
            onVoteChange={onVoteChange}
          />
        );
      })}
    </div>
  );
}
