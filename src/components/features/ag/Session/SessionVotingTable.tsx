'use client';

import { CheckCircle, XCircle, MinusCircle, CheckSquare, Mail } from 'lucide-react';
import { VoteChoice, VoteData } from './types';
import { getVoteForCopro, hasVotedByCorrespondance } from './utils';
import votingStyles from './styles/voting.module.css';
import badgesStyles from './styles/badges.module.css';

interface Coproprietaire {
  id: string;
  nom: string;
  tantiemes: number;
}

interface SessionVotingTableProps {
  coproprietaires: Coproprietaire[];
  resolutionId: string;
  votes: VoteData[];
  presences: Record<string, boolean>;
  onVote: (resolutionId: string, coproId: string, vote: VoteChoice) => void;
  onSelectAllVotes: (resolutionId: string, voteType: VoteChoice) => void;
}

export function SessionVotingTable({
  coproprietaires,
  resolutionId,
  votes,
  presences,
  onVote,
  onSelectAllVotes
}: SessionVotingTableProps) {
  return (
    <div className={votingStyles.votingSection}>
      <h3>Votes en direct</h3>
      <div className={votingStyles.votingTable}>
        <div className={votingStyles.votingTableHeader}>
          <div className={votingStyles.votingTableHeaderCell}>Copropriétaire</div>
          <div className={votingStyles.votingTableHeaderCell}>
            <div className={votingStyles.votingTableHeaderContent}>
              <span>Pour</span>
              <button
                type="button"
                onClick={() => onSelectAllVotes(resolutionId, 'POUR')}
                className={votingStyles.selectAllButton}
              >
                <CheckSquare size={14} aria-hidden="true" />
                Tout cocher
              </button>
            </div>
          </div>
          <div className={votingStyles.votingTableHeaderCell}>
            <div className={votingStyles.votingTableHeaderContent}>
              <span>Contre</span>
              <button
                type="button"
                onClick={() => onSelectAllVotes(resolutionId, 'CONTRE')}
                className={votingStyles.selectAllButton}
              >
                <CheckSquare size={14} aria-hidden="true" />
                Tout cocher
              </button>
            </div>
          </div>
          <div className={votingStyles.votingTableHeaderCell}>
            <div className={votingStyles.votingTableHeaderContent}>
              <span>Abstention</span>
              <button
                type="button"
                onClick={() => onSelectAllVotes(resolutionId, 'ABSTENTION')}
                className={votingStyles.selectAllButton}
              >
                <CheckSquare size={14} aria-hidden="true" />
                Tout cocher
              </button>
            </div>
          </div>
        </div>
        <div className={votingStyles.votingTableBody}>
          {coproprietaires.filter(copro => presences[copro.id]).map(copro => {
            const vote = getVoteForCopro(votes, resolutionId, copro.id);
            const isCorrespondanceVoter = hasVotedByCorrespondance(votes, resolutionId, copro.id);

            return (
              <div key={copro.id} className={`${votingStyles.votingTableRow} ${isCorrespondanceVoter ? votingStyles.votingTableRowDisabled : ''}`}>
                <div className={votingStyles.votingTableCell}>
                  <div className={votingStyles.coproInfo}>
                    <div className={votingStyles.coproName}>
                      {copro.nom}
                      {isCorrespondanceVoter && (
                        <span className={badgesStyles.correspondanceBadge}>
                          <Mail size={12} aria-hidden="true" />
                          Correspondance
                        </span>
                      )}
                    </div>
                    <div className={votingStyles.coproDetails}>
                      {copro.tantiemes} tantièmes
                    </div>
                  </div>
                </div>
                <div className={votingStyles.votingTableCell}>
                  <button
                    onClick={() => onVote(resolutionId, copro.id, 'POUR')}
                    className={`${votingStyles.voteButton} ${votingStyles.voteButtonPour} ${vote === 'POUR' ? votingStyles.voteButtonActive : ''}`}
                    disabled={isCorrespondanceVoter}
                  >
                    <CheckCircle size={18} aria-hidden="true" />
                    Pour
                  </button>
                </div>
                <div className={votingStyles.votingTableCell}>
                  <button
                    onClick={() => onVote(resolutionId, copro.id, 'CONTRE')}
                    className={`${votingStyles.voteButton} ${votingStyles.voteButtonContre} ${vote === 'CONTRE' ? votingStyles.voteButtonActive : ''}`}
                    disabled={isCorrespondanceVoter}
                  >
                    <XCircle size={18} aria-hidden="true" />
                    Contre
                  </button>
                </div>
                <div className={votingStyles.votingTableCell}>
                  <button
                    onClick={() => onVote(resolutionId, copro.id, 'ABSTENTION')}
                    className={`${votingStyles.voteButton} ${votingStyles.voteButtonAbstention} ${vote === 'ABSTENTION' ? votingStyles.voteButtonActive : ''}`}
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
