'use client';

import {
  X,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
  Check,
  Loader2,
} from 'lucide-react';
import clsx from 'clsx';
import type { EligibleOwner } from '@/lib/ag/correspondence';
import type { VoteDirection } from '@/lib/ag/types';
import { VoteButton } from './VoteButton';
import type { SubmitResult } from '../hooks/useVotesCorrespondancePage';
import styles from '@/app/(dashboard)/ag/[id]/votes-correspondance/votes-correspondance.module.css';

interface Resolution {
  id: string;
  resolution_number: number;
  title: string;
  majority_type: string;
}

interface VotesPanelProps {
  selectedOwner: EligibleOwner | null;
  resolutions: Resolution[];
  pendingVotes: Map<string, VoteDirection>;
  modeReception: 'postal' | 'email' | 'remise_main';
  votedCount: number;
  totalResolutions: number;
  canSubmit: boolean;
  isSubmitting: boolean;
  submitResult: SubmitResult | null;
  onSelectOwner: (owner: EligibleOwner | null) => void;
  onModeReceptionChange: (mode: 'postal' | 'email' | 'remise_main') => void;
  onSetVote: (resolutionId: string, vote: VoteDirection) => void;
  onClearVotes: () => void;
  onSubmit: () => void;
  getExistingVote: (resolutionId: string) => VoteDirection | null;
}

export function VotesPanel({
  selectedOwner,
  resolutions,
  pendingVotes,
  modeReception,
  votedCount,
  totalResolutions,
  canSubmit,
  isSubmitting,
  submitResult,
  onSelectOwner,
  onModeReceptionChange,
  onSetVote,
  onClearVotes,
  onSubmit,
  getExistingVote,
}: VotesPanelProps) {
  if (!selectedOwner) {
    return (
      <div className={styles.votesPanel}>
        <div className={styles.emptySelection}>
          <Users size={48} />
          <h3>Selectionnez un coproprietaire</h3>
          <p>Choisissez un coproprietaire dans la liste pour enregistrer ses votes par correspondance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.votesPanel}>
      <div className={styles.selectedOwnerHeader}>
        <div>
          <h2>{selectedOwner.name}</h2>
          <p>{selectedOwner.total_tantiemes} tantiemes</p>
        </div>
        <button
          onClick={() => onSelectOwner(null)}
          className={styles.clearSelection}
        >
          <X size={16} /> Annuler
        </button>
      </div>

      {/* Mode de reception */}
      <div className={styles.receptionMode}>
        <label>Mode de reception :</label>
        <select
          value={modeReception}
          onChange={(e) => onModeReceptionChange(e.target.value as typeof modeReception)}
        >
          <option value="postal">Courrier postal</option>
          <option value="email">Email</option>
          <option value="remise_main">Remise en main propre</option>
        </select>
      </div>

      {/* Resolutions list */}
      <div className={styles.resolutionsList}>
        {resolutions.map((resolution) => {
          const existingVote = getExistingVote(resolution.id);
          const pendingVote = pendingVotes.get(resolution.id);
          const hasExistingVote = existingVote !== null;

          return (
            <div
              key={resolution.id}
              className={clsx(
                styles.resolutionItem,
                hasExistingVote && styles.resolutionVoted
              )}
            >
              <div className={styles.resolutionHeader}>
                <span className={styles.resolutionNumber}>
                  Resolution {resolution.resolution_number}
                </span>
                <span className={styles.majorityBadge}>
                  {resolution.majority_type}
                </span>
              </div>
              <h4 className={styles.resolutionTitle}>{resolution.title}</h4>

              {hasExistingVote ? (
                <div className={styles.existingVote}>
                  <CheckCircle2 size={16} />
                  <span>
                    Deja vote : <strong>{existingVote}</strong>
                  </span>
                </div>
              ) : (
                <div className={styles.voteButtons}>
                  <VoteButton
                    vote="for"
                    selected={pendingVote === 'for'}
                    onClick={() => onSetVote(resolution.id, 'for')}
                  />
                  <VoteButton
                    vote="against"
                    selected={pendingVote === 'against'}
                    onClick={() => onSetVote(resolution.id, 'against')}
                  />
                  <VoteButton
                    vote="abstention"
                    selected={pendingVote === 'abstention'}
                    onClick={() => onSetVote(resolution.id, 'abstention')}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit section */}
      <div className={styles.submitSection}>
        <div className={styles.submitInfo}>
          <Clock size={16} />
          <span>
            {votedCount} / {totalResolutions} resolution(s) selectionnee(s)
          </span>
        </div>

        {submitResult && (
          <div
            className={clsx(
              styles.submitResult,
              submitResult.success ? styles.submitSuccess : styles.submitError
            )}
          >
            {submitResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {submitResult.message}
          </div>
        )}

        <div className={styles.submitActions}>
          <button
            onClick={onClearVotes}
            className={styles.clearButton}
            disabled={votedCount === 0}
          >
            Reinitialiser
          </button>
          <button
            onClick={onSubmit}
            className={styles.submitButton}
            disabled={!canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                Enregistrement...
              </>
            ) : (
              <>
                <Check size={16} />
                Enregistrer les votes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
