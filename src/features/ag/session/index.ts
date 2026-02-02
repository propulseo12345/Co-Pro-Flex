// Main hook export
export { useAgSessionPage } from './hooks/useAgSessionPage';

// Sub-hooks
export {
  useSessionParticipants,
  useSessionPresence,
  useSessionVoting,
  useSessionResolutions,
  useSessionVariables,
  useSessionProjector,
  useSessionModals,
} from './hooks';

// Types
export type {
  Coproprietaire,
  SessionDraftData,
  UseAgSessionPageParams,
  UseAgSessionPageReturn,
  Resolution,
  VoteData,
  SessionState,
  VoteChoice,
  VoteSource,
  VoteStats,
  PasserelleVoteInitial,
  EditingVariable,
  PresenceData,
  MajorityType,
} from './types';

// Services
export { calculateQuorum } from './services/quorum';
export { exportSessionToCSV } from './services/sessionExport';
export { debounce, toDbVote, fromDbVote, fromDbMajorityType } from './services/sessionHelpers';
