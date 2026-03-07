'use client';

import { Check, X, Minus } from 'lucide-react';
import type { Resolution, VoteState, VoteChoice } from '../hooks/useVotesCorrespondanceCoproPage';
import { ResolutionCard } from './ResolutionCard';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface ResolutionsListProps {
  resolutions: Resolution[];
  votes: VoteState[];
  isValidated: boolean;
  isSaving: boolean;
  onVoteChange: (resolutionId: string, choix: VoteChoice) => void;
  onSetAllVotes?: (choix: VoteChoice) => void;
}

export function ResolutionsList({
  resolutions,
  votes,
  isValidated,
  isSaving,
  onVoteChange,
  onSetAllVotes,
}: ResolutionsListProps) {
  return (
    <>
      {onSetAllVotes && !isValidated && (
        <div className={styles.bulkVoteBar}>
          <span className={styles.bulkVoteLabel}>Vote rapide :</span>
          <div className={styles.bulkVoteButtons}>
            <button
              type="button"
              className={`${styles.bulkVoteBtn} ${styles.bulkFor}`}
              onClick={() => onSetAllVotes('POUR')}
              disabled={isSaving}
            >
              <Check size={14} />
              Tout Pour
            </button>
            <button
              type="button"
              className={`${styles.bulkVoteBtn} ${styles.bulkAgainst}`}
              onClick={() => onSetAllVotes('CONTRE')}
              disabled={isSaving}
            >
              <X size={14} />
              Tout Contre
            </button>
            <button
              type="button"
              className={`${styles.bulkVoteBtn} ${styles.bulkAbstention}`}
              onClick={() => onSetAllVotes('ABSTENTION')}
              disabled={isSaving}
            >
              <Minus size={14} />
              Tout Abstention
            </button>
          </div>
        </div>
      )}
      <div className={styles.resolutionsList}>
        {resolutions.map((resolution) => {
          const vote = votes.find(v => v.resolutionId === resolution.id);

          return (
            <ResolutionCard
              key={resolution.id}
              resolution={resolution}
              vote={vote}
              isValidated={isValidated}
              isSaving={isSaving}
              onVoteChange={onVoteChange}
            />
          );
        })}
      </div>
    </>
  );
}
