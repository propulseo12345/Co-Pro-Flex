export * from './components';

// Page hook
export { useConvocationPage } from './hooks/useConvocationPage';
export type {
  ActiveTab,
  UseConvocationPageResult,
  CoproprietaireDelivery,
  VariableValidationResult,
} from './hooks/useConvocationPage';

// Data hooks (refactored)
export { useConvocationData } from './hooks/useConvocationData';
export { useConvocationCore } from './hooks/useConvocationCore';
export { useConvocationAg } from './hooks/useConvocationAg';
export { useConvocationResolutions } from './hooks/useConvocationResolutions';
export { useConvocationCoproprietaires } from './hooks/useConvocationCoproprietaires';
export { useConvocationDraft } from './hooks/useConvocationDraft';

// Types
export type {
  AdressePostale,
  AGData,
  Resolution,
  Coproprietaire,
  CoproprietaireEditable,
  CoproprieteInfo,
  SyndicInfo,
  SendingMethod,
  SendingChoice,
  LoadingStatus,
  DegradedMode,
  ConvocationError,
  ConvocationState,
  UseConvocationDataOptions,
  UseConvocationDataReturn,
  DraftMetadata,
} from './types';

// Services
export {
  CONVOCATION_ERROR_CODES,
  createConvocationError,
  createInvalidAgIdError,
  createTimeoutError,
  createAgNotFoundError,
  createUnexpectedError,
  createAuthRequiredError,
  determineStatus,
  createInitialDegradedMode,
} from './services/convocationErrors';

export {
  TYPE_MAPPING_FROM_DB,
  extractDateFromISO,
  extractTimeFromISO,
  deserializeMetadata,
} from './services/convocationHelpers';
