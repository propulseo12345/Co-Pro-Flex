/**
 * Utilitaires de formatage - re-exports depuis @/lib/utils
 * pour une utilisation simplifiée dans les features
 */

// Re-export des fonctions de formatage existantes
export {
  formatMontant,
  formatMontantTTC,
  formatMontantAvance,
  formatPourcentage,
  formatNumber,
  formatDureeMois,
  parseMontant,
} from '@/lib/utils/format';

// Re-export des fonctions de date existantes
export {
  formatDate,
  formatRelative,
  formatDateTZ,
  now,
  today,
  toParisTime,
  toUTC,
  isDateFuture,
  isDatePast,
  isDateToday,
  daysDiff,
  monthsDiff,
  parseDate,
  createParisDate,
} from '@/lib/utils/date';

// Alias pour compatibilité
export { formatMontant as formatMoney } from '@/lib/utils/format';
