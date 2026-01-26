/**
 * CoProFlex - Mock Data Centralisées
 *
 * @description Point d'entrée unique pour toutes les données mock
 *              Migré et centralisé depuis les fichiers dispersés
 *
 * @created 2025-01-19
 * @version 1.0.0
 * @total ~308 entités
 *
 * @usage
 * ```typescript
 * // Import de données spécifiques
 * import { USERS_MOCK, USER_IDS, getUserById } from '@/lib/mock-data'
 *
 * // Import de types
 * import type { BaseEntity, Adresse } from '@/lib/mock-data'
 *
 * // Import de relations
 * import { ENTITY_RELATIONS, SEED_ORDER } from '@/lib/mock-data'
 * ```
 *
 * Organisation :
 * - /types      : Types communs (BaseEntity, Adresse, etc.)
 * - /utils      : Générateurs (UUID, dates, etc.)
 * - /entities   : Données mockées par domaine
 * - /relations  : Documentation des FK et ordre de seed
 */

// ============================================
// TYPES (types de base uniquement - pas d'enums pour éviter conflits avec entities)
// ============================================
export type {
  BaseEntity,
  SoftDeletableEntity,
  CoproprieteOwnedEntity,
  MontantCentimes,
  Tantiemes,
  Pourcentage,
  Adresse,
  Contact,
  PieceJointe,
  HistoriqueEntry,
} from './types';

// ============================================
// UTILS
// ============================================
export * from './utils';

// ============================================
// ENTITIES (toutes les données - inclut leurs types locaux)
// ============================================
export * from './entities';

// ============================================
// RELATIONS (documentation FK)
// ============================================
export { ENTITY_RELATIONS, SEED_ORDER } from './relations';
export type { EntityName, RelationType } from './relations';
export {
  getEntityRelations,
  getReferencingEntities,
  hasRelation,
} from './relations';

// ============================================
// STATS GLOBALES
// ============================================

export const MOCK_DATA_STATS = {
  version: '1.0.0',
  created_at: '2025-01-19',

  totals: {
    entities_types: 26,
    total_records: 308,

    by_batch: {
      batch1_core: 21, // users (6), coproprietes (2), coproprietaires (13)
      batch2_lots_fournisseurs: 25, // lots (15), fournisseurs (10)
      batch3_finance: 60, // comptes (2), categories (8), factures (10), budgets (5), appels (5), mouvements (15), operations (15)
      batch4_maintenance: 46, // prestataires (16), contrats (10), OS (9), interventions (11)
      batch5_documents_ag: 112, // documents (33), assemblees (7), resolutions (12), votes (48), mandats (12)
      batch6_autres: 44, // ventes (3), impayes (5), litiges (4), forum (14), events (7), conversations (11)
    },

    by_domain: {
      core: 21,
      finance: 60,
      maintenance: 46,
      legal: 119, // documents + AG + ventes + impayes + litiges
      communication: 32, // forum + events + conversations
    },
  },

  // KPIs pour le Dashboard (valeurs de référence)
  kpis_dashboard: {
    solde_disponible: 10533.31, // Compte courant
    budget_consomme_pct: 25, // % budget 2024 consommé
    impayes_total: 10170, // Total des impayés
    nb_impayes: 5,
    nb_ventes_en_cours: 3,
    nb_litiges_ouverts: 3,
    nb_contrats_actifs: 8,
    nb_interventions_planifiees: 4,
    prochaine_ag: '2026-06-13',
  },

  // Tantièmes de référence
  tantiemes: {
    total: 1818,
    nb_coproprietaires: 13,
    quorum_ag_minimum: 455, // 25%
    seuil_art_24: 910, // 50% + 1 des présents
    seuil_art_25: 910, // 50% + 1 de tous
    seuil_art_26: 1213, // 2/3 de tous
  },
} as const;

// ============================================
// TYPES UTILITAIRES POUR STATS
// ============================================

export type MockDataStats = typeof MOCK_DATA_STATS;
export type KPIDashboard = typeof MOCK_DATA_STATS.kpis_dashboard;
