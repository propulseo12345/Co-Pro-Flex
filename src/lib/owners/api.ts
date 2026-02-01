/**
 * API Layer pour Copropriétaires
 * P0#1: Migration Mock → Supabase
 */

import { createClient } from '@/lib/supabase/client';

// Helper: Create untyped client for views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface CoproprietaireOverview {
  id: string;
  copro_id: string;
  user_id: string | null;
  is_company: boolean;
  company_name: string | null;
  civility: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  prefers_email: boolean;
  prefers_paper: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  display_name: string;
  solde: number;
  owner_type: 'COPROPRIETAIRE' | 'ANCIEN';
  council_role: string | null;
  lots_count: number;
  total_tantiemes: number;
}

export interface CoproprietaireUpdate {
  is_company?: boolean;
  company_name?: string | null;
  civility?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  prefers_email?: boolean;
  prefers_paper?: boolean;
  notes?: string | null;
}

export interface LotWithOwner {
  id: string;
  copro_id: string;
  ref: string;
  type: string;
  floor: number | null;
  surface: number | null;
  tantiemes_generaux: number;
  tantiemes_escalier: number | null;
  tantiemes_ascenseur: number | null;
  building_name: string | null;
  coproprietaire_id: string | null;
  owner_display_name: string | null;
  owner_email: string | null;
  share_percent: number | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Liste les copropriétaires d'une copropriété
 * Note: La vue peut retourner des doublons, on déduplique par ID
 */
export async function listCoproprietaires(
  coproId: string,
  options?: { type?: 'COPROPRIETAIRE' | 'ANCIEN' | 'ALL' }
): Promise<{ data: CoproprietaireOverview[] | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // Build query based on type filter
  const filterType = options?.type && options.type !== 'ALL' ? options.type : null;

  let query = supabase
    .from('v_coproprietaires_overview')
    .select('*')
    .eq('copro_id', coproId)
    .order('display_name', { ascending: true });

  if (filterType) {
    query = query.eq('owner_type', filterType);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  // Dédupliquer par ID (la vue peut retourner des doublons)
  const uniqueMap = new Map<string, CoproprietaireOverview>();
  (data || []).forEach((c: CoproprietaireOverview) => {
    if (!uniqueMap.has(c.id)) {
      uniqueMap.set(c.id, c);
    }
  });

  return { data: Array.from(uniqueMap.values()), error: null };
}

/**
 * Récupère un copropriétaire par ID
 * Note: La vue peut retourner des doublons, on limite à 1 résultat
 */
export async function getCoproprietaire(
  coproId: string,
  id: string
): Promise<{ data: CoproprietaireOverview | null; error: Error | null }> {
  const supabase = createUntypedClient();

  const { data, error } = await supabase
    .from('v_coproprietaires_overview')
    .select('*')
    .eq('copro_id', coproId)
    .eq('id', id)
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as CoproprietaireOverview, error: null };
}

/**
 * Met à jour un copropriétaire
 */
export async function updateCoproprietaire(
  coproId: string,
  id: string,
  updates: CoproprietaireUpdate
): Promise<{ data: CoproprietaireOverview | null; error: Error | null }> {
  const supabase = createUntypedClient();

  // Update the base table
  const { error: updateError } = await supabase
    .from('coproprietaires')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('copro_id', coproId)
    .eq('id', id);

  if (updateError) {
    return { data: null, error: new Error(updateError.message) };
  }

  // Fetch updated data from view
  return getCoproprietaire(coproId, id);
}

/**
 * Supprime un copropriétaire (soft delete via end_date sur lot_owners)
 * Note: On ne supprime pas réellement, on marque comme ancien
 */
export async function archiveCoproprietaire(
  coproId: string,
  id: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createUntypedClient();

  // Set end_date on all active lot_owners entries
  const { error } = await supabase
    .from('lot_owners')
    .update({ end_date: new Date().toISOString().split('T')[0] })
    .eq('copro_id', coproId)
    .eq('coproprietaire_id', id)
    .is('end_date', null);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Liste les lots avec leurs propriétaires
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
