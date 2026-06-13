/**
 * Logger utilitaire pour CoProFlex
 *
 * En développement: logs info, debug, warn, error autorisés
 * En production: uniquement error (configurable)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  agId?: string;
  step?: string;
  action?: string;
  component?: string;
  errorCode?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
}

const isDev = process.env.NODE_ENV === 'development';

// Configuration des niveaux de log par environnement
const LOG_LEVELS: Record<string, LogLevel[]> = {
  development: ['debug', 'info', 'warn', 'error'],
  production: ['error'],
  test: ['warn', 'error'],
};

const currentEnv = process.env.NODE_ENV || 'development';
const enabledLevels = LOG_LEVELS[currentEnv] || LOG_LEVELS.development;

function formatLogEntry(entry: LogEntry): string {
  const contextStr = entry.context
    ? ` | ${JSON.stringify(entry.context)}`
    : '';
  const stackStr = entry.stack ? `\n${entry.stack}` : '';
  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${stackStr}`;
}

function shouldLog(level: LogLevel): boolean {
  return enabledLevels.includes(level);
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
    stack: error?.stack,
  };
}

/**
 * Logger structuré pour l'application
 */
export const logger = {
  /**
   * Log de niveau debug (dev only)
   */
  debug(message: string, context?: LogContext): void {
    if (!shouldLog('debug')) return;
    const entry = createLogEntry('debug', message, context);
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(formatLogEntry(entry));
    }
  },

  /**
   * Log de niveau info (dev only)
   */
  info(message: string, context?: LogContext): void {
    if (!shouldLog('info')) return;
    const entry = createLogEntry('info', message, context);
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(formatLogEntry(entry));
    }
  },

  /**
   * Log de niveau warning
   */
  warn(message: string, context?: LogContext): void {
    if (!shouldLog('warn')) return;
    const entry = createLogEntry('warn', message, context);
    if (isDev) {
      console.warn(formatLogEntry(entry));
    }
  },

  /**
   * Log de niveau error (toujours actif)
   * Inclut automatiquement la stack trace si un Error est passé
   */
  error(message: string, context?: LogContext, error?: Error): void {
    if (!shouldLog('error')) return;

    const enrichedContext: LogContext = {
      ...context,
      errorCode: context?.errorCode || 'ERR-UNKNOWN',
    };

    const entry = createLogEntry('error', message, enrichedContext, error);

    if (isDev) {
      console.error(formatLogEntry(entry));
    }

    // En production, on pourrait envoyer à un service de monitoring
    // Ex: Sentry, LogRocket, etc.
    // if (!isDev) { sendToMonitoring(entry); }
  },

  /**
   * Helper pour créer un contexte AG standardisé
   */
  agContext(agId: string, step: string, action: string): LogContext {
    return { agId, step, action, component: 'AG' };
  },

  /**
   * Helper pour les erreurs de convocation
   */
  convocationError(
    agId: string,
    action: string,
    errorCode: string,
    error?: Error
  ): void {
    this.error(
      `Erreur convocation: ${action}`,
      {
        agId,
        step: 'convocation',
        action,
        component: 'ConvocationPage',
        errorCode,
      },
      error
    );
  },
};

// Codes d'erreur standardisés pour le module Convocation
export const CONVOCATION_ERROR_CODES = {
  LOAD_AG_DATA_FAILED: 'ERR-CONVOC-001',
  LOAD_RESOLUTIONS_FAILED: 'ERR-CONVOC-002',
  LOAD_COPROPRIETAIRES_FAILED: 'ERR-CONVOC-003',
  GENERATE_PDF_FAILED: 'ERR-CONVOC-004',
  TIMEOUT_LOADING: 'ERR-CONVOC-005',
  AG_NOT_FOUND: 'ERR-CONVOC-006',
  SEND_EMAIL_FAILED: 'ERR-CONVOC-007',
  SEND_COURRIER_FAILED: 'ERR-CONVOC-008',
  INVALID_AG_ID: 'ERR-CONVOC-009',
  UNEXPECTED_ERROR: 'ERR-CONVOC-010',
} as const;

export type ConvocationErrorCode = typeof CONVOCATION_ERROR_CODES[keyof typeof CONVOCATION_ERROR_CODES];
