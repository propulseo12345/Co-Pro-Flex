/**
 * Utilitaires de gestion des dates - CoProFlex
 *
 * Ce module centralise toutes les opérations de dates pour assurer:
 * - Une gestion cohérente du timezone Europe/Paris
 * - Des formats de date français standardisés
 * - Un parsing sûr des dates provenant de la base de données
 *
 * @module dates
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Timezone par défaut pour l'application (France) */
export const TIMEZONE = 'Europe/Paris';

/** Locale par défaut pour le formatage des dates */
export const LOCALE = 'fr-FR';

/** Année de l'exercice comptable actuel */
export const ANNEE_EXERCICE_ACTUEL = 2026;

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

/**
 * Parse une date ISO provenant de la base de données.
 * Gère les formats avec ou sans timezone de manière sécurisée.
 *
 * @param isoString - Date au format ISO (ex: "2026-01-27T10:30:00Z" ou "2026-01-27")
 * @returns Date JavaScript correctement parsée, ou null si invalide
 *
 * @example
 * const date = parseDbDate("2026-01-27T10:30:00Z");
 * const dateOnly = parseDbDate("2026-01-27");
 */
export function parseDbDate(isoString: string | null | undefined): Date | null {
  if (!isoString) return null;

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      // Invalid date string
      return null;
    }
    return date;
  } catch {
    // Failed to parse date
    return null;
  }
}

/**
 * Parse une date ISO et retourne une Date, avec fallback sur la date actuelle.
 * Utile quand on a besoin d'une date garantie non-null.
 *
 * @param isoString - Date au format ISO
 * @param fallback - Date de fallback (défaut: now)
 * @returns Date parsée ou fallback
 */
export function parseDbDateOrNow(
  isoString: string | null | undefined,
  fallback: Date = new Date()
): Date {
  return parseDbDate(isoString) ?? fallback;
}

// ============================================================================
// FORMATTING FUNCTIONS
// ============================================================================

/**
 * Formate une date en français (jour/mois/année).
 *
 * @param date - Date à formater (Date, string ISO, ou null)
 * @returns Date formatée "27/01/2026" ou "-" si invalide
 *
 * @example
 * formatDateFR(new Date()) // "27/01/2026"
 * formatDateFR("2026-01-27") // "27/01/2026"
 * formatDateFR(null) // "-"
 */
export function formatDateFR(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return '-';

  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formate une date en français avec le nom du mois (27 janvier 2026).
 *
 * @param date - Date à formater
 * @returns Date formatée "27 janvier 2026" ou "-" si invalide
 */
export function formatDateLongFR(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return '-';

  return d.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date et heure en français (27/01/2026 14:30).
 *
 * @param date - Date à formater
 * @returns Date et heure formatées ou "-" si invalide
 *
 * @example
 * formatDateTimeFR(new Date()) // "27/01/2026 14:30"
 */
export function formatDateTimeFR(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return '-';

  return d.toLocaleDateString(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formate uniquement l'heure (14:30).
 *
 * @param date - Date à formater
 * @returns Heure formatée ou "-" si invalide
 */
export function formatTimeFR(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return '-';

  return d.toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Formate une date relative (il y a 2 heures, hier, etc.).
 *
 * @param date - Date à comparer avec maintenant
 * @returns Description relative de la date
 */
export function formatRelativeFR(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return '-';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;

  return formatDateFR(d);
}

// ============================================================================
// DATE CREATION FUNCTIONS
// ============================================================================

/**
 * Retourne la date actuelle en timezone Europe/Paris.
 * Utilise l'heure système mais représente le jour en France.
 *
 * @returns Date actuelle
 *
 * @example
 * const today = todayParis();
 */
export function todayParis(): Date {
  return new Date();
}

/**
 * Retourne le début du jour actuel (00:00:00) en timezone locale.
 *
 * @returns Date à minuit du jour actuel
 */
export function startOfToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * Retourne la fin du jour actuel (23:59:59) en timezone locale.
 *
 * @returns Date à 23:59:59 du jour actuel
 */
export function endOfToday(): Date {
  const now = new Date();
  now.setHours(23, 59, 59, 999);
  return now;
}

/**
 * Crée une date ISO string pour aujourd'hui (sans heure).
 *
 * @returns String au format "2026-01-27"
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ============================================================================
// COMPARISON FUNCTIONS
// ============================================================================

/**
 * Compare deux dates de manière sûre (gère strings et null).
 *
 * @param a - Première date
 * @param b - Seconde date
 * @returns -1 si a < b, 0 si égales, 1 si a > b
 *
 * @example
 * const sorted = dates.sort(safeCompareDates);
 */
export function safeCompareDates(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined
): number {
  const dateA = typeof a === 'string' ? parseDbDate(a) : a;
  const dateB = typeof b === 'string' ? parseDbDate(b) : b;

  // Null values go to the end
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;

  return dateA.getTime() - dateB.getTime();
}

/**
 * Vérifie si une date est dans le passé.
 *
 * @param date - Date à vérifier
 * @returns true si la date est passée
 */
export function isPast(date: Date | string | null | undefined): boolean {
  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return false;
  return d.getTime() < Date.now();
}

/**
 * Vérifie si une date est dans le futur.
 *
 * @param date - Date à vérifier
 * @returns true si la date est future
 */
export function isFuture(date: Date | string | null | undefined): boolean {
  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return false;
  return d.getTime() > Date.now();
}

/**
 * Vérifie si deux dates sont le même jour.
 *
 * @param a - Première date
 * @param b - Seconde date
 * @returns true si même jour
 */
export function isSameDay(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined
): boolean {
  const dateA = typeof a === 'string' ? parseDbDate(a) : a;
  const dateB = typeof b === 'string' ? parseDbDate(b) : b;

  if (!dateA || !dateB) return false;

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

/**
 * Vérifie si une date est aujourd'hui.
 *
 * @param date - Date à vérifier
 * @returns true si c'est aujourd'hui
 */
export function isToday(date: Date | string | null | undefined): boolean {
  return isSameDay(date, new Date());
}

// ============================================================================
// DATE MATH FUNCTIONS
// ============================================================================

/**
 * Ajoute des jours à une date.
 *
 * @param date - Date de départ
 * @param days - Nombre de jours à ajouter (peut être négatif)
 * @returns Nouvelle date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Ajoute des mois à une date.
 *
 * @param date - Date de départ
 * @param months - Nombre de mois à ajouter (peut être négatif)
 * @returns Nouvelle date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calcule le nombre de jours entre deux dates.
 *
 * @param a - Première date
 * @param b - Seconde date
 * @returns Nombre de jours (positif ou négatif)
 */
export function daysBetween(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined
): number | null {
  const dateA = typeof a === 'string' ? parseDbDate(a) : a;
  const dateB = typeof b === 'string' ? parseDbDate(b) : b;

  if (!dateA || !dateB) return null;

  const diffMs = dateB.getTime() - dateA.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// ============================================================================
// FISCAL YEAR FUNCTIONS
// ============================================================================

/**
 * Retourne l'année de l'exercice comptable actuel.
 * En copropriété, l'exercice suit généralement l'année civile.
 *
 * @returns Année de l'exercice (ex: 2026)
 */
export function getExerciceActuel(): number {
  return ANNEE_EXERCICE_ACTUEL;
}

/**
 * Retourne une liste des N dernières années d'exercice.
 *
 * @param count - Nombre d'années à retourner (défaut: 3)
 * @returns Liste des années ["2026", "2025", "2024"]
 */
export function getExercicesList(count: number = 3): string[] {
  const current = getExerciceActuel();
  // Include next year (N+1) since budgets are voted at AG year N for year N+1
  return Array.from({ length: count + 1 }, (_, i) => (current + 1 - i).toString());
}

/**
 * Vérifie si une date appartient à l'exercice actuel.
 *
 * @param date - Date à vérifier
 * @returns true si la date est dans l'exercice actuel
 */
export function isInCurrentExercice(date: Date | string | null | undefined): boolean {
  const d = typeof date === 'string' ? parseDbDate(date) : date;
  if (!d) return false;
  return d.getFullYear() === getExerciceActuel();
}

// ============================================================================
// PERIOD HELPERS
// ============================================================================

/**
 * Retourne le trimestre d'une date (1-4).
 *
 * @param date - Date à analyser
 * @returns Numéro du trimestre (1-4)
 */
export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Retourne le label du trimestre (T1, T2, T3, T4).
 *
 * @param date - Date à analyser
 * @returns Label du trimestre
 */
export function getQuarterLabel(date: Date): string {
  return `T${getQuarter(date)}`;
}

/**
 * Retourne les bornes du trimestre courant.
 *
 * @returns { start: Date, end: Date }
 */
export function getCurrentQuarterBounds(): { start: Date; end: Date } {
  const now = new Date();
  const quarter = getQuarter(now);
  const year = now.getFullYear();

  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

  return { start, end };
}

// ============================================================================
// EXPORT DEFAULT OBJECT FOR CONVENIENCE
// ============================================================================

const dates = {
  // Parsing
  parseDbDate,
  parseDbDateOrNow,

  // Formatting
  formatDateFR,
  formatDateLongFR,
  formatDateTimeFR,
  formatTimeFR,
  formatRelativeFR,

  // Creation
  todayParis,
  startOfToday,
  endOfToday,
  todayISO,

  // Comparison
  safeCompareDates,
  isPast,
  isFuture,
  isSameDay,
  isToday,

  // Math
  addDays,
  addMonths,
  daysBetween,

  // Fiscal
  getExerciceActuel,
  getExercicesList,
  isInCurrentExercice,

  // Periods
  getQuarter,
  getQuarterLabel,
  getCurrentQuarterBounds,

  // Constants
  TIMEZONE,
  LOCALE,
  ANNEE_EXERCICE_ACTUEL,
};

export default dates;
