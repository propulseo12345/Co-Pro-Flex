/**
 * API Layer pour les Bâtiments d'une copropriété.
 *
 * La table `buildings` (0007) et la colonne `lots.building_id` (0008) existent déjà,
 * avec RLS (0034 : lecture = accès copro, écriture = gestionnaire) et le trigger
 * `tr_lot_copro_consistency` (un lot ne peut pointer que vers un bâtiment de SA copro).
 * Cette couche expose le CRUD manquant côté front. La suppression s'appuie sur
 * `lots.building_id ON DELETE SET NULL` : supprimer un bâtiment détache ses lots sans les perdre.
 */

import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Building {
  id: string;
  copro_id: string;
  name: string;
  address: string | null;
  floors_count: number | null;
  construction_year: number | null;
  created_at: string;
  updated_at: string;
}

export interface BuildingCreate {
  copro_id: string;
  name: string;
  address?: string | null;
  floors_count?: number | null;
  construction_year?: number | null;
}

export interface BuildingUpdate {
  name?: string;
  address?: string | null;
  floors_count?: number | null;
  construction_year?: number | null;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/** Liste les bâtiments d'une copropriété (ordre alphabétique). */
export async function listBuildings(
  coproId: string
): Promise<{ data: Building[] | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('copro_id', coproId)
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: data as Building[], error: null };
}

/** Crée un nouveau bâtiment et renvoie son id. */
export async function createBuilding(
  payload: BuildingCreate
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('buildings')
    .insert({
      copro_id: payload.copro_id,
      name: payload.name,
      address: payload.address ?? null,
      floors_count: payload.floors_count ?? null,
      construction_year: payload.construction_year ?? null,
    })
    .select('id')
    .single();

  if (error) {
    return { data: null, error: new Error(error.message) };
  }

  return { data: { id: data.id }, error: null };
}

/** Met à jour un bâtiment. */
export async function updateBuilding(
  coproId: string,
  buildingId: string,
  updates: BuildingUpdate
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('buildings')
    .update(updates)
    .eq('copro_id', coproId)
    .eq('id', buildingId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}

/**
 * Supprime un bâtiment. Les lots rattachés ne sont PAS supprimés :
 * `lots.building_id` repasse à NULL (FK ON DELETE SET NULL, 0008).
 */
export async function deleteBuilding(
  coproId: string,
  buildingId: string
): Promise<{ success: boolean; error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('copro_id', coproId)
    .eq('id', buildingId);

  if (error) {
    return { success: false, error: new Error(error.message) };
  }

  return { success: true, error: null };
}
