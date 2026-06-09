// ============================================================================
// API AG - Facade publique (re-exports)
// ============================================================================

// Meetings (AG CRUD & workflow)
export {
  listAgMeetings,
  getAg,
  createAg,
  closeAg,
  startAg,
  cancelAgSession,
  finishAgSession,
  archiveAg,
  updateAg,
  updateAgCurrentStep,
} from './meetings.api';

// Resolutions
export {
  listResolutions,
  addResolution,
  updateResolution,
  deleteResolution,
  reorderResolutions,
} from './resolutions.api';

// Session (Attendance, Quorum, Participants)
export {
  listAttendance,
  listAgVoters,
  listEligibleVoters,
  registerAttendance,
  removeAttendance,
  signAttendance,
} from './session.api';

// Votes
export {
  listVotes,
  castVote,
} from './votes.api';

// Convocation
export {
  markConvoked,
} from './convocation.api';

// Documents (Convocation, PV, etc.)
export {
  generateAgDocument,
  listAgDocuments,
  getLatestAgDocument,
  getAgDocumentSignedUrl,
  downloadAgDocument,
  hasAgDocument,
  markPvGenerated,
} from './documents.api';

// Finalisation
export {
  loadPendingActions,
  createBudgetFromAg,
  createAlurFundFromAg,
  electCouncilFromAg,
  markActionActivated,
  markAgFinalized,
} from './finalisation.api';
export type { BlocPoste, MembreConseil, PendingAction } from './finalisation.api';
