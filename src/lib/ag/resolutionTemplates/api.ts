import { createUntypedClient } from '@/lib/ag/api/utils';
import type { ResolutionTemplateRow, CreateTemplatePayload, ApiResult } from './types';
import type { VariableDefinition } from '@/lib/constants/resolutions';

const TABLE = 'resolution_templates';
const SELECT = '*';

/**
 * Mappe une ligne brute de `resolution_templates` (colonnes snake_case, lues via
 * un client non typé) vers la forme runtime `ResolutionTemplateRow` qui mélange
 * camelCase (interface UI) et snake_case (dimensions de tenance). Les lectures
 * camelCase (isInformation, variablesTypees, legalRef, createdAt…) tombaient
 * sinon sur `undefined`. Point d'entrée UNIQUE pour toute ligne DB.
 */
export function mapRowFromDb(raw: Record<string, unknown>): ResolutionTemplateRow {
  return {
    ...(raw as object),
    isInformation: raw.is_information as boolean | undefined,
    variablesTypees: raw.variables_typees as VariableDefinition[] | undefined,
    legalRef: raw.legal_ref as string | undefined,
    createdAt: raw.created_at as string | undefined,
    updatedAt: raw.updated_at as string | undefined,
    usageCount: raw.usage_count as number | undefined,
    deprecatedBy: raw.deprecated_by as string | undefined,
  } as ResolutionTemplateRow;
}

/** Système (cabinet_id NULL) + cabinet + copro active. Ne JAMAIS comparer cabinet_id = NULL. */
export async function fetchTemplatesForCabinet(
  cabinetId: string | null,
  coproId: string | null,
): Promise<ApiResult<ResolutionTemplateRow[]>> {
  const supabase = createUntypedClient();
  let query = supabase.from(TABLE).select(SELECT);
  if (cabinetId) {
    const coproClause = coproId ? `,and(cabinet_id.eq.${cabinetId},copro_id.eq.${coproId})` : '';
    query = query.or(`cabinet_id.is.null,and(cabinet_id.eq.${cabinetId},copro_id.is.null)${coproClause}`);
  } else {
    query = query.is('cabinet_id', null);
  }
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: ((data ?? []) as Record<string, unknown>[]).map(mapRowFromDb) };
}

/** Obligatoires SYSTÈME pour un type d'AG (utilisé par la création d'AG, sans cabinet). */
export async function fetchSystemObligatoires(typeAG: string): Promise<ApiResult<ResolutionTemplateRow[]>> {
  const supabase = createUntypedClient();
  const { data, error } = await supabase
    .from(TABLE).select(SELECT).is('cabinet_id', null).contains('obligatoire_pour', [typeAG]);
  if (error) return { success: false, error: error.message };
  return { success: true, data: ((data ?? []) as Record<string, unknown>[]).map(mapRowFromDb) };
}

async function isSystem(supabase: ReturnType<typeof createUntypedClient>, id: string): Promise<boolean | null> {
  const { data, error } = await supabase.from(TABLE).select('cabinet_id').eq('id', id).single();
  if (error || !data) return null;
  return (data as { cabinet_id: string | null }).cabinet_id === null;
}

export async function createTemplate(
  cabinetId: string, payload: CreateTemplatePayload, coproId: string | null = null,
): Promise<ApiResult<ResolutionTemplateRow>> {
  if (!cabinetId) return { success: false, error: 'Aucun cabinet courant.' };
  const supabase = createUntypedClient();
  const { data, error } = await supabase.from(TABLE)
    .insert({ ...payload, cabinet_id: cabinetId, copro_id: coproId, code: null, scope: 'org' })
    .select(SELECT).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: mapRowFromDb(data as Record<string, unknown>) };
}

export async function updateTemplate(
  id: string, patch: Partial<CreateTemplatePayload>,
): Promise<ApiResult<ResolutionTemplateRow>> {
  const supabase = createUntypedClient();
  const sys = await isSystem(supabase, id);
  if (sys === null) return { success: false, error: 'Modèle introuvable.' };
  if (sys) return { success: false, error: 'Un modèle système est en lecture seule.' };
  const { data, error } = await supabase.from(TABLE).update(patch).eq('id', id).select(SELECT).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: mapRowFromDb(data as Record<string, unknown>) };
}

export async function duplicateTemplate(
  fromId: string, cabinetId: string, coproId: string | null = null,
): Promise<ApiResult<ResolutionTemplateRow>> {
  if (!cabinetId) return { success: false, error: 'Aucun cabinet courant.' };
  const supabase = createUntypedClient();
  const { data: src, error: e1 } = await supabase.from(TABLE).select(SELECT).eq('id', fromId).single();
  if (e1 || !src) return { success: false, error: 'Modèle source introuvable.' };
  // Mapper AVANT de copier : sinon s.isInformation / s.variablesTypees sont undefined (lignes DB en snake_case).
  const s = mapRowFromDb(src as Record<string, unknown>);
  const { data, error } = await supabase.from(TABLE).insert({
    cabinet_id: cabinetId, copro_id: coproId, code: null, scope: 'org',
    titre: `${s.titre} (copie)`, categorie: s.categorie, texte: s.texte, majorite: s.majorite,
    is_information: s.isInformation, applicable_ag: s.applicable_ag, obligatoire_pour: s.obligatoire_pour,
    ordre_suggere: s.ordre_suggere, tags: s.tags, variables: s.variables, variables_typees: s.variablesTypees,
    action_type: s.action_type,
  }).select(SELECT).single();
  if (error) return { success: false, error: error.message };
  return { success: true, data: mapRowFromDb(data as Record<string, unknown>) };
}

export async function deleteTemplate(id: string): Promise<ApiResult<null>> {
  const supabase = createUntypedClient();
  const sys = await isSystem(supabase, id);
  if (sys === null) return { success: false, error: 'Modèle introuvable.' };
  if (sys) return { success: false, error: 'Un modèle système ne peut pas être supprimé.' };
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  return { success: true, data: null };
}
