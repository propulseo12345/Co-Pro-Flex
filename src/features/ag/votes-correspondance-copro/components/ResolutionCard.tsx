'use client';

import { Check } from 'lucide-react';
import type { Resolution, VoteState, VoteChoice } from '../hooks/useVotesCorrespondanceCoproPage';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/[coproId]/votes-correspondance.module.css';

interface ResolutionCardProps {
  resolution: Resolution;
  vote: VoteState | undefined;
  isValidated: boolean;
  isSaving: boolean;
  onVoteChange: (resolutionId: string, choix: VoteChoice) => void;
}

export function ResolutionCard({
  resolution,
  vote,
  isValidated,
  isSaving,
  onVoteChange,
}: ResolutionCardProps) {
  const isVoted = vote && vote.choix !== 'NON_VOTE';
  const votedClass = vote?.choix === 'POUR' ? styles.resolutionVotedFor
    : vote?.choix === 'CONTRE' ? styles.resolutionVotedAgainst
    : vote?.choix === 'ABSTENTION' ? styles.resolutionVotedAbstention
    : '';

  return (
    <div className={`${styles.resolutionCard} ${votedClass}`}>
      <div className={styles.resolutionHeader}>
        <div className={styles.resolutionNumber}>
          Resolution #{resolution.numero}
          {isVoted && <Check size={16} className={styles.checkIcon} aria-hidden="true" />}
        </div>
      </div>

      <h3 className={styles.resolutionTitle}>{resolution.titre}</h3>
      <p className={styles.resolutionText}>{resolution.texte}</p>

      <div className={styles.voteButtons}>
        <button
          className={`${styles.voteButton} ${styles.votePour} ${vote?.choix === 'POUR' ? styles.voteButtonActive : ''}`}
          onClick={() => onVoteChange(resolution.id, 'POUR')}
          disabled={isValidated || isSaving}
        >
          <Check size={16} aria-hidden="true" />
          Pour
        </button>
        <button
          className={`${styles.voteButton} ${styles.voteContre} ${vote?.choix === 'CONTRE' ? styles.voteButtonActive : ''}`}
          onClick={() => onVoteChange(resolution.id, 'CONTRE')}
          disabled={isValidated || isSaving}
        >
          X
          Contre
        </button>
        <button
          className={`${styles.voteButton} ${styles.voteAbstention} ${vote?.choix === 'ABSTENTION' ? styles.voteButtonActive : ''}`}
          onClick={() => onVoteChange(resolution.id, 'ABSTENTION')}
          disabled={isValidated || isSaving}
        >
          -
          Abstention
        </button>
      </div>

      {vote?.dateVote && (
        <div className={styles.voteDate}>
          Vote enregistre le {new Date(vote.dateVote).toLocaleString('fr-FR')}
        </div>
      )}
    </div>
  );
}
