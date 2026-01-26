import {
  isValid,
  isBefore,
  isAfter,
  addDays,
  differenceInDays,
  differenceInMonths,
  startOfDay,
  parse,
  format,
} from 'date-fns';
import { fr } from 'date-fns/locale';

// ========================================
// CONSTANTES LÉGALES
// ========================================

/** Délai minimum entre convocation et AG (jours) - Loi ALUR */
export const DELAI_CONVOCATION_AG = 21;

/** Durée maximum d'un mandat de syndic (mois) */
export const DUREE_MAX_MANDAT_SYNDIC = 36;

/** Durée minimum d'un mandat de syndic (mois) */
export const DUREE_MIN_MANDAT_SYNDIC = 3;

/** Délai de contestation AG (mois) */
export const DELAI_CONTESTATION_AG = 2;

/** Durée max d'un exercice comptable (mois) */
export const DUREE_MAX_EXERCICE = 18;

// ========================================
// FORMATAGE
// ========================================

/**
 * Formate une date en français (JJ/MM/AAAA)
 */
export function formatDateFR(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'dd/MM/yyyy', { locale: fr });
}

/**
 * Formate une date longue en français (1er janvier 2025)
 */
export function formatDateLongFR(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'd MMMM yyyy', { locale: fr });
}

/**
 * Formate une date avec heure en français
 */
export function formatDateTimeFR(date: Date | null | undefined): string {
  if (!date || !isValid(date)) return '';
  return format(date, 'dd/MM/yyyy à HH:mm', { locale: fr });
}

/**
 * Parse une date depuis le format français (JJ/MM/AAAA)
 */
export function parseDateFR(text: string): Date | null {
  if (!text || text.length !== 10) return null;
  const parsed = parse(text, 'dd/MM/yyyy', new Date(), { locale: fr });
  return isValid(parsed) ? parsed : null;
}

// ========================================
// VALIDATIONS GÉNÉRIQUES
// ========================================

export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

/**
 * Valide qu'une valeur est une date valide
 */
export function validateIsDate(value: unknown): ValidationResult {
  if (!value) {
    return { isValid: false, error: 'La date est requise' };
  }

  if (!(value instanceof Date) || !isValid(value)) {
    return { isValid: false, error: 'Date invalide' };
  }

  return { isValid: true, error: null };
}

/**
 * Valide qu'une date est dans une plage
 */
export function validateDateRange(
  date: Date,
  options: {
    minDate?: Date;
    maxDate?: Date;
    minLabel?: string;
    maxLabel?: string;
  }
): ValidationResult {
  const { minDate, maxDate, minLabel = 'minimum', maxLabel = 'maximum' } = options;

  if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) {
    return {
      isValid: false,
      error: `La date doit être après le ${formatDateFR(minDate)} (${minLabel})`
    };
  }

  if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) {
    return {
      isValid: false,
      error: `La date doit être avant le ${formatDateFR(maxDate)} (${maxLabel})`
    };
  }

  return { isValid: true, error: null };
}

// ========================================
// VALIDATIONS MÉTIER COPROPRIÉTÉ
// ========================================

/**
 * Valide les dates d'exercice comptable
 */
export function validateDatesExercice(
  dateDebut: Date,
  dateFin: Date
): ValidationResult {
  if (isBefore(dateFin, dateDebut)) {
    return {
      isValid: false,
      error: 'La date de fin d\'exercice doit être postérieure à la date de début'
    };
  }

  const mois = differenceInMonths(dateFin, dateDebut);
  if (mois > DUREE_MAX_EXERCICE) {
    return {
      isValid: false,
      error: `Un exercice comptable ne peut pas dépasser ${DUREE_MAX_EXERCICE} mois`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Valide la date d'AG par rapport à la convocation
 */
export function validateDateAGvsConvocation(
  dateAG: Date,
  dateConvocation: Date
): ValidationResult {
  const jours = differenceInDays(dateAG, dateConvocation);

  if (jours < DELAI_CONVOCATION_AG) {
    return {
      isValid: false,
      error: `L'AG doit avoir lieu au moins ${DELAI_CONVOCATION_AG} jours après l'envoi des convocations (délai légal). Actuellement : ${jours} jours.`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Calcule la date minimum d'AG depuis une date de convocation
 */
export function getDateMinAG(dateConvocation: Date): Date {
  return addDays(dateConvocation, DELAI_CONVOCATION_AG);
}

/**
 * Calcule la date maximum de convocation pour une date d'AG
 */
export function getDateMaxConvocation(dateAG: Date): Date {
  return addDays(dateAG, -DELAI_CONVOCATION_AG);
}

/**
 * Valide la date limite des votes par correspondance
 */
export function validateDateLimiteCorrespondance(
  dateLimite: Date,
  dateAG: Date
): ValidationResult {
  if (!isBefore(dateLimite, dateAG)) {
    return {
      isValid: false,
      error: 'La date limite de réception des votes par correspondance doit être antérieure à la date de l\'AG'
    };
  }

  // Recommandation : au moins 3 jours avant
  const jours = differenceInDays(dateAG, dateLimite);
  if (jours < 3) {
    return {
      isValid: true, // Warning, pas bloquant
      error: `Attention : seulement ${jours} jour(s) entre la date limite et l'AG. Il est recommandé de prévoir au moins 3 jours.`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Valide les dates de mandat de syndic
 */
export function validateDatesMandat(
  dateDebut: Date,
  dateFin: Date
): ValidationResult {
  if (isBefore(dateFin, dateDebut)) {
    return {
      isValid: false,
      error: 'La date de fin de mandat doit être postérieure à la date de début'
    };
  }

  const mois = differenceInMonths(dateFin, dateDebut);

  if (mois < DUREE_MIN_MANDAT_SYNDIC) {
    return {
      isValid: false,
      error: `La durée du mandat doit être d'au moins ${DUREE_MIN_MANDAT_SYNDIC} mois`
    };
  }

  if (mois > DUREE_MAX_MANDAT_SYNDIC) {
    return {
      isValid: false,
      error: `La durée du mandat ne peut pas dépasser ${DUREE_MAX_MANDAT_SYNDIC} mois (3 ans)`
    };
  }

  return { isValid: true, error: null };
}

/**
 * Valide une date d'échéance (doit être dans le futur)
 */
export function validateDateEcheance(
  date: Date,
  options: { allowPast?: boolean; minDays?: number } = {}
): ValidationResult {
  const { allowPast = false, minDays = 0 } = options;
  const today = startOfDay(new Date());

  if (!allowPast && isBefore(startOfDay(date), today)) {
    return {
      isValid: false,
      error: 'La date d\'échéance doit être dans le futur'
    };
  }

  if (minDays > 0) {
    const minDate = addDays(today, minDays);
    if (isBefore(startOfDay(date), minDate)) {
      return {
        isValid: false,
        error: `La date d\'échéance doit être dans au moins ${minDays} jours`
      };
    }
  }

  return { isValid: true, error: null };
}

// ========================================
// HOOK DE VALIDATION PERSONNALISÉ
// ========================================

export type DateValidationRule =
  | { type: 'required' }
  | { type: 'minDate'; date: Date; label?: string }
  | { type: 'maxDate'; date: Date; label?: string }
  | { type: 'afterDate'; date: Date; label: string; minDays?: number }
  | { type: 'beforeDate'; date: Date; label: string; maxDays?: number }
  | { type: 'exercice'; dateDebut: Date }
  | { type: 'convocationAG'; dateConvocation: Date }
  | { type: 'correspondanceAG'; dateAG: Date }
  | { type: 'mandat'; dateDebut: Date }
  | { type: 'future'; minDays?: number }
  | { type: 'custom'; validate: (date: Date) => string | null };

/**
 * Crée un validateur combinant plusieurs règles
 */
export function createDateValidator(rules: DateValidationRule[]) {
  return (date: Date): string | null => {
    for (const rule of rules) {
      let result: ValidationResult;

      switch (rule.type) {
        case 'required':
          result = validateIsDate(date);
          break;

        case 'minDate':
          result = validateDateRange(date, { minDate: rule.date, minLabel: rule.label });
          break;

        case 'maxDate':
          result = validateDateRange(date, { maxDate: rule.date, maxLabel: rule.label });
          break;

        case 'afterDate': {
          const minAfter = rule.minDays ? addDays(rule.date, rule.minDays) : rule.date;
          result = validateDateRange(date, {
            minDate: minAfter,
            minLabel: `après ${rule.label}${rule.minDays ? ` + ${rule.minDays} jours` : ''}`
          });
          break;
        }

        case 'beforeDate': {
          const maxBefore = rule.maxDays ? addDays(rule.date, -rule.maxDays) : rule.date;
          result = validateDateRange(date, {
            maxDate: maxBefore,
            maxLabel: `avant ${rule.label}${rule.maxDays ? ` - ${rule.maxDays} jours` : ''}`
          });
          break;
        }

        case 'exercice':
          result = validateDatesExercice(rule.dateDebut, date);
          break;

        case 'convocationAG':
          result = validateDateAGvsConvocation(date, rule.dateConvocation);
          break;

        case 'correspondanceAG':
          result = validateDateLimiteCorrespondance(date, rule.dateAG);
          break;

        case 'mandat':
          result = validateDatesMandat(rule.dateDebut, date);
          break;

        case 'future':
          result = validateDateEcheance(date, { minDays: rule.minDays });
          break;

        case 'custom': {
          const error = rule.validate(date);
          result = { isValid: !error, error };
          break;
        }

        default:
          continue;
      }

      if (!result.isValid) {
        return result.error;
      }
    }

    return null;
  };
}
