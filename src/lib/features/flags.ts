/**
 * Feature Flags - Configuration centralisée
 *
 * Ces flags permettent d'activer/désactiver des fonctionnalités
 * sans modifier le code métier.
 *
 * RÈGLE: Un flag = un comportement clair
 */

// ============================================================================
// MODE COPROPRIÉTÉ
// ============================================================================

/**
 * Mode Single Copro
 *
 * Quand activé (true):
 * - L'interface utilise automatiquement la première copro disponible
 * - Le sélecteur de copro est masqué
 * - Les pages "NoCoproSelected" ne s'affichent pas
 *
 * Quand désactivé (false):
 * - L'utilisateur doit sélectionner une copro
 * - Le sélecteur de copro est affiché dans le header
 * - Mode multi-copro standard
 *
 * Note: Le backend reste multi-tenant (RLS par copro_id)
 */
export const SINGLE_COPRO_MODE = true;

/**
 * ID de la copro par défaut (optionnel)
 * Si défini, utilisé en priorité en mode single copro
 * Sinon, on prend la première copro accessible
 */
export const DEFAULT_COPRO_ID = process.env.NEXT_PUBLIC_DEFAULT_COPRO_ID || null;

// ============================================================================
// MODE DÉVELOPPEMENT
// ============================================================================

/**
 * Afficher les avertissements de date hors exercice
 */
export const WARN_OUT_OF_PERIOD_DATES = process.env.NODE_ENV === 'development';

/**
 * Logger les requêtes Supabase (debug)
 */
export const LOG_SUPABASE_QUERIES = false;

// ============================================================================
// UX FEATURES
// ============================================================================

/**
 * Mode compacté du dashboard
 * Quand true: affiche moins d'éléments par défaut, accordéons pour le reste
 */
export const DASHBOARD_COMPACT_MODE = true;

/**
 * Nombre max d'items dans "À faire maintenant" sur le dashboard
 */
export const DASHBOARD_MAX_PRIORITIES = 5;

/**
 * Nombre max d'items dans "Activité récente"
 */
export const DASHBOARD_MAX_ACTIVITIES = 6;
