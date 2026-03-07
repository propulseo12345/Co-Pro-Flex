/**
 * AG Draft Persistence Utilities
 * Centralized helpers for saving/loading AG drafts via Supabase RPC
 * Replaces scattered localStorage calls with DB-first approach
 */

import { createClient } from '@/lib/supabase/client';
import type { Json } from '@/types/supabase';

/**
 * Draft types supported by the database enum
 * Note: Types added via migrations - check 20260201_envoi_security.sql for latest
 */
export type AgDraftType =
  | 'attendance'
  | 'votes'
  | 'roles'
  | 'resolutions'
  | 'session'
  | 'variables'
  | 'resolution_vars'
  | 'milestones'
  | 'signataires'
  | 'envoi'
  | 'resolutions_results';

// Type for RPC calls - base types that exist in Supabase generated types
// New types ('envoi', 'milestones') should use dedicated RPCs or untyped client
type RpcDraftType = 'attendance' | 'votes' | 'roles' | 'resolutions' | 'session';

/**
 * Check if an ID is a valid UUID (Supabase-created AG)
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Save a draft to Supabase via RPC
 * Falls back to localStorage if Supabase unavailable or ID is not UUID
 */
export async function saveDraft(
  agId: string,
  draftType: AgDraftType,
  data: unknown,
  localStorageKey?: string
): Promise<{ success: boolean; source: 'supabase' | 'localStorage' }> {
  // If not a valid UUID, use localStorage only
  if (!isValidUUID(agId)) {
    if (localStorageKey) {
      try {
        localStorage.setItem(localStorageKey, JSON.stringify(data));
        return { success: true, source: 'localStorage' };
      } catch {
        return { success: false, source: 'localStorage' };
      }
    }
    return { success: false, source: 'localStorage' };
  }

  // Try Supabase first
  try {
    const supabase = createClient();
    // Cast draftType - new enum values may not be in generated types yet
    const { error } = await supabase.rpc('save_ag_session_draft', {
      p_ag_id: agId,
      p_draft_type: draftType as RpcDraftType,
      p_draft_data: data as Json,
    });

    if (!error) {
      // Clear localStorage if Supabase succeeded
      if (localStorageKey) {
        localStorage.removeItem(localStorageKey);
      }
      return { success: true, source: 'supabase' };
    }

    console.warn('[saveDraft] Supabase error, falling back to localStorage:', error.message);
  } catch (err) {
    console.warn('[saveDraft] Supabase exception:', err);
  }

  // Fallback to localStorage
  if (localStorageKey) {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(data));
      return { success: true, source: 'localStorage' };
    } catch {
      return { success: false, source: 'localStorage' };
    }
  }

  return { success: false, source: 'localStorage' };
}

/**
 * Load a draft from Supabase via RPC
 * Falls back to localStorage if not found in Supabase
 */
export async function loadDraft<T>(
  agId: string,
  draftType: AgDraftType,
  localStorageKey?: string
): Promise<{ data: T | null; source: 'supabase' | 'localStorage' | null }> {
  // If not a valid UUID, use localStorage only
  if (!isValidUUID(agId)) {
    if (localStorageKey) {
      try {
        const str = localStorage.getItem(localStorageKey);
        if (str) {
          return { data: JSON.parse(str) as T, source: 'localStorage' };
        }
      } catch {
        // ignore
      }
    }
    return { data: null, source: null };
  }

  // Try Supabase first
  try {
    const supabase = createClient();
    // Cast draftType - new enum values may not be in generated types yet
    const { data, error } = await supabase.rpc('get_ag_session_draft', {
      p_ag_id: agId,
      p_draft_type: draftType as RpcDraftType,
    });

    if (!error && data) {
      // RPC returns { id, draft_data, version, last_modified_at } or null
      const draftResult = data as { draft_data?: unknown } | null;
      if (draftResult && draftResult.draft_data) {
        return { data: draftResult.draft_data as T, source: 'supabase' };
      }
    }
  } catch (err) {
    console.warn('[loadDraft] Supabase exception:', err);
  }

  // Fallback to localStorage
  if (localStorageKey) {
    try {
      const str = localStorage.getItem(localStorageKey);
      if (str) {
        return { data: JSON.parse(str) as T, source: 'localStorage' };
      }
    } catch {
      // ignore
    }
  }

  return { data: null, source: null };
}

/**
 * Load all drafts for an AG from Supabase
 */
export async function loadAllDrafts(
  agId: string
): Promise<Record<AgDraftType, unknown> | null> {
  if (!isValidUUID(agId)) {
    return null;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_ag_all_session_drafts', {
      p_ag_id: agId,
    });

    if (!error && data) {
      const result: Record<string, unknown> = {};
      for (const draft of data as { draft_type: string; draft_data: unknown }[]) {
        result[draft.draft_type] = draft.draft_data;
      }
      return result as Record<AgDraftType, unknown>;
    }
  } catch (err) {
    console.warn('[loadAllDrafts] Exception:', err);
  }

  return null;
}

/**
 * Clear a specific draft
 */
export async function clearDraft(
  agId: string,
  draftType: AgDraftType,
  localStorageKey?: string
): Promise<void> {
  if (localStorageKey) {
    localStorage.removeItem(localStorageKey);
  }

  if (!isValidUUID(agId)) return;

  try {
    const supabase = createClient();
    await supabase
      .from('ag_session_drafts')
      .delete()
      .eq('ag_id', agId)
      .eq('draft_type', draftType as RpcDraftType);
  } catch (err) {
    console.warn('[clearDraft] Exception:', err);
  }
}

/**
 * Migrate localStorage data to Supabase for a specific AG
 * Call this when transitioning an AG from local to DB
 */
export async function migrateLocalStorageToSupabase(
  agId: string,
  mappings: { draftType: AgDraftType; localStorageKey: string }[]
): Promise<{ migrated: AgDraftType[]; failed: AgDraftType[] }> {
  const migrated: AgDraftType[] = [];
  const failed: AgDraftType[] = [];

  if (!isValidUUID(agId)) {
    return { migrated, failed: mappings.map(m => m.draftType) };
  }

  for (const { draftType, localStorageKey } of mappings) {
    try {
      const localData = localStorage.getItem(localStorageKey);
      if (!localData) continue;

      const data = JSON.parse(localData);
      const result = await saveDraft(agId, draftType, data);

      if (result.success && result.source === 'supabase') {
        localStorage.removeItem(localStorageKey);
        migrated.push(draftType);
      } else {
        failed.push(draftType);
      }
    } catch {
      failed.push(draftType);
    }
  }

  return { migrated, failed };
}
