'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  AGSessionPersistenceService,
  createAGSessionPersistence,
  AGSessionData,
  RestoreResult
} from '@/lib/services/ag-session-persistence.service';
import type { PresenceData } from '@/lib/utils/ag-session';
import type { RolesAG } from '@/types/models/ag';

// Constantes de configuration
const RESTORE_TIMEOUT_MS = 10000; // 10 secondes timeout pour la restauration
const DEFAULT_AUTOSAVE_INTERVAL = 30000; // 30 secondes entre chaque auto-save

// Re-export de RestoreResult pour les consommateurs
export type { RestoreResult };

// Types d'état de la session
export type SessionPersistenceStatus = 'initializing' | 'restoring' | 'ready' | 'error' | 'degraded';

export interface SessionPersistenceError {
  code: string;
  message: string;
  retryable: boolean;
}

interface UseAGSessionPersistenceOptions {
  agId: string;
  autoSaveInterval?: number;  // ms, default 30000
  enableAutoSave?: boolean;
  onRestore?: (data: Partial<AGSessionData>) => void;
  restoreTimeout?: number; // ms, default 10000
}

interface UseAGSessionPersistenceReturn {
  // État
  status: SessionPersistenceStatus;
  isRestoring: boolean; // Rétro-compatibilité
  lastSaveDate: Date | null;
  hasUnsavedChanges: boolean;
  restoreResult: RestoreResult | null;
  error: SessionPersistenceError | null;
  isOnline: boolean;
  isUsingSupabase: boolean;

  // Actions
  savePresences: (presences: Record<string, PresenceData>) => void;
  saveRoles: (roles: RolesAG) => void;
  saveVotes: (votes: Record<string, unknown>) => void;
  saveResolutionState: (index: number, completedResolutions?: string[]) => void;
  saveSessionStarted: (started: boolean) => void;
  saveAll: (data: Partial<AGSessionData>) => void;
  restore: () => Promise<RestoreResult>;
  retryRestore: () => void;
  startNewSession: () => void;
  markDirty: () => void;
  clearData: () => void;
  migrateToSupabase: () => Promise<{ success: boolean; migrated: string[] }>;

  // Pour l'auto-save
  setDataGetter: (getter: () => Partial<AGSessionData>) => void;

  // Utilitaires
  hasExistingData: boolean;
}

export function useAGSessionPersistence({
  agId,
  autoSaveInterval = DEFAULT_AUTOSAVE_INTERVAL,
  enableAutoSave = true,
  onRestore,
  restoreTimeout = RESTORE_TIMEOUT_MS,
}: UseAGSessionPersistenceOptions): UseAGSessionPersistenceReturn {
  const serviceRef = useRef<AGSessionPersistenceService | null>(null);
  const [status, setStatus] = useState<SessionPersistenceStatus>('initializing');
  const [lastSaveDate, setLastSaveDate] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [error, setError] = useState<SessionPersistenceError | null>(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);
  const getDataRef = useRef<(() => Partial<AGSessionData>) | null>(null);
  const onRestoreRef = useRef(onRestore);
  const isInitializedRef = useRef(false);

  // Rétro-compatibilité
  const isRestoring = status === 'initializing' || status === 'restoring';

  // Garder onRestore à jour
  useEffect(() => {
    onRestoreRef.current = onRestore;
  }, [onRestore]);

  // Gestion du mode offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Tenter une synchronisation si on était en mode dégradé
      if (status === 'degraded') {
        setStatus('ready');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (status === 'ready') {
        setStatus('degraded');
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [status]);

  // Fonction de restauration async avec timeout
  const performRestore = useCallback(async () => {
    if (!serviceRef.current) {
      setError({
        code: 'ERR-SESSION-001',
        message: 'Service de persistance non initialisé',
        retryable: true,
      });
      setStatus('error');
      return;
    }

    setStatus('restoring');
    setError(null);

    // Timeout pour éviter le blocage infini
    const timeoutPromise = new Promise<RestoreResult>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Délai de restauration dépassé'));
      }, restoreTimeout);
    });

    try {
      // Race between restore and timeout
      const result = await Promise.race([
        serviceRef.current.restore(),
        timeoutPromise,
      ]);

      setRestoreResult(result);

      if (result.success) {
        setStatus(isOnline ? 'ready' : 'degraded');
        if (result.data && onRestoreRef.current) {
          onRestoreRef.current(result.data);
        }
      } else {
        // Restauration échouée mais on peut continuer en mode dégradé
        setStatus('degraded');
        setError({
          code: 'ERR-SESSION-003',
          message: 'Données corrompues ou manquantes',
          retryable: false,
        });
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'Délai de restauration dépassé') {
        setError({
          code: 'ERR-SESSION-002',
          message: 'Délai de restauration dépassé (10s)',
          retryable: true,
        });
      } else {
        setError({
          code: 'ERR-SESSION-004',
          message: err instanceof Error ? err.message : 'Erreur inattendue',
          retryable: true,
        });
      }
      setStatus('error');
    }
  }, [restoreTimeout, isOnline]);

  // Initialisation et restauration combinées
  useEffect(() => {
    // Éviter la double initialisation (React StrictMode)
    if (isInitializedRef.current && serviceRef.current) {
      return;
    }

    const initializeService = async () => {
      setStatus('initializing');

      // Créer le service
      serviceRef.current = createAGSessionPersistence(agId);
      setIsUsingSupabase(serviceRef.current.isUsingSupabase());

      // Check existing data (async)
      const existingData = await serviceRef.current.hasData();
      setHasExistingData(existingData);
      setLastSaveDate(serviceRef.current.getLastSaveDate());
      isInitializedRef.current = true;

      // Restauration immédiate après initialisation
      await performRestore();
    };

    initializeService();

    return () => {
      serviceRef.current?.destroy();
      serviceRef.current = null;
      isInitializedRef.current = false;
    };
  }, [agId, performRestore]);

  // Auto-save amélioré (30s par défaut)
  useEffect(() => {
    if (!enableAutoSave || !serviceRef.current || status !== 'ready') return;

    const intervalId = setInterval(async () => {
      if (hasUnsavedChanges && getDataRef.current) {
        try {
          const data = getDataRef.current();
          await serviceRef.current?.saveAll(data);
          setLastSaveDate(new Date());
          setHasUnsavedChanges(false);
        } catch {
          // Warning non bloquant en cas d'erreur d'auto-save
          if (!isOnline) {
            setStatus('degraded');
          }
        }
      }
    }, autoSaveInterval);

    return () => clearInterval(intervalId);
  }, [enableAutoSave, autoSaveInterval, status, hasUnsavedChanges, isOnline]);

  // ========================================
  // ALERTE BEFOREUNLOAD
  // ========================================
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter ?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ========================================
  // ACTIONS
  // ========================================

  const savePresences = useCallback((presences: Record<string, PresenceData>) => {
    serviceRef.current?.savePresences(presences);
    setLastSaveDate(new Date());
    setHasUnsavedChanges(false);
  }, []);

  const saveRoles = useCallback((roles: RolesAG) => {
    serviceRef.current?.saveRoles(roles);
    setLastSaveDate(new Date());
  }, []);

  const saveVotes = useCallback((votes: Record<string, unknown>) => {
    serviceRef.current?.saveVotes(votes);
    setLastSaveDate(new Date());
  }, []);

  const saveResolutionState = useCallback((index: number, completedResolutions: string[] = []) => {
    serviceRef.current?.saveResolutionState(index, completedResolutions);
    setLastSaveDate(new Date());
  }, []);

  const saveSessionStarted = useCallback((started: boolean) => {
    serviceRef.current?.saveSessionStarted(started);
    setLastSaveDate(new Date());
  }, []);

  const saveAll = useCallback((data: Partial<AGSessionData>) => {
    serviceRef.current?.saveAll(data);
    setLastSaveDate(new Date());
    setHasUnsavedChanges(false);
  }, []);

  const restore = useCallback(async (): Promise<RestoreResult> => {
    if (!serviceRef.current) {
      return { success: false, data: null, warnings: ['Service non initialisé'], lastSaveDate: null, source: 'localStorage' };
    }
    return serviceRef.current.restore();
  }, []);

  const markDirty = useCallback(() => {
    serviceRef.current?.markDirty();
    setHasUnsavedChanges(true);
  }, []);

  const clearData = useCallback(() => {
    serviceRef.current?.clear();
    setLastSaveDate(null);
    setHasUnsavedChanges(false);
    setHasExistingData(false);
  }, []);

  // Exposer le getter de données pour l'auto-save
  const setDataGetter = useCallback((getter: () => Partial<AGSessionData>) => {
    getDataRef.current = getter;
  }, []);

  // Réessayer la restauration
  const retryRestore = useCallback(async () => {
    if (serviceRef.current) {
      await performRestore();
    } else {
      // Réinitialiser complètement le service
      serviceRef.current = createAGSessionPersistence(agId);
      setIsUsingSupabase(serviceRef.current.isUsingSupabase());
      const existingData = await serviceRef.current.hasData();
      setHasExistingData(existingData);
      await performRestore();
    }
  }, [agId, performRestore]);

  // Démarrer une nouvelle session (ignorer les données existantes)
  const startNewSession = useCallback(() => {
    clearData();
    setError(null);
    setRestoreResult({ success: true, data: null, warnings: [], lastSaveDate: null, source: 'localStorage' });
    setStatus(isOnline ? 'ready' : 'degraded');
  }, [clearData, isOnline]);

  // Migration localStorage vers Supabase
  const migrateToSupabase = useCallback(async (): Promise<{ success: boolean; migrated: string[] }> => {
    if (!serviceRef.current) {
      return { success: false, migrated: [] };
    }
    return serviceRef.current.migrateToSupabase();
  }, []);

  return {
    status,
    isRestoring,
    lastSaveDate,
    hasUnsavedChanges,
    restoreResult,
    error,
    isOnline,
    isUsingSupabase,
    savePresences,
    saveRoles,
    saveVotes,
    saveResolutionState,
    saveSessionStarted,
    saveAll,
    restore,
    retryRestore,
    startNewSession,
    markDirty,
    clearData,
    migrateToSupabase,
    setDataGetter,
    hasExistingData,
  };
}
