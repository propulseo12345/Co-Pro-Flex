/**
 * Hook de synchronisation pour le Mode Projecteur
 *
 * Polling localStorage pour synchronisation temps réel entre
 * la page session et la vue projecteur
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PROJECTOR_STORAGE_KEYS,
  PROJECTOR_CONFIG,
  type ProjectorSessionData,
  type ProjectorSyncStatus,
  type ProjectorDisplayState,
  type UseProjectorSyncOptions,
  type UseProjectorSyncReturn,
} from '@/types/projector';
import { isValidProjectorAccess } from '@/lib/utils/projector-token';

/**
 * Détermine l'état d'affichage basé sur les données
 */
function determineDisplayState(
  data: ProjectorSessionData | null,
  syncStatus: ProjectorSyncStatus,
  isValidToken: boolean
): ProjectorDisplayState {
  // États de connexion/token
  if (syncStatus === 'connecting') return 'loading';
  if (!isValidToken) return 'invalid_token';
  if (syncStatus === 'error' || syncStatus === 'disconnected') return 'error';

  // Pas de données
  if (!data) return 'loading';

  // Session non démarrée
  if (!data.sessionStarted) return 'waiting_session';

  // Session en pause
  if (data.sessionPaused) return 'session_paused';

  // Session terminée
  if (data.sessionEnded) return 'session_ended';

  // Pas de résolution courante
  if (!data.currentResolution) return 'between_resolutions';

  // Point d'information
  if (data.currentResolution.isInformation) return 'information_point';

  // Vote en cours ou clôturé
  switch (data.currentResolution.voteStatus) {
    case 'waiting':
      return 'between_resolutions';
    case 'in_progress':
      return 'vote_in_progress';
    case 'closed':
      return 'vote_closed';
    default:
      return 'vote_in_progress';
  }
}

/**
 * Hook principal de synchronisation projecteur
 */
export function useProjectorSync(options: UseProjectorSyncOptions): UseProjectorSyncReturn {
  const {
    agId,
    token,
    pollingInterval = PROJECTOR_CONFIG.POLLING_INTERVAL,
    staleThreshold = PROJECTOR_CONFIG.STALE_THRESHOLD,
    onDataUpdate,
    onError,
  } = options;

  // États
  const [data, setData] = useState<ProjectorSessionData | null>(null);
  const [syncStatus, setSyncStatus] = useState<ProjectorSyncStatus>('connecting');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isValidToken, setIsValidToken] = useState<boolean>(false);

  // Refs pour éviter les closures stales
  const dataVersionRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef<boolean>(true);

  /**
   * Lecture des données depuis localStorage
   */
  const readData = useCallback((): ProjectorSessionData | null => {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(PROJECTOR_STORAGE_KEYS.DATA(agId));
      if (!stored) return null;
      return JSON.parse(stored) as ProjectorSessionData;
    } catch {
      return null;
    }
  }, [agId]);

  /**
   * Synchronisation principale
   */
  const sync = useCallback(() => {
    if (!isActiveRef.current) return;

    try {
      // Valider le token
      const tokenValid = isValidProjectorAccess(agId, token);
      setIsValidToken(tokenValid);

      if (!tokenValid) {
        setSyncStatus('error');
        setError(new Error('Token invalide ou expiré'));
        return;
      }

      // Lire les données
      const newData = readData();

      if (!newData) {
        // Pas de données mais token valide = attente session
        setSyncStatus('connected');
        setData(null);
        return;
      }

      // Vérifier si les données ont changé (via version)
      if (newData.version !== dataVersionRef.current) {
        dataVersionRef.current = newData.version;
        setData(newData);
        onDataUpdate?.(newData);
      }

      // Vérifier si les données sont stale
      const lastUpdate = new Date(newData.lastUpdated);
      const now = new Date();
      const ageMs = now.getTime() - lastUpdate.getTime();

      if (ageMs > staleThreshold) {
        setSyncStatus('stale');
      } else {
        setSyncStatus('synced');
      }

      setLastSyncTime(now);
      setError(null);

    } catch (err) {
      const syncError = err instanceof Error ? err : new Error('Erreur de synchronisation');
      setError(syncError);
      setSyncStatus('error');
      onError?.(syncError);
    }
  }, [agId, token, readData, staleThreshold, onDataUpdate, onError]);

  /**
   * Force une synchronisation immédiate
   */
  const forceSync = useCallback(() => {
    sync();
  }, [sync]);

  /**
   * Déconnexion et arrêt du polling
   */
  const disconnect = useCallback(() => {
    isActiveRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSyncStatus('disconnected');
  }, []);

  /**
   * Démarrage du polling
   */
  useEffect(() => {
    isActiveRef.current = true;

    // Sync initial
    sync();

    // Démarrer le polling
    intervalRef.current = setInterval(sync, pollingInterval);

    // Cleanup
    return () => {
      isActiveRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sync, pollingInterval]);

  /**
   * Écouter les changements localStorage (sync entre onglets)
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PROJECTOR_STORAGE_KEYS.DATA(agId)) {
        sync();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [agId, sync]);

  // Calcul de l'état d'affichage
  const displayState = determineDisplayState(data, syncStatus, isValidToken);

  return {
    data,
    syncStatus,
    displayState,
    lastSyncTime,
    error,
    isValidToken,
    forceSync,
    disconnect,
  };
}

export default useProjectorSync;
