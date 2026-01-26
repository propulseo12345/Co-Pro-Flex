/**
 * Mock Data - Générateurs d'identifiants et de références
 *
 * @description Fonctions utilitaires pour générer des IDs uniques et des références
 *              compatibles avec le futur schéma Supabase (UUID v4)
 *
 * @author Migration CoProFlex
 * @created 2025-01-19
 */

// ============================================
// PRÉFIXES D'ENTITÉS (convention Supabase-ready)
// ============================================

export const ENTITY_PREFIXES = {
  USER: 'usr',
  COPROPRIETAIRE: 'cpro',
  LOT: 'lot',
  FOURNISSEUR: 'four',
  FACTURE: 'fac',
  AVOIR: 'avo',
  CONTRAT: 'ctr',
  ORDRE_SERVICE: 'os',
  DOCUMENT: 'doc',
  ASSEMBLEE: 'ag',
  RESOLUTION: 'res',
  BUDGET: 'bdg',
  BUDGET_TRAVAUX: 'bdgt',
  MOUVEMENT: 'mvt',
  OPERATION: 'op',
  APPEL_FONDS: 'af',
  PAIEMENT: 'pai',
  VENTE: 'vte',
  IMPAYE: 'imp',
  LITIGE: 'lit',
  PRESTATAIRE: 'pres',
  INTERVENTION: 'int',
  EVENT: 'evt',
  FORUM_TOPIC: 'top',
  FORUM_MESSAGE: 'msg',
  CONVERSATION: 'conv',
  COPROPRIETE: 'cop',
  HISTORIQUE: 'hist',
  PIECE_JOINTE: 'pj',
} as const;

export type EntityPrefix = typeof ENTITY_PREFIXES[keyof typeof ENTITY_PREFIXES];

// ============================================
// GÉNÉRATEUR UUID V4
// ============================================

/**
 * Génère un UUID v4 conforme RFC 4122
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Génère un ID préfixé pour une entité
 * Format: prefix_uuid
 *
 * @example generateEntityId('USER') → 'usr_a1b2c3d4-e5f6-4g7h-8i9j-k0l1m2n3o4p5'
 */
export function generateEntityId(entityType: keyof typeof ENTITY_PREFIXES): string {
  const prefix = ENTITY_PREFIXES[entityType];
  const uuid = generateUUID();
  return `${prefix}_${uuid}`;
}

/**
 * Génère un ID préfixé avec un UUID court (8 caractères)
 * Utile pour les références lisibles
 *
 * @example generateShortId('FACTURE') → 'fac_a1b2c3d4'
 */
export function generateShortId(entityType: keyof typeof ENTITY_PREFIXES): string {
  const prefix = ENTITY_PREFIXES[entityType];
  const shortUuid = generateUUID().split('-')[0];
  return `${prefix}_${shortUuid}`;
}

// ============================================
// GÉNÉRATEUR DE RÉFÉRENCES MÉTIER
// ============================================

/**
 * Génère une référence de facture
 * Format: FAC-YYYY-XXXX
 *
 * @example generateFactureReference(2025, 1) → 'FAC-2025-0001'
 */
export function generateFactureReference(year: number, sequence: number): string {
  return `FAC-${year}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Génère une référence d'avoir
 * Format: AVO-YYYY-XXXX
 */
export function generateAvoirReference(year: number, sequence: number): string {
  return `AVO-${year}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Génère une référence d'ordre de service
 * Format: OS-YYYY-XXXX
 */
export function generateOrdreServiceReference(year: number, sequence: number): string {
  return `OS-${year}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Génère une référence d'appel de fonds
 * Format: AF-YYYY-TX-XXXX (T = trimestre)
 */
export function generateAppelFondsReference(
  year: number,
  trimestre: 1 | 2 | 3 | 4,
  sequence: number
): string {
  return `AF-${year}-T${trimestre}-${sequence.toString().padStart(4, '0')}`;
}

/**
 * Génère une référence de résolution AG
 * Format: RES-YYYY-AG-XXX
 */
export function generateResolutionReference(year: number, sequence: number): string {
  return `RES-${year}-AG-${sequence.toString().padStart(3, '0')}`;
}

/**
 * Génère un numéro de pièce comptable
 * Format: PREFIX-YYYY-XXXX
 */
export function generateNumeroPiece(
  type: 'FAC' | 'REG' | 'OD' | 'AN' | 'AF',
  year: number,
  sequence: number
): string {
  return `${type}-${year}-${sequence.toString().padStart(4, '0')}`;
}

// ============================================
// GÉNÉRATEURS DE DATES
// ============================================

/**
 * Génère une date ISO 8601 à partir des composants
 */
export function generateISODate(year: number, month: number, day: number): string {
  const m = month.toString().padStart(2, '0');
  const d = day.toString().padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Génère un timestamp ISO 8601 complet
 */
export function generateISOTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): string {
  const date = generateISODate(year, month, day);
  const h = hour.toString().padStart(2, '0');
  const min = minute.toString().padStart(2, '0');
  const sec = second.toString().padStart(2, '0');
  return `${date}T${h}:${min}:${sec}Z`;
}

/**
 * Retourne les timestamps created_at et updated_at pour une entité
 */
export function generateTimestamps(createdAt?: string): {
  created_at: string;
  updated_at: string;
} {
  const now = new Date().toISOString();
  return {
    created_at: createdAt || now,
    updated_at: now,
  };
}

// ============================================
// TABLE DE CORRESPONDANCE IDS (migration)
// ============================================

/**
 * Table de correspondance des anciens IDs vers les nouveaux UUIDs
 * À utiliser pendant la migration pour maintenir les relations
 */
export interface IdMappingEntry {
  oldId: string;
  newId: string;
  entityType: keyof typeof ENTITY_PREFIXES;
  sourceFile: string;
}

export const ID_MAPPING_TABLE: IdMappingEntry[] = [];

/**
 * Enregistre une correspondance ancien ID → nouveau ID
 */
export function registerIdMapping(
  oldId: string,
  newId: string,
  entityType: keyof typeof ENTITY_PREFIXES,
  sourceFile: string
): void {
  ID_MAPPING_TABLE.push({ oldId, newId, entityType, sourceFile });
}

/**
 * Récupère le nouvel ID à partir de l'ancien
 */
export function getNewId(oldId: string): string | undefined {
  const entry = ID_MAPPING_TABLE.find((e) => e.oldId === oldId);
  return entry?.newId;
}

/**
 * Récupère l'ancien ID à partir du nouveau
 */
export function getOldId(newId: string): string | undefined {
  const entry = ID_MAPPING_TABLE.find((e) => e.newId === newId);
  return entry?.oldId;
}

// ============================================
// GÉNÉRATEURS MOCK SPÉCIFIQUES
// ============================================

/**
 * Génère un IBAN français fictif (format valide)
 */
export function generateMockIBAN(): string {
  const bankCode = Math.floor(Math.random() * 90000 + 10000);
  const branchCode = Math.floor(Math.random() * 90000 + 10000);
  const accountNumber = Math.floor(Math.random() * 90000000000 + 10000000000);
  const checkDigits = Math.floor(Math.random() * 90 + 10);
  return `FR76 ${bankCode} ${branchCode} ${accountNumber} ${checkDigits}`;
}

/**
 * Génère un numéro SIRET fictif (format valide)
 */
export function generateMockSIRET(): string {
  const siren = Math.floor(Math.random() * 900000000 + 100000000);
  const nic = Math.floor(Math.random() * 90000 + 10000);
  return `${siren}${nic}`;
}

/**
 * Génère un numéro de téléphone français fictif
 */
export function generateMockPhone(mobile: boolean = true): string {
  const prefix = mobile ? '06' : '01';
  const part1 = Math.floor(Math.random() * 90 + 10);
  const part2 = Math.floor(Math.random() * 90 + 10);
  const part3 = Math.floor(Math.random() * 90 + 10);
  const part4 = Math.floor(Math.random() * 90 + 10);
  return `${prefix} ${part1} ${part2} ${part3} ${part4}`;
}
