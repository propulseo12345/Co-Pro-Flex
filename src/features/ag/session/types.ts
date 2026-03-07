import type { PasserelleMajorite } from '@/types';
import type {
  Resolution,
  VoteData,
  SessionState,
  VoteChoice,
  VoteSource,
  VoteStats,
  PasserelleVoteInitial,
  EditingVariable,
} from '../types';
import type { PresenceData } from '@/lib/utils/ag-session';
import type { MajorityType } from '@/lib/constants/resolutions';
import type { SessionPersistenceStatus, SessionPersistenceError, RestoreResult } from '@/hooks/modules/useAGSessionPersistence';
import type { AgMeeting, AgResolutionResult, AgAttendanceSummary } from '@/lib/ag/types';

export type { Resolution, VoteData, SessionState, VoteChoice, VoteSource, VoteStats, PasserelleVoteInitial, EditingVariable };
export type { PresenceData, MajorityType };
export type { SessionPersistenceStatus, SessionPersistenceError, RestoreResult };

export interface Coproprietaire {
  id: string;
  nom: string;
  email: string | null;
  tantiemes: number;
  lotIds: string[];
  lotRefs: string[];
}

export interface SessionDraftData {
  started: boolean;
  currentResolutionIndex: number;
  completedResolutions: string[];
  isSecondVote?: boolean;
  passerelleResolution?: Resolution | null;
  passerelleVoteInitial?: PasserelleVoteInitial | null;
  presencesEnrichies?: Record<string, PresenceData>;
}

export interface UseAgSessionPageParams {
  agId: string;
}

export interface UseAgSessionPageReturn {
  // State
  resolutions: Resolution[];
  votes: VoteData[];
  sessionState: SessionState;
  presences: Record<string, boolean>;
  presencesEnrichies: Record<string, PresenceData>;
  votesCorrespondanceCount: number;
  currentResolution: Resolution | undefined;
  stats: VoteStats | null;
  totalTantiemes: number;
  isCurrentResolutionInfo: boolean;
  isSecondVote: boolean;
  allVariables: Record<string, string>;
  prefillVariables: Record<string, string>;
  variableValues: Record<string, string>;
  budgetPrevisionnel: number;
  fondsTravauxMontant: number;

  // Modals state
  showResultModal: boolean;
  pendingNextResolution: boolean;
  showPasserelleModal: boolean;
  passerelleResolution: Resolution | null;
  passerelleVoteInitial: PasserelleVoteInitial | null;
  showVariableModal: boolean;
  showFinancingModal: boolean;
  showFondsALURModal: boolean;
  financingSchedule: import('@/components/features/ag/FinancingScheduleEditor/FinancingScheduleEditor').FinancingSchedule | null;
  editingVariable: EditingVariable | null;
  showValidationWarning: boolean;
  missingVariables: string[];
  showPrefillDropdown: string | null;
  showAjoutDesignationModal: boolean;
  designationCategorie: 'scrutateur' | 'conseil_syndical' | null;
  designationNombreActuel: number;
  showProjectorModal: boolean;
  projectorUrl: string;
  copiedToClipboard: boolean;

  // Persistence state
  persistenceStatus: SessionPersistenceStatus;
  isRestoring: boolean;
  lastSaveDate: Date | null;
  hasUnsavedChanges: boolean;
  restoreResult: RestoreResult | null;
  persistenceError: SessionPersistenceError | null;
  isOnline: boolean;
  hasExistingData: boolean;
  retryRestore: () => void;
  startNewSession: () => void;

  // Presence handlers
  handlePresenceToggle: (coproId: string) => void;
  selectAllPresences: () => void;
  handleBasculerPresent: (coproId: string) => void;
  handleAnnulerBascule: (coproId: string) => void;

  // Vote handlers
  handleVote: (resolutionId: string, coproId: string, vote: VoteChoice) => Promise<void>;
  selectAllVotes: (resolutionId: string, voteType: VoteChoice) => void;
  handleValidateVote: () => void;
  handleNextWithValidation: () => void;
  handleNextResolution: () => void;
  handlePrevResolution: () => void;
  handleNavigateToResolution: (index: number) => void;
  handleValidateSecondVote: () => void;

  // Passerelle handlers
  handlePasserelleSecondVote: () => void;
  handlePasserelleAjournement: () => void;

  // Variable handlers
  handleVariableClick: (variableName: string) => void;
  handleSaveVariable: () => void;
  handleSaveFinancing: (modalite: string, datesEcheances: string, schedule: import('@/components/features/ag/FinancingScheduleEditor/FinancingScheduleEditor').FinancingSchedule) => void;
  closeFinancingModal: () => void;
  handleSaveFondsALUR: (pourcentage: string, montant: string) => void;
  closeFondsALURModal: () => void;
  handlePrefillFromCopro: (variableName: string, coproId: string) => void;
  setEditingVariable: React.Dispatch<React.SetStateAction<EditingVariable | null>>;
  setShowPrefillDropdown: React.Dispatch<React.SetStateAction<string | null>>;

  // Session handlers
  handleStartSession: () => Promise<void>;
  handleCancelSession: () => Promise<void>;
  handleFinishSession: () => Promise<void>;
  isSessionActive: boolean;
  saveSession: () => Promise<void>;

  // Projector handlers
  handleOpenProjector: () => void;
  handleCopyProjectorUrl: () => Promise<void>;
  handleOpenProjectorNewTab: () => void;
  closeProjectorModal: () => void;

  // Export
  handleExportCSV: () => void;

  // Designation handlers
  handleDesignationConfirmAjout: () => void;
  handleDesignationRefuserAjout: () => void;

  // Modal handlers
  closeResultModal: () => void;
  confirmNextFromModal: () => void;
  closeVariableModal: () => void;
  closeValidationWarning: () => void;
  confirmContinueWithWarning: () => void;
  setShowPasserelleModal: React.Dispatch<React.SetStateAction<boolean>>;

  // Navigation
  goBack: () => void;
  goToPV: () => void;

  // Supabase integration
  useSupabase: boolean;
  isManager: boolean;
  meeting: AgMeeting | null;
  dbLoading: boolean;
  coproprietaires: Coproprietaire[];
}
