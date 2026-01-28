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
// MODULES EN DÉVELOPPEMENT
// ============================================================================

/**
 * Module Budget - Migration Supabase
 * Quand false: utilise les données mock
 * Quand true: utilise l'API Supabase
 */
export const BUDGET_USE_SUPABASE = false;

/**
 * Module Ventes - Migration Supabase
 * Quand false: utilise les données mock
 * Quand true: utilise l'API Supabase
 */
export const VENTES_USE_SUPABASE = false;

/**
 * Dashboard - Données dynamiques
 * @deprecated Le dashboard utilise maintenant toujours Supabase.
 * Ce flag est conservé pour compatibilité mais n'est plus utilisé.
 */
export const DASHBOARD_USE_SUPABASE = true;

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

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Vérifie si un module utilise Supabase
 */
export function moduleUsesSupabase(module: 'budget' | 'ventes' | 'dashboard'): boolean {
  switch (module) {
    case 'budget':
      return BUDGET_USE_SUPABASE;
    case 'ventes':
      return VENTES_USE_SUPABASE;
    case 'dashboard':
      return DASHBOARD_USE_SUPABASE;
    default:
      return false;
  }
}
