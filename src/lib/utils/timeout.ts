/**
 * Utilitaires de timeout pour les opérations asynchrones
 *
 * Permet de wrapper des promesses avec un timeout configurable
 * et des codes d'erreur standardisés.
 */

/**
 * Erreur de timeout personnalisée
 */
export class TimeoutError extends Error {
  public readonly errorCode: string;
  public readonly timeoutMs: number;

  constructor(message: string, errorCode: string, timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
    this.errorCode = errorCode;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Résultat d'une opération avec timeout
 */
export type TimeoutResult<T> =
  | { success: true; data: T }
  | { success: false; error: TimeoutError | Error; timedOut: boolean };

/**
 * Wrapper pour ajouter un timeout à une promesse
 *
 * @param promise - La promesse à wrapper
 * @param ms - Le timeout en millisecondes
 * @param errorCode - Le code d'erreur à utiliser en cas de timeout
 * @returns La valeur résolue de la promesse
 * @throws TimeoutError si le timeout est atteint
 *
 * @example
 * ```ts
 * try {
 *   const data = await withTimeout(fetchData(), 5000, 'ERR-FETCH-001');
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     console.log(`Timeout après ${error.timeoutMs}ms: ${error.errorCode}`);
 *   }
 * }
 * ```
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorCode: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new TimeoutError(
          `Opération expirée après ${ms}ms`,
          errorCode,
          ms
        )
      );
    }, ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    return result;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Version "safe" qui ne throw pas mais retourne un résultat typé
 *
 * @example
 * ```ts
 * const result = await withTimeoutSafe(fetchData(), 5000, 'ERR-FETCH-001');
 * if (result.success) {
 *   console.log(result.data);
 * } else if (result.timedOut) {
 *   console.log('Timeout!');
 * } else {
 *   console.log('Autre erreur:', result.error);
 * }
 * ```
 */
export async function withTimeoutSafe<T>(
  promise: Promise<T>,
  ms: number,
  errorCode: string
): Promise<TimeoutResult<T>> {
  try {
    const data = await withTimeout(promise, ms, errorCode);
    return { success: true, data };
  } catch (error) {
    const isTimeout = error instanceof TimeoutError;
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
      timedOut: isTimeout,
    };
  }
}

/**
 * Crée une promesse qui se résout après un délai
 *
 * @param ms - Le délai en millisecondes
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry avec timeout et backoff exponentiel
 *
 * @param fn - La fonction à réessayer
 * @param options - Options de configuration
 */
export async function retryWithTimeout<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    timeoutMs?: number;
    errorCode: string;
    backoffMs?: number;
  }
): Promise<T> {
  const { maxRetries = 3, timeoutMs = 5000, errorCode, backoffMs = 1000 } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await withTimeout(fn(), timeoutMs, errorCode);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Si ce n'est pas un timeout, on ne réessaye pas
      if (!(error instanceof TimeoutError)) {
        throw lastError;
      }

      // Attendre avant le prochain essai (backoff exponentiel)
      if (attempt < maxRetries - 1) {
        await delay(backoffMs * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new TimeoutError(
    `Échec après ${maxRetries} tentatives`,
    errorCode,
    timeoutMs
  );
}

/**
 * Timeout par défaut pour les opérations de chargement (en ms)
 */
export const DEFAULT_TIMEOUTS = {
  LOAD_DATA: 10000,      // 10 secondes pour charger des données
  GENERATE_PDF: 30000,   // 30 secondes pour générer un PDF
  SEND_EMAIL: 15000,     // 15 secondes pour envoyer un email
  QUICK_OPERATION: 5000, // 5 secondes pour une opération rapide
} as const;
