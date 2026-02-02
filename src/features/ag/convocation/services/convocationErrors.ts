/**
 * Gestion des erreurs pour Convocation
 */

import { CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import type { ConvocationError, DegradedMode, LoadingStatus } from '../types';

export { CONVOCATION_ERROR_CODES };

export function createConvocationError(
  code: string,
  message: string,
  details?: string
): ConvocationError {
  return { code, message, details };
}

export function createInvalidAgIdError(agId: string): ConvocationError {
  return {
    code: CONVOCATION_ERROR_CODES.INVALID_AG_ID,
    message: 'Identifiant AG invalide',
    details: `L'identifiant "${agId}" n'est pas un UUID valide. Créez une AG via la page de planification.`,
  };
}

export function createTimeoutError(timeoutMs: number): ConvocationError {
  return {
    code: CONVOCATION_ERROR_CODES.TIMEOUT_LOADING,
    message: 'Le chargement a pris trop de temps',
    details: `Délai de ${timeoutMs / 1000}s dépassé. Veuillez réessayer.`,
  };
}

export function createAgNotFoundError(agId: string): ConvocationError {
  return {
    code: CONVOCATION_ERROR_CODES.AG_NOT_FOUND,
    message: 'Assemblée générale non trouvée',
    details: `Aucune AG avec l'identifiant "${agId}" n'a été trouvée dans Supabase. Créez d'abord une AG ou vérifiez l'URL.`,
  };
}

export function createUnexpectedError(err: unknown): ConvocationError {
  return {
    code: CONVOCATION_ERROR_CODES.UNEXPECTED_ERROR,
    message: 'Erreur de chargement',
    details: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.',
  };
}

export function createAuthRequiredError(): ConvocationError {
  return {
    code: CONVOCATION_ERROR_CODES.LOAD_COPROPRIETAIRES_FAILED,
    message: 'Authentification requise',
    details: 'Session auth requise pour charger les copropriétaires (401)',
  };
}

export function determineStatus(
  degradedMode: DegradedMode,
  hasAgData: boolean
): LoadingStatus {
  const hasCriticalError = degradedMode.agDataFailed && !hasAgData;
  const hasDegradedData = degradedMode.resolutionsFailed || degradedMode.coproprietairesFailed;

  if (hasCriticalError) return 'error';
  if (hasDegradedData) return 'degraded';
  return 'ready';
}

export function createInitialDegradedMode(): DegradedMode {
  return {
    agDataFailed: false,
    resolutionsFailed: false,
    coproprietairesFailed: false,
  };
}
