'use client';

import { CheckCircle, XCircle, MinusCircle, CheckSquare, Mail } from 'lucide-react';
import { VoteChoice, VoteData } from './types';
import { getVoteForCopro, hasVotedByCorrespondance } from './utils';
import { MOCK_COPROPRIETAIRES } from '@/data/mock';
import styles from './Session.module.css';

interface SessionVotingTableProps {
  resolutionId: string;
  votes: VoteData[];
  presences: Record<string, boolean>;
  onVote: (resolutionId: string, coproId: string, vote: VoteChoice) => void;
  onSelectAllVotes: (resolutionId: string, voteType: VoteChoice) => void;
}

export function SessionVotingTable({
  resolutionId,
  votes,
  presences,
  onVote,
  onSelectAllVotes
}: SessionVotingTableProps) {
  return (
    <div className={styles.votingSection}>
      <h3>Votes en direct</h3>
      <div className={styles.votingTable}>
        <div className={styles.votingTableHeader}>
          <div className={styles.votingTableHeaderCell}>Copropriétaire</div>
          <div className={styles.votingTableHeaderCell}>
            <div className={styles.votingTableHeaderContent}>
              <span>Pour</span>
              <button
                type="button"
                onClick={() => onSelectAllVotes(resolutionId, 'POUR')}
                className={styles.selectAllButton}
              >
                <CheckSquare size={14} aria-hidden="true" />
                Tout cocher
              </button>
            </div>
          </div>
          <div className={styles.votingTableHeaderCell}>
            <div className={styles.votingTableHeaderContent}>
              <span>Contre</span>
              <button
                type="button"
                onClick={() => onSelectAllVotes(resolutionId, 'CONTRE')}
                className={styles.selectAllButton}
              >
                <CheckSquare size={14} aria-hidden="true" />
                Tout cocher
              </button>
            </div>
          </div>
          <div className={styles.votingTableHeaderCell}>
            <div className={styles.votingTableHeaderContent}>
              <span>Abstention</span>
              <button
                type="button"
                onClick={() => onSelectAllVotes(resolutionId, 'ABSTENTION')}
                className={styles.selectAllButton}
              >
                <CheckSquare size={14} aria-hidden="true" />
                Tout cocher
              </button>
            </div>
          </div>
        </div>
        <div className={styles.votingTableBody}>
          {MOCK_COPROPRIETAIRES.filter(copro => presences[copro.id]).map(copro => {
            const vote = getVoteForCopro(votes, resolutionId, copro.id);
            const isCorrespondanceVoter = hasVotedByCorrespondance(votes, resolutionId, copro.id);

            return (
              <div key={copro.id} className={`${styles.votingTableRow} ${isCorrespondanceVoter ? styles.votingTableRowDisabled : ''}`}>
                <div className={styles.votingTableCell}>
                  <div className={styles.coproInfo}>
                    <div className={styles.coproName}>
                      {copro.nom}
                      {isCorrespondanceVoter && (
                        <span className={styles.correspondanceBadge}>
                          <Mail size={12} aria-hidden="true" />
                          Correspondance
                        </span>
                      )}
                    </div>
                    <div className={styles.coproDetails}>
                      {copro.tantiemes} tantièmes
                    </div>
                  </div>
                </div>
                <div className={styles.votingTableCell}>
                  <button
                    onClick={() => onVote(resolutionId, copro.id, 'POUR')}
                    className={`${styles.voteButton} ${styles.voteButtonPour} ${vote === 'POUR' ? styles.voteButtonActive : ''}`}
                    disabled={isCorrespondanceVoter}
                  >
                    <CheckCircle size={18} aria-hidden="true" />
                    Pour
                  </button>
                </div>
                <div className={styles.votingTableCell}>
                  <button
                    onClick={() => onVote(resolutionId, copro.id, 'CONTRE')}
                    className={`${styles.voteButton} ${styles.voteButtonContre} ${vote === 'CONTRE' ? styles.voteButtonActive : ''}`}
                    disabled={isCorrespondanceVoter}
                  >
                    <XCircle size={18} aria-hidden="true" />
                    Contre
                  </button>
                </div>
                <div className={styles.votingTableCell}>
                  <button
                    onClick={() => onVote(resolutionId, copro.id, 'ABSTENTION')}
                    className={`${styles.voteButton} ${styles.voteButtonAbstention} ${vote === 'ABSTENTION' ? styles.voteButtonActive : ''}`}
                    disabled={isCorrespondanceVoter}
                  >
                    <MinusCircle size={18} aria-hidden="true" />
                    Abst.
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
