/**
 * Entities - Export centralisé
 *
 * @description Point d'entrée unique pour toutes les mock data
 * @created 2025-01-19
 *
 * Organisation par batch :
 * - Batch 1 : Core (users, coproprietes, coproprietaires)
 * - Batch 2 : Lots & Fournisseurs
 * - Batch 3 : Finance
 * - Batch 4 : Maintenance
 * - Batch 5 : Documents & AG
 * - Batch 6 : Ventes, Impayés, Communication
 */

// ============================================
// BATCH 1 - Core
// ============================================
export * from './users';
export * from './coproprietes';
export * from './coproprietaires';

// ============================================
// BATCH 2 - Lots & Fournisseurs
// ============================================
export * from './lots';
export * from './fournisseurs';

// ============================================
// BATCH 3 - Finance
// ============================================
export * from './comptes-bancaires';
export * from './categories-comptables';
export * from './factures';
export * from './budgets';
export * from './appels-fonds';
export * from './mouvements-bancaires';
export * from './operations-comptables';

// ============================================
// BATCH 4 - Maintenance
// ============================================
export * from './prestataires';
export * from './contrats';
export * from './ordres-service';
export * from './interventions';

// ============================================
// BATCH 5 - Documents & AG
// ============================================
export * from './documents';
export * from './assemblees';
export * from './resolutions';
export * from './votes';
export * from './mandats';

// ============================================
// BATCH 6 - Ventes, Impayés, Communication
// ============================================
export * from './ventes';
export * from './impayes';
export * from './litiges';
export * from './forum';
export * from './events';
export * from './conversations';
