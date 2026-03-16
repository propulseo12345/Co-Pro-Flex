/**
 * Utilitaires centralisés pour la gestion des périodes/exercices
 *
 * RÈGLE IMPORTANTE:
 * - L'affichage "aujourd'hui" peut utiliser Date.now()
 * - La logique métier (exercice, périodes, budgets, AG) utilise ces fonctions
 *
 * TODO: À terme, openPeriod depuis Supabase sera la source de vérité
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Année d'exercice courante (hard-coded pour stabilité)
 * Sera remplacé par lecture de la période ouverte en DB
 */
const CURRENT_BUSINESS_YEAR = 2026;

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Retourne l'année d'exercice courante
 * Source de vérité unique pour toute la logique métier
 */
export function getCurrentBusinessYear(): number {
  return CURRENT_BUSINESS_YEAR;
}

/**
 * Retourne la plage de dates par défaut pour l'exercice courant
 */
export function getDefaultPeriodRange(): { start: string; end: string } {
  const year = getCurrentBusinessYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

/**
 * Normalise une date en format ISO YYYY-MM-DD
 * Accepte: Date, string ISO, timestamp
 */
export function normalizeDateInput(date: Date | string | number): string {
  let d: Date;

  if (date instanceof Date) {
    d = date;
  } else if (typeof date === 'string') {
    d = new Date(date);
  } else {
    d = new Date(date);
  }

  // Vérifier que la date est valide
  if (isNaN(d.getTime())) {
    // Invalid date input
    return `${CURRENT_BUSINESS_YEAR}-01-01`;
  }

  return d.toISOString().split('T')[0];
}

/**
 * Vérifie si une date appartient à l'exercice courant
 * En mode dev, log un warning si hors exercice
 */
export function isInCurrentBusinessYear(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  return year === CURRENT_BUSINESS_YEAR;
}

/**
 * Assertion: vérifie que la date est dans l'exercice courant
 * Log un warning en dev si ce n'est pas le cas
 */
export function assertBusinessYear(date: Date | string, context?: string): void {
  if (process.env.NODE_ENV === 'development') {
    if (!isInCurrentBusinessYear(date)) {
      const d = typeof date === 'string' ? new Date(date) : date;
      // Date hors exercice
    }
  }
}

/**
 * Formate une date pour affichage en français
 */
export function formatDateFR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date courte (JJ/MM/AAAA)
 */
export function formatDateShortFR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR');
}

/**
 * Retourne le trimestre d'une date (1-4)
 */
export function getQuarter(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  return Math.floor(d.getMonth() / 3) + 1;
}

/**
 * Retourne le label du trimestre
 */
export function getQuarterLabel(quarter: number): string {
  const labels: Record<number, string> = {
    1: 'T1',
    2: 'T2',
    3: 'T3',
    4: 'T4',
  };
  return labels[quarter] || 'T?';
}

/**
 * Retourne la date du début du trimestre
 */
export function getQuarterStart(year: number, quarter: number): string {
  const month = (quarter - 1) * 3;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/**
 * Retourne la date de fin du trimestre
 */
export function getQuarterEnd(year: number, quarter: number): string {
  const endMonth = quarter * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`;
}

// ============================================================================
// HELPERS POUR MIGRATION
// ============================================================================

/**
 * Retourne "aujourd'hui" pour affichage uniquement
 * NE PAS utiliser pour la logique métier (budgets, périodes, etc.)
 */
export function getDisplayToday(): Date {
  return new Date();
}

/**
 * Retourne la date "métier" par défaut
 * À utiliser quand on crée des entités (AG, appels, etc.)
 */
export function getDefaultBusinessDate(): string {
  const today = new Date();
  // Si on est dans l'exercice courant, on utilise aujourd'hui
  if (today.getFullYear() === CURRENT_BUSINESS_YEAR) {
    return normalizeDateInput(today);
  }
  // Sinon, on utilise le 1er janvier de l'exercice
  return `${CURRENT_BUSINESS_YEAR}-01-01`;
}
