/**
 * API Layer pour Lots et Clés de Répartition
 * P0#2: Migration Mock → Supabase
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES - LOTS
// ============================================================================

export type LotType =
  | 'appartement'
  | 'studio'
  | 'parking'
  | 'cave'
  | 'local_commercial'
  | 'bureau'
  | 'garage'
  | 'box'
  | 'jardin'
  | 'terrasse'
  | 'balcon'
  | 'loggia'
  | 'autre';

export interface LotWithOwner {
  id: string;
  copro_id: string;
  ref: string;
  type: LotType | null;
  floor: number | null;
  surface: number | null;
  description: string | null;
  tantiemes_generaux: number;
  tantiemes_ascenseur: number | null;
  tantiemes_chauffage: number | null;
  tantiemes_escalier: number | null;
  building_id: string | null;
  building_name: string | null;
  coproprietaire_id: string | null;
  owner_display_name: string | null;
  owner_first_name: string | null;
  owner_last_name: string | null;
  owner_email: string | null;
  share_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface LotCreate {
  copro_id: string;
  ref: string;
  type?: LotType | null;
  floor?: number | null;
  surface?: number | null;
  description?: string | null;
  tantiemes_generaux: number;
  tantiemes_ascenseur?: number | null;
  tantiemes_chauffage?: number | null;
  tantiemes_escalier?: number | null;
  building_id?: string | null;
}

export interface LotUpdate {
  ref?: string;
  type?: LotType | null;
  floor?: number | null;
  surface?: number | null;
  description?: string | null;
  tantiemes_generaux?: number;
  tantiemes_ascenseur?: number | null;
  tantiemes_chauffage?: number | null;
  tantiemes_escalier?: number | null;
  building_id?: string | null;
}

// ============================================================================
// TYPES - CLÉS DE RÉPARTITION
// ============================================================================

export type RepartitionBasis = 'tantiemes' | 'surface' | 'custom';
export type CoverageMode = 'all_lots' | 'subset';

export interface RepartitionKey {
  id: string;
  copro_id: string;
  name: string;
  description: string | null;
  basis: RepartitionBasis;
  coverage_mode: CoverageMode;
  is_active: boolean;
  created_at: string;
}

export interface RepartitionKeyWithTotals {
  key_id: string;
  copro_id: string;
  name: string;
  description: string | null;
  basis: RepartitionBasis;
  coverage_mode: CoverageMode;
  is_active: boolean;
  total_weight: number;
  lots_count: number;
  lots_with_weight_count: number;
  is_complete: boolean;
}

export interface RepartitionKeyCreate {
  copro_id: string;
  name: string;
  description?: string | null;
  basis: RepartitionBasis;
  coverage_mode?: CoverageMode;
  is_active?: boolean;
}

export interface RepartitionKeyUpdate {
  name?: string;
  description?: string | null;
  basis?: RepartitionBasis;
  coverage_mode?: CoverageMode;
  is_active?: boolean;
}

export interface RepartitionKeyLine {
  id: string;
  copro_id: string;
  key_id: string;
  lot_id: string;
  weight: number;
  created_at: string;
}

export interface RepartitionKeyLineDetailed {
  line_id: string;
  copro_id: string;
  key_id: string;
  key_name: string;
  basis: RepartitionBasis;
  coverage_mode: CoverageMode;
  lot_id: string;
  lot_ref: string;
  lot_type: LotType | null;
  tantiemes_generaux: number;
  surface: number | null;
  weight: number;
  share_pct: number;
}

export interface RepartitionKeyLineUpsert {
  copro_id: string;
  key_id: string;
  lot_id: string;
  weight: number;
}

// ============================================================================
// API FUNCTIONS - LOTS
// ============================================================================

/**
 * Liste tous les lots d'une copropriété avec leurs propriétaires actuels
 */
export async function listLotsWithOwners(
  coproId: string
): Promise<{ data: LotWithOwner[] | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_lots_with_owners')
    .select('*')
    .eq('copro_id', coproId)
    .order('ref', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as LotWithOwner[], error: null };
}

/**
 * Récupère un lot par ID
 */
export async function getLot(
  coproId: string,
  lotId: string
): Promise<{ data: LotWithOwner | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_lots_with_owners')
    .select('*')
    .eq('copro_id', coproId)
    .eq('id', lotId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as LotWithOwner, error: null };
}

/**
 * Crée un nouveau lot
 */
export async function createLot(
  payload: LotCreate
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('lots')
    .insert({
      ...payload,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  // Auto-créer les lignes de clé pour toutes les clés existantes (basis=tantiemes → weight=tantiemes_generaux)
  const lotId = data.id as string;
  const { data: activeKeys } = await supabase
    .from('repartition_keys')
    .select('id, basis, coverage_mode')
    .eq('copro_id', payload.copro_id)
    .eq('is_active', true);

  if (activeKeys && activeKeys.length > 0) {
    const keyLines = (activeKeys as Array<{ id: string; basis: string; coverage_mode: string }>)
      .filter(k => k.coverage_mode === 'all_lots')
      .map(k => ({
        copro_id: payload.copro_id,
        key_id: k.id,
        lot_id: lotId,
        weight: k.basis === 'tantiemes'
          ? (payload.tantiemes_generaux || 0)
          : k.basis === 'surface'
            ? (payload.surface || 0)
            : 0,
      }));

    if (keyLines.length > 0) {
      await supabase.from('repartition_key_lines').insert(keyLines);
    }
  }

  return { data: { id: lotId }, error: null };
}

/**
 * Met à jour un lot
 */
export async function updateLot(
  coproId: string,
  lotId: string,
  updates: LotUpdate
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('lots')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('copro_id', coproId)
    .eq('id', lotId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Supprime un lot
 */
export async function deleteLot(
  coproId: string,
  lotId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('lots')
    .delete()
    .eq('copro_id', coproId)
    .eq('id', lotId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// ============================================================================
// API FUNCTIONS - CLÉS DE RÉPARTITION
// ============================================================================

/**
 * Liste les clés de répartition avec totaux
 */
export async function listRepartitionKeys(
  coproId: string
): Promise<{ data: RepartitionKeyWithTotals[] | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_repartition_key_totals')
    .select('*')
    .eq('copro_id', coproId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as RepartitionKeyWithTotals[], error: null };
}

/**
 * Récupère une clé de répartition par ID
 */
export async function getRepartitionKey(
  coproId: string,
  keyId: string
): Promise<{ data: RepartitionKeyWithTotals | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_repartition_key_totals')
    .select('*')
    .eq('copro_id', coproId)
    .eq('key_id', keyId)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as RepartitionKeyWithTotals, error: null };
}

/**
 * Crée une nouvelle clé de répartition
 */
export async function createRepartitionKey(
  payload: RepartitionKeyCreate
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('repartition_keys')
    .insert({
      ...payload,
      coverage_mode: payload.coverage_mode || 'all_lots',
      is_active: payload.is_active ?? true,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: { id: data.id }, error: null };
}

/**
 * Met à jour une clé de répartition
 */
export async function updateRepartitionKey(
  coproId: string,
  keyId: string,
  updates: RepartitionKeyUpdate
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('repartition_keys')
    .update(updates)
    .eq('copro_id', coproId)
    .eq('id', keyId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Supprime une clé de répartition
 */
export async function deleteRepartitionKey(
  coproId: string,
  keyId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  // Soft delete : désactiver la clé au lieu de la supprimer
  // Les budget_lines peuvent référencer cette clé, un hard delete casserait la contrainte FK
  const { error } = await supabase
    .from('repartition_keys')
    .update({ is_active: false })
    .eq('copro_id', coproId)
    .eq('id', keyId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

// ============================================================================
// API FUNCTIONS - LIGNES DE CLÉ DE RÉPARTITION
// ============================================================================

/**
 * Liste les lignes détaillées d'une clé de répartition
 */
export async function listRepartitionKeyLines(
  coproId: string,
  keyId: string
): Promise<{ data: RepartitionKeyLineDetailed[] | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_repartition_key_lines_detailed')
    .select('*')
    .eq('copro_id', coproId)
    .eq('key_id', keyId)
    .order('lot_ref', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as RepartitionKeyLineDetailed[], error: null };
}

/**
 * Upsert une ligne de clé de répartition
 * Si la ligne existe (même key_id + lot_id), on met à jour
 * Sinon on crée
 */
export async function upsertRepartitionKeyLine(
  payload: RepartitionKeyLineUpsert
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('repartition_key_lines')
    .upsert(
      {
        copro_id: payload.copro_id,
        key_id: payload.key_id,
        lot_id: payload.lot_id,
        weight: payload.weight,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'key_id,lot_id',
        ignoreDuplicates: false,
      }
    );

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Met à jour le poids d'une ligne
 */
export async function updateRepartitionKeyLineWeight(
  coproId: string,
  keyId: string,
  lotId: string,
  weight: number
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('repartition_key_lines')
    .update({ weight })
    .eq('copro_id', coproId)
    .eq('key_id', keyId)
    .eq('lot_id', lotId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Supprime une ligne de clé de répartition
 */
export async function deleteRepartitionKeyLine(
  coproId: string,
  keyId: string,
  lotId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  const { error } = await supabase
    .from('repartition_key_lines')
    .delete()
    .eq('copro_id', coproId)
    .eq('key_id', keyId)
    .eq('lot_id', lotId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Initialise les lignes d'une clé avec tous les lots
 * Utilisé lors de la création d'une clé coverage_mode = 'all_lots'
 */
export async function initializeRepartitionKeyLines(
  coproId: string,
  keyId: string,
  basis: RepartitionBasis
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  // Récupérer tous les lots de la copro
  const { data: lots, error: lotsError } = await supabase
    .from('lots')
    .select('id, tantiemes_generaux, surface')
    .eq('copro_id', coproId);

  if (lotsError) {
    return { success: false, error: new Error(lotsError.message) };
  }

  if (!lots || lots.length === 0) {
    return { success: true, error: null };
  }

  // Préparer les lignes selon la base
  const lines = lots.map((lot: { id: string; tantiemes_generaux: number; surface: number | null }) => ({
    copro_id: coproId,
    key_id: keyId,
    lot_id: lot.id,
    weight: basis === 'tantiemes'
      ? lot.tantiemes_generaux
      : basis === 'surface'
        ? (lot.surface || 0)
        : 0,
    created_at: new Date().toISOString(),
  }));

  // Insérer toutes les lignes
  const { error } = await supabase
    .from('repartition_key_lines')
    .insert(lines);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Assigne un propriétaire à un lot
 * Termine l'ownership précédent (end_date = today) et crée le nouveau
 */
export async function assignOwnerToLot(
  coproId: string,
  lotId: string,
  coproprietaireId: string | null
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  // Clôturer l'ownership actuel
  const { error: endError } = await supabase
    .from('lot_owners')
    .update({ end_date: new Date().toISOString().split('T')[0] })
    .eq('copro_id', coproId)
    .eq('lot_id', lotId)
    .is('end_date', null);

  if (endError) {
    return { success: false, error: new Error(endError.message) };
  }

  // Si pas de nouveau proprio, on s'arrête là
  if (!coproprietaireId) {
    return { success: true, error: null };
  }

  // Créer le nouvel ownership
  const { error: insertError } = await supabase
    .from('lot_owners')
    .insert({
      copro_id: coproId,
      lot_id: lotId,
      coproprietaire_id: coproprietaireId,
      share_percent: 100,
      is_primary: true,
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      created_at: new Date().toISOString(),
    });

  if (insertError) {
    return { success: false, error: new Error(insertError.message) };
  }

  return { success: true, error: null };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  totalCalcule: number;
  totalAttendu: number;
  ecart: number;
  warnings: string[];
}

/**
 * Valide une clé de répartition
 * Vérifie que le total des poids est cohérent
 */
export async function validateRepartitionKey(
  coproId: string,
  keyId: string
): Promise<{ data: ValidationResult | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // Récupérer la clé avec ses totaux
  const { data: key, error: keyError } = await supabase
    .from('v_repartition_key_totals')
    .select('*')
    .eq('copro_id', coproId)
    .eq('key_id', keyId)
    .single();

  if (keyError) {
    return { data: null, error: new Error(keyError.message) };
  }

  // Récupérer le total tantièmes de la copro pour comparaison
  const { data: copro, error: coproError } = await supabase
    .from('copros')
    .select('total_tantiemes')
    .eq('id', coproId)
    .single();

  if (coproError) {
    return { data: null, error: new Error(coproError.message) };
  }

  const warnings: string[] = [];
  const totalCalcule = key.total_weight || 0;
  const totalAttendu = copro.total_tantiemes || 10000;

  // Vérifications
  if (!key.is_complete) {
    warnings.push(`${key.lots_count - key.lots_with_weight_count} lot(s) sans poids défini`);
  }

  if (key.basis === 'tantiemes' && totalCalcule !== totalAttendu) {
    warnings.push(`Le total (${totalCalcule}) ne correspond pas au total de la copropriété (${totalAttendu})`);
  }

  if (totalCalcule === 0) {
    warnings.push('Aucun poids défini pour cette clé');
  }

  const result: ValidationResult = {
    isValid: warnings.length === 0,
    totalCalcule,
    totalAttendu,
    ecart: totalCalcule - totalAttendu,
    warnings,
  };

  return { data: result, error: null };
}
