/**
 * Service de persistance de la session AG
 * Gère le stockage Supabase avec fallback localStorage
 * Version migrée depuis localStorage pur vers Supabase (ACTION 9)
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
 * Note: Régénérer les types après application des migrations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClientAny = SupabaseClient<any, any, any>;

/**
 * Clés de stockage localStorage (fallback uniquement)
 */
const STORAGE_KEYS = {
  PRESENCES: (agId: string) => `ag-session-presences-${agId}`,
  ROLES: (agId: string) => `ag-session-roles-${agId}`,
  VOTES: (agId: string) => `ag-session-votes-${agId}`,
  RESOLUTIONS_STATE: (agId: string) => `ag-session-resolutions-${agId}`,
  LAST_SAVE: (agId: string) => `ag-session-last-save-${agId}`,
  SESSION_METADATA: (agId: string) => `ag-session-metadata-${agId}`,
  SESSION_STARTED: (agId: string) => `ag-session-started-${agId}`,
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
  source: 'supabase' | 'localStorage';
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
 * Utilise Supabase comme stockage principal, localStorage en fallback
 */
export class AGSessionPersistenceService {
  private agId: string;
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private isDirty: boolean = false;
  private version: number = 1;
  private useSupabase: boolean;
  // Cast to any for new RPC functions not yet in generated types
  private supabase: SupabaseClientAny = createClient();

  constructor(agId: string) {
    this.agId = agId;
    // Utiliser Supabase seulement si l'ID est un UUID valide
    this.useSupabase = isValidUUID(agId);
  }

  // ========================================
  // HELPERS SUPABASE
  // ========================================

  /**
   * Sauvegarde un draft via RPC Supabase
   */
  private async saveDraftToSupabase(draftType: DraftType, data: unknown): Promise<boolean> {
    if (!this.useSupabase) return false;

    try {
      const { error } = await this.supabase.rpc('save_ag_session_draft', {
        p_ag_id: this.agId,
        p_draft_type: draftType,
        p_draft_data: data,
      });

      if (error) {
        console.warn('[AGSessionPersistence] Supabase save error:', error.message);
        return false;
      }

      return true;
    } catch (err) {
      console.warn('[AGSessionPersistence] Supabase save exception:', err);
      return false;
    }
  }

  /**
   * Récupère un draft via RPC Supabase
   */
  private async getDraftFromSupabase(draftType: DraftType): Promise<{ data: unknown; version: number; lastModified: Date } | null> {
    if (!this.useSupabase) return null;

    try {
      const { data, error } = await this.supabase.rpc('get_ag_session_draft', {
        p_ag_id: this.agId,
        p_draft_type: draftType,
      });

      if (error || !data) {
        return null;
      }

      // data is JSONB with: id, draft_data, version, last_modified_at
      return {
        data: data.draft_data,
        version: data.version,
        lastModified: new Date(data.last_modified_at),
      };
    } catch (err) {
      console.warn('[AGSessionPersistence] Supabase get exception:', err);
      return null;
    }
  }

  // ========================================
  // HELPERS LOCALSTORAGE (FALLBACK)
  // ========================================

  /**
   * Sauvegarde en localStorage (fallback)
   */
  private saveToLocalStorage(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('[AGSessionPersistence] localStorage save error:', error);
    }
  }

  /**
   * Récupère depuis localStorage (fallback)
   */
  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const str = localStorage.getItem(key);
      return str ? JSON.parse(str) : null;
    } catch (error) {
      console.error('[AGSessionPersistence] localStorage get error:', error);
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
    const saved = await this.saveDraftToSupabase('attendance', presences);

    if (!saved) {
      // Fallback localStorage
      this.saveToLocalStorage(STORAGE_KEYS.PRESENCES(this.agId), presences);
    }

    this.markAsSaved();
    this.isDirty = false;
  }

  /**
   * Sauvegarde les rôles (président, secrétaire, scrutateurs)
   */
  async saveRoles(roles: RolesAG): Promise<void> {
    const saved = await this.saveDraftToSupabase('roles', roles);

    if (!saved) {
      this.saveToLocalStorage(STORAGE_KEYS.ROLES(this.agId), roles);
    }

    this.markAsSaved();
  }

  /**
   * Sauvegarde les votes par résolution
   */
  async saveVotes(votes: Record<string, unknown>): Promise<void> {
    const saved = await this.saveDraftToSupabase('votes', votes);

    if (!saved) {
      this.saveToLocalStorage(STORAGE_KEYS.VOTES(this.agId), votes);
    }

    this.markAsSaved();
  }

  /**
   * Sauvegarde l'état de la résolution active et des résolutions complétées
   */
  async saveResolutionState(index: number, completedResolutions: string[] = []): Promise<void> {
    const data = { activeIndex: index, completedResolutions };
    const saved = await this.saveDraftToSupabase('resolutions', data);

    if (!saved) {
      this.saveToLocalStorage(STORAGE_KEYS.RESOLUTIONS_STATE(this.agId), data);
    }
  }

  /**
   * Sauvegarde l'état de démarrage de la session
   */
  async saveSessionStarted(started: boolean): Promise<void> {
    const data = { started, startedAt: started ? new Date().toISOString() : null };
    const saved = await this.saveDraftToSupabase('session', data);

    if (!saved) {
      this.saveToLocalStorage(STORAGE_KEYS.SESSION_STARTED(this.agId), started);
    }
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
   * Enregistre les métadonnées de la dernière sauvegarde
   */
  private markAsSaved(): void {
    const key = STORAGE_KEYS.LAST_SAVE(this.agId);
    localStorage.setItem(key, new Date().toISOString());
  }

  /**
   * Sauvegarde les métadonnées de session
   */
  private saveMetadata(): void {
    const key = STORAGE_KEYS.SESSION_METADATA(this.agId);
    const metadata = {
      agId: this.agId,
      lastModified: new Date().toISOString(),
      version: this.version,
      storageMode: this.useSupabase ? 'supabase' : 'localStorage',
    };
    localStorage.setItem(key, JSON.stringify(metadata));
  }

  // ========================================
  // RESTAURATION
  // ========================================

  /**
   * Restaure toutes les données de session
   */
  async restore(): Promise<RestoreResult> {
    const warnings: string[] = [];
    const data: Partial<AGSessionData> = {};
    let lastSaveDate: Date | null = null;
    let source: 'supabase' | 'localStorage' = 'localStorage';

    try {
      // Essayer d'abord Supabase si disponible
      if (this.useSupabase) {
        const [presencesDraft, rolesDraft, votesDraft, resolutionsDraft, sessionDraft] = await Promise.all([
          this.getDraftFromSupabase('attendance'),
          this.getDraftFromSupabase('roles'),
          this.getDraftFromSupabase('votes'),
          this.getDraftFromSupabase('resolutions'),
          this.getDraftFromSupabase('session'),
        ]);

        // Si au moins un draft existe sur Supabase, utiliser Supabase
        const hasSupabaseData = presencesDraft || rolesDraft || votesDraft || resolutionsDraft || sessionDraft;

        if (hasSupabaseData) {
          source = 'supabase';

          // Helper to update lastSaveDate
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
            source,
          };
        }
      }

      // Fallback: Restaurer depuis localStorage
      source = 'localStorage';

      // Vérifier la date de dernière sauvegarde
      const lastSaveKey = STORAGE_KEYS.LAST_SAVE(this.agId);
      const lastSaveStr = localStorage.getItem(lastSaveKey);
      if (lastSaveStr) {
        lastSaveDate = new Date(lastSaveStr);

        // Vérifier si les données ne sont pas trop anciennes (24h)
        const ageHours = (Date.now() - lastSaveDate.getTime()) / (1000 * 60 * 60);
        if (ageHours > 24) {
          warnings.push(`Données datant de ${Math.round(ageHours)} heures`);
        }
      }

      // Restaurer les présences
      const presences = this.getFromLocalStorage<Record<string, PresenceData>>(STORAGE_KEYS.PRESENCES(this.agId));
      if (presences && typeof presences === 'object') {
        data.presencesEnrichies = presences;
      }

      // Restaurer les rôles
      const roles = this.getFromLocalStorage<RolesAG>(STORAGE_KEYS.ROLES(this.agId));
      if (roles) {
        data.roles = roles;
      }

      // Restaurer les votes
      const votes = this.getFromLocalStorage<Record<string, unknown>>(STORAGE_KEYS.VOTES(this.agId));
      if (votes) {
        data.votesParResolution = votes;
      }

      // Restaurer l'état de résolution
      const resolutionState = this.getFromLocalStorage<{ activeIndex: number; completedResolutions: string[] }>(
        STORAGE_KEYS.RESOLUTIONS_STATE(this.agId)
      );
      if (resolutionState) {
        data.resolutionActiveIndex = resolutionState.activeIndex;
        data.completedResolutions = resolutionState.completedResolutions || [];
      }

      // Restaurer l'état de démarrage
      const sessionStarted = this.getFromLocalStorage<boolean>(STORAGE_KEYS.SESSION_STARTED(this.agId));
      if (sessionStarted !== null) {
        data.sessionStarted = sessionStarted;
      }

      return {
        success: true,
        data: Object.keys(data).length > 0 ? data : null,
        warnings,
        lastSaveDate,
        source,
      };

    } catch (error) {
      console.error('[AGSessionPersistence] Erreur restauration:', error);
      return {
        success: false,
        data: null,
        warnings: ['Erreur lors de la restauration des données'],
        lastSaveDate: null,
        source: 'localStorage',
      };
    }
  }

  /**
   * Vérifie si des données existent pour cette AG
   */
  async hasData(): Promise<boolean> {
    // Check Supabase first
    if (this.useSupabase) {
      const draft = await this.getDraftFromSupabase('attendance');
      if (draft) return true;

      const sessionDraft = await this.getDraftFromSupabase('session');
      if (sessionDraft) return true;
    }

    // Fallback localStorage
    const presencesKey = STORAGE_KEYS.PRESENCES(this.agId);
    const sessionStartedKey = STORAGE_KEYS.SESSION_STARTED(this.agId);
    return localStorage.getItem(presencesKey) !== null ||
           localStorage.getItem(sessionStartedKey) !== null;
  }

  /**
   * Retourne la date de dernière sauvegarde
   */
  getLastSaveDate(): Date | null {
    const key = STORAGE_KEYS.LAST_SAVE(this.agId);
    const str = localStorage.getItem(key);
    return str ? new Date(str) : null;
  }

  /**
   * Indique si le service utilise Supabase ou localStorage
   */
  isUsingSupabase(): boolean {
    return this.useSupabase;
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
    this.stopAutoSave(); // Arrêter si déjà en cours

    this.autoSaveInterval = setInterval(async () => {
      if (this.isDirty) {
        const data = getData();
        await this.saveAll(data);
        this.isDirty = false;
        console.log(`[AGSessionPersistence] Auto-save effectué (${this.useSupabase ? 'Supabase' : 'localStorage'})`);
      }
    }, intervalMs);

    console.log(`[AGSessionPersistence] Auto-save démarré (${intervalMs}ms, mode: ${this.useSupabase ? 'Supabase' : 'localStorage'})`);
  }

  /**
   * Arrête l'auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('[AGSessionPersistence] Auto-save arrêté');
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
    // Clear Supabase via RPC (if manager)
    if (this.useSupabase) {
      try {
        await this.supabase.rpc('clear_ag_session_drafts', {
          p_ag_id: this.agId,
        });
      } catch (err) {
        console.warn('[AGSessionPersistence] Supabase clear error:', err);
      }
    }

    // Always clear localStorage too
    Object.values(STORAGE_KEYS).forEach((keyFn) => {
      if (typeof keyFn === 'function') {
        localStorage.removeItem(keyFn(this.agId));
      }
    });

    this.isDirty = false;
    console.log('[AGSessionPersistence] Données supprimées');
  }

  /**
   * Migre les données localStorage vers Supabase (one-time)
   */
  async migrateToSupabase(): Promise<{ success: boolean; migrated: string[] }> {
    if (!this.useSupabase) {
      return { success: false, migrated: [] };
    }

    const migrated: string[] = [];

    try {
      // Migrate presences
      const presences = this.getFromLocalStorage<Record<string, PresenceData>>(STORAGE_KEYS.PRESENCES(this.agId));
      if (presences) {
        const saved = await this.saveDraftToSupabase('attendance', presences);
        if (saved) {
          migrated.push('attendance');
          localStorage.removeItem(STORAGE_KEYS.PRESENCES(this.agId));
        }
      }

      // Migrate roles
      const roles = this.getFromLocalStorage<RolesAG>(STORAGE_KEYS.ROLES(this.agId));
      if (roles) {
        const saved = await this.saveDraftToSupabase('roles', roles);
        if (saved) {
          migrated.push('roles');
          localStorage.removeItem(STORAGE_KEYS.ROLES(this.agId));
        }
      }

      // Migrate votes
      const votes = this.getFromLocalStorage<Record<string, unknown>>(STORAGE_KEYS.VOTES(this.agId));
      if (votes) {
        const saved = await this.saveDraftToSupabase('votes', votes);
        if (saved) {
          migrated.push('votes');
          localStorage.removeItem(STORAGE_KEYS.VOTES(this.agId));
        }
      }

      // Migrate resolution state
      const resState = this.getFromLocalStorage<{ activeIndex: number; completedResolutions: string[] }>(
        STORAGE_KEYS.RESOLUTIONS_STATE(this.agId)
      );
      if (resState) {
        const saved = await this.saveDraftToSupabase('resolutions', resState);
        if (saved) {
          migrated.push('resolutions');
          localStorage.removeItem(STORAGE_KEYS.RESOLUTIONS_STATE(this.agId));
        }
      }

      // Migrate session started
      const sessionStarted = this.getFromLocalStorage<boolean>(STORAGE_KEYS.SESSION_STARTED(this.agId));
      if (sessionStarted !== null) {
        const saved = await this.saveDraftToSupabase('session', { started: sessionStarted });
        if (saved) {
          migrated.push('session');
          localStorage.removeItem(STORAGE_KEYS.SESSION_STARTED(this.agId));
        }
      }

      console.log(`[AGSessionPersistence] Migration réussie: ${migrated.join(', ')}`);
      return { success: true, migrated };

    } catch (err) {
      console.error('[AGSessionPersistence] Migration error:', err);
      return { success: false, migrated };
    }
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
