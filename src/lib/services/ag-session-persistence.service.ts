/**
 * Service de persistance de la session AG
 * MIGRATION 2026-01-31: Source de vérité = Supabase UNIQUEMENT
 * localStorage utilisé uniquement pour métadonnées UI (non business data)
 */

import { createClient } from '@/lib/supabase/client';
import type { PresenceData } from '@/lib/utils/ag-session';
import type { RolesAG } from '@/types/models/ag';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Types de draft supportés (match avec ag_draft_type enum côté DB)
 */
type DraftType = 'attendance' | 'votes' | 'roles' | 'resolutions' | 'session';

/**
 * Type helper pour les appels RPC non encore générés dans les types Supabase
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

/**
 * Clés de stockage localStorage (UNIQUEMENT pour métadonnées UI, pas business data)
 */
const STORAGE_KEYS = {
  LAST_SAVE: (agId: string) => `ag-session-last-save-${agId}`,
  SESSION_METADATA: (agId: string) => `ag-session-metadata-${agId}`,
};

/**
 * Données de session AG à persister
 */
export interface AGSessionData {
  presencesEnrichies: Record<string, PresenceData>;
  roles: RolesAG;
  votesParResolution: Record<string, unknown>;
  resolutionActiveIndex: number;
  sessionStarted: boolean;
  completedResolutions: string[];
  metadata: {
    agId: string;
    lastModified: string;
    version: number;
  };
}

/**
 * Résultat de restauration
 */
export interface RestoreResult {
  success: boolean;
  data: Partial<AGSessionData> | null;
  warnings: string[];
  lastSaveDate: Date | null;
  source: 'supabase';
}

/**
 * Vérifie si un ID est un UUID valide
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Service de persistance de la session AG
 * Utilise UNIQUEMENT Supabase comme stockage
 */
export class AGSessionPersistenceService {
  private agId: string;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isDirty: boolean = false;
  private version: number = 1;
  private isValid: boolean;
  private supabase: SupabaseClientAny = createClient();

  constructor(agId: string) {
    this.agId = agId;
    this.isValid = isValidUUID(agId);

    if (!this.isValid) {
      // Invalid AG ID (not UUID)
    }
  }

  // ========================================
  // HELPERS SUPABASE
  // ========================================

  /**
   * Sauvegarde un draft via RPC Supabase
   */
  private async saveDraftToSupabase(draftType: DraftType, data: unknown): Promise<boolean> {
    if (!this.isValid) return false;

    try {
      const { error } = await this.supabase.rpc('save_ag_session_draft', {
        p_ag_id: this.agId,
        p_draft_type: draftType,
        p_draft_data: data,
      });

      if (error) {
        console.error('[AGSessionPersistence] Supabase save error:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[AGSessionPersistence] Supabase save exception:', err);
      return false;
    }
  }

  /**
   * Récupère un draft via RPC Supabase
   */
  private async getDraftFromSupabase(draftType: DraftType): Promise<{ data: unknown; version: number; lastModified: Date } | null> {
    if (!this.isValid) return null;

    try {
      const { data, error } = await this.supabase.rpc('get_ag_session_draft', {
        p_ag_id: this.agId,
        p_draft_type: draftType,
      });

      if (error || !data) {
        return null;
      }

      return {
        data: data.draft_data,
        version: data.version,
        lastModified: new Date(data.last_modified_at),
      };
    } catch (err) {
      console.error('[AGSessionPersistence] Supabase get exception:', err);
      return null;
    }
  }

  // ========================================
  // SAUVEGARDE
  // ========================================

  /**
   * Sauvegarde les présences enrichies
   */
  async savePresences(presences: Record<string, PresenceData>): Promise<void> {
    await this.saveDraftToSupabase('attendance', presences);
    this.markAsSaved();
    this.isDirty = false;
  }

  /**
   * Sauvegarde les rôles (président, secrétaire, scrutateurs)
   */
  async saveRoles(roles: RolesAG): Promise<void> {
    await this.saveDraftToSupabase('roles', roles);
    this.markAsSaved();
  }

  /**
   * Sauvegarde les votes par résolution
   */
  async saveVotes(votes: Record<string, unknown>): Promise<void> {
    await this.saveDraftToSupabase('votes', votes);
    this.markAsSaved();
  }

  /**
   * Sauvegarde l'état de la résolution active et des résolutions complétées
   */
  async saveResolutionState(index: number, completedResolutions: string[] = []): Promise<void> {
    const data = { activeIndex: index, completedResolutions };
    await this.saveDraftToSupabase('resolutions', data);
  }

  /**
   * Sauvegarde l'état de démarrage de la session
   */
  async saveSessionStarted(started: boolean): Promise<void> {
    const data = { started, startedAt: started ? new Date().toISOString() : null };
    await this.saveDraftToSupabase('session', data);
  }

  /**
   * Sauvegarde complète de la session
   */
  async saveAll(data: Partial<AGSessionData>): Promise<void> {
    const promises: Promise<void>[] = [];

    if (data.presencesEnrichies) {
      promises.push(this.savePresences(data.presencesEnrichies));
    }
    if (data.roles) {
      promises.push(this.saveRoles(data.roles));
    }
    if (data.votesParResolution) {
      promises.push(this.saveVotes(data.votesParResolution));
    }
    if (data.resolutionActiveIndex !== undefined) {
      promises.push(this.saveResolutionState(data.resolutionActiveIndex, data.completedResolutions));
    }
    if (data.sessionStarted !== undefined) {
      promises.push(this.saveSessionStarted(data.sessionStarted));
    }

    await Promise.all(promises);
    this.saveMetadata();
  }

  /**
   * Enregistre les métadonnées de la dernière sauvegarde (UI only)
   */
  private markAsSaved(): void {
    if (typeof window === 'undefined') return;
    const key = STORAGE_KEYS.LAST_SAVE(this.agId);
    localStorage.setItem(key, new Date().toISOString());
  }

  /**
   * Sauvegarde les métadonnées de session (UI only)
   */
  private saveMetadata(): void {
    if (typeof window === 'undefined') return;
    const key = STORAGE_KEYS.SESSION_METADATA(this.agId);
    const metadata = {
      agId: this.agId,
      lastModified: new Date().toISOString(),
      version: this.version,
      storageMode: 'supabase',
    };
    localStorage.setItem(key, JSON.stringify(metadata));
  }

  // ========================================
  // RESTAURATION
  // ========================================

  /**
   * Restaure toutes les données de session depuis Supabase
   */
  async restore(): Promise<RestoreResult> {
    const warnings: string[] = [];
    const data: Partial<AGSessionData> = {};
    let lastSaveDate: Date | null = null;

    if (!this.isValid) {
      return {
        success: false,
        data: null,
        warnings: ['Invalid AG ID'],
        lastSaveDate: null,
        source: 'supabase',
      };
    }

    try {
      const [presencesDraft, rolesDraft, votesDraft, resolutionsDraft, sessionDraft] = await Promise.all([
        this.getDraftFromSupabase('attendance'),
        this.getDraftFromSupabase('roles'),
        this.getDraftFromSupabase('votes'),
        this.getDraftFromSupabase('resolutions'),
        this.getDraftFromSupabase('session'),
      ]);

      const updateLastSave = (newDate: Date) => {
        if (!lastSaveDate || newDate.getTime() > lastSaveDate.getTime()) {
          lastSaveDate = newDate;
        }
      };

      if (presencesDraft) {
        data.presencesEnrichies = presencesDraft.data as Record<string, PresenceData>;
        updateLastSave(presencesDraft.lastModified);
      }

      if (rolesDraft) {
        data.roles = rolesDraft.data as RolesAG;
        updateLastSave(rolesDraft.lastModified);
      }

      if (votesDraft) {
        data.votesParResolution = votesDraft.data as Record<string, unknown>;
        updateLastSave(votesDraft.lastModified);
      }

      if (resolutionsDraft) {
        const resData = resolutionsDraft.data as { activeIndex: number; completedResolutions: string[] };
        data.resolutionActiveIndex = resData.activeIndex;
        data.completedResolutions = resData.completedResolutions || [];
      }

      if (sessionDraft) {
        const sessData = sessionDraft.data as { started: boolean };
        data.sessionStarted = sessData.started;
      }

      return {
        success: true,
        data: Object.keys(data).length > 0 ? data : null,
        warnings,
        lastSaveDate,
        source: 'supabase',
      };

    } catch (error) {
      console.error('[AGSessionPersistence] Erreur restauration:', error);
      return {
        success: false,
        data: null,
        warnings: ['Erreur lors de la restauration des données'],
        lastSaveDate: null,
        source: 'supabase',
      };
    }
  }

  /**
   * Vérifie si des données existent pour cette AG
   */
  async hasData(): Promise<boolean> {
    if (!this.isValid) return false;

    const draft = await this.getDraftFromSupabase('attendance');
    if (draft) return true;

    const sessionDraft = await this.getDraftFromSupabase('session');
    if (sessionDraft) return true;

    return false;
  }

  /**
   * Retourne la date de dernière sauvegarde (from localStorage metadata)
   */
  getLastSaveDate(): Date | null {
    if (typeof window === 'undefined') return null;
    const key = STORAGE_KEYS.LAST_SAVE(this.agId);
    const str = localStorage.getItem(key);
    return str ? new Date(str) : null;
  }

  /**
   * Indique si le service utilise Supabase (toujours vrai maintenant)
   */
  isUsingSupabase(): boolean {
    return this.isValid;
  }

  // ========================================
  // AUTO-SAVE
  // ========================================

  /**
   * Démarre l'auto-save périodique
   */
  startAutoSave(
    getData: () => Partial<AGSessionData>,
    intervalMs: number = 5000
  ): void {
    this.stopAutoSave();

    this.autoSaveInterval = setInterval(async () => {
      if (this.isDirty) {
        const data = getData();
        await this.saveAll(data);
        this.isDirty = false;
        // Auto-save completed
      }
    }, intervalMs);
  }

  /**
   * Arrête l'auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Marque les données comme modifiées (dirty)
   */
  markDirty(): void {
    this.isDirty = true;
  }

  /**
   * Vérifie si des modifications non sauvegardées existent
   */
  hasPendingChanges(): boolean {
    return this.isDirty;
  }

  // ========================================
  // NETTOYAGE
  // ========================================

  /**
   * Supprime toutes les données de cette AG
   */
  async clear(): Promise<void> {
    if (this.isValid) {
      try {
        await this.supabase.rpc('clear_ag_session_drafts', {
          p_ag_id: this.agId,
        });
      } catch (err) {
        console.error('[AGSessionPersistence] Supabase clear error:', err);
      }
    }

    // Clear UI metadata from localStorage
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach((keyFn) => {
        if (typeof keyFn === 'function') {
          localStorage.removeItem(keyFn(this.agId));
        }
      });
    }

    this.isDirty = false;
  }

  /**
   * Nettoyage lors de la destruction du service
   */
  destroy(): void {
    this.stopAutoSave();
  }
}

/**
 * Factory pour créer une instance du service
 */
export function createAGSessionPersistence(agId: string): AGSessionPersistenceService {
  return new AGSessionPersistenceService(agId);
}
