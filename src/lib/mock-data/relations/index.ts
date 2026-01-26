/**
 * Relations entre entités
 *
 * @description Mapping des FK pour validation et documentation
 * @created 2025-01-19
 *
 * Conventions :
 * - belongs_to : FK vers une autre entité (N:1)
 * - has_many : Entités qui référencent cette entité (1:N)
 * - has_one : Relation 1:1
 * - many_to_many : Relation N:N (via table de jonction)
 */

// ============================================
// RELATIONS ENTRE ENTITÉS
// ============================================

export const ENTITY_RELATIONS = {
  // ============================================
  // CORE
  // ============================================
  users: {
    has_many: ['coproprietes', 'documents', 'forum_topics', 'forum_messages', 'events'],
  },

  coproprietes: {
    belongs_to: ['users'], // syndic_user_id, president_cs_user_id
    has_many: [
      'coproprietaires',
      'lots',
      'comptes_bancaires',
      'budgets',
      'appels_fonds',
      'assemblees',
      'contrats',
      'ordres_service',
      'documents',
      'ventes',
      'impayes',
      'litiges',
      'forum_topics',
      'events',
      'conversations',
    ],
  },

  coproprietaires: {
    belongs_to: ['coproprietes', 'users'],
    has_many: ['lots', 'votes', 'mandats', 'impayes', 'ventes', 'litiges'],
  },

  // ============================================
  // LOTS & FOURNISSEURS
  // ============================================
  lots: {
    belongs_to: ['coproprietes', 'coproprietaires'],
    has_many: ['ventes', 'ordres_service', 'litiges'],
  },

  fournisseurs: {
    belongs_to: ['coproprietes'],
    has_many: ['factures', 'contrats'],
  },

  // ============================================
  // FINANCE
  // ============================================
  comptes_bancaires: {
    belongs_to: ['coproprietes'],
    has_many: ['mouvements_bancaires', 'factures'],
  },

  categories_comptables: {
    has_many: ['factures', 'operations_comptables'],
  },

  factures: {
    belongs_to: [
      'coproprietes',
      'fournisseurs',
      'comptes_bancaires',
      'categories_comptables',
    ],
    has_many: ['mouvements_bancaires'],
  },

  budgets: {
    belongs_to: ['coproprietes', 'resolutions'],
    has_many: ['appels_fonds'],
  },

  appels_fonds: {
    belongs_to: ['coproprietes', 'budgets'],
    has_many: ['appels_fonds_lignes'], // Lignes par copropriétaire
  },

  mouvements_bancaires: {
    belongs_to: ['coproprietes', 'comptes_bancaires', 'factures'],
  },

  operations_comptables: {
    belongs_to: ['coproprietes', 'categories_comptables'],
  },

  // ============================================
  // MAINTENANCE
  // ============================================
  prestataires: {
    belongs_to: ['coproprietes'],
    has_many: ['contrats', 'ordres_service', 'interventions'],
  },

  contrats: {
    belongs_to: ['coproprietes', 'prestataires', 'fournisseurs'],
    has_many: ['interventions', 'ordres_service'],
  },

  ordres_service: {
    belongs_to: ['coproprietes', 'prestataires', 'contrats', 'lots'],
    has_many: ['interventions'],
  },

  interventions: {
    belongs_to: ['coproprietes', 'prestataires', 'contrats', 'ordres_service'],
  },

  // ============================================
  // DOCUMENTS & AG
  // ============================================
  documents: {
    belongs_to: ['coproprietes', 'assemblees', 'users'],
    has_many: [], // Documents terminaux
  },

  assemblees: {
    belongs_to: ['coproprietes'],
    has_many: ['resolutions', 'mandats', 'documents', 'votes'],
  },

  resolutions: {
    belongs_to: ['assemblees', 'budgets'],
    has_many: ['votes'],
  },

  votes: {
    belongs_to: ['resolutions', 'coproprietaires', 'assemblees'],
    // mandataire_id également FK vers coproprietaires
  },

  mandats: {
    belongs_to: ['assemblees', 'coproprietaires'],
    // mandant_id et mandataire_id sont tous deux FK vers coproprietaires
  },

  // ============================================
  // VENTES & IMPAYÉS
  // ============================================
  ventes: {
    belongs_to: ['coproprietes', 'lots', 'coproprietaires'],
    // vendeur_coproprietaire_id et acquereur_coproprietaire_id
  },

  impayes: {
    belongs_to: ['coproprietes', 'coproprietaires', 'lots', 'users'],
    // responsable_user_id
  },

  litiges: {
    belongs_to: ['coproprietes', 'coproprietaires', 'lots', 'users'],
    // plaignant_id, mis_en_cause_id, responsable_user_id
  },

  // ============================================
  // COMMUNICATION
  // ============================================
  forum_topics: {
    belongs_to: ['coproprietes', 'users'],
    has_many: ['forum_messages'],
  },

  forum_messages: {
    belongs_to: ['forum_topics', 'users'],
    has_many: ['forum_messages'], // Réponses (parent_message_id)
  },

  events: {
    belongs_to: ['coproprietes', 'users', 'assemblees', 'interventions'],
  },

  conversations: {
    belongs_to: ['coproprietes'],
    has_many: ['messages'],
    many_to_many: ['users'], // participant_ids
  },

  messages: {
    belongs_to: ['conversations', 'users'],
    has_many: ['messages'], // Réponses (reply_to_message_id)
  },
} as const;

// ============================================
// TYPES
// ============================================

export type EntityName = keyof typeof ENTITY_RELATIONS;

export type RelationType = 'belongs_to' | 'has_many' | 'has_one' | 'many_to_many';

// ============================================
// HELPERS
// ============================================

/**
 * Retourne les relations d'une entité
 */
export function getEntityRelations(entityName: EntityName) {
  return ENTITY_RELATIONS[entityName];
}

/**
 * Retourne toutes les entités qui référencent une entité donnée
 */
export function getReferencingEntities(entityName: string): EntityName[] {
  const referencing: EntityName[] = [];

  for (const [entity, relations] of Object.entries(ENTITY_RELATIONS)) {
    const belongsTo = (relations as { belongs_to?: readonly string[] }).belongs_to;
    if (belongsTo && belongsTo.includes(entityName)) {
      referencing.push(entity as EntityName);
    }
  }

  return referencing;
}

/**
 * Vérifie si une entité a une relation vers une autre
 */
export function hasRelation(
  fromEntity: EntityName,
  toEntity: string,
  relationType: RelationType = 'belongs_to'
): boolean {
  const relations = ENTITY_RELATIONS[fromEntity] as Record<string, readonly string[] | undefined>;
  const relationArray = relations[relationType];
  return Array.isArray(relationArray) && relationArray.includes(toEntity);
}

// ============================================
// ORDRE DE CRÉATION POUR SEED
// ============================================

/**
 * Ordre recommandé pour l'insertion en base (respecte les FK)
 */
export const SEED_ORDER: EntityName[] = [
  // 1. Entités sans dépendances
  'users',
  'categories_comptables',

  // 2. Entités de niveau 1
  'coproprietes',
  'fournisseurs',
  'prestataires',

  // 3. Entités de niveau 2
  'coproprietaires',
  'lots',
  'comptes_bancaires',
  'budgets',
  'assemblees',
  'contrats',

  // 4. Entités de niveau 3
  'appels_fonds',
  'factures',
  'ordres_service',
  'documents',
  'resolutions',
  'mandats',
  'ventes',
  'impayes',
  'litiges',
  'forum_topics',
  'events',
  'conversations',

  // 5. Entités terminales
  'mouvements_bancaires',
  'operations_comptables',
  'interventions',
  'votes',
  'forum_messages',
  'messages',
];
