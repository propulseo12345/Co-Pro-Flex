/**
 * Service Active Copro - Mode Single Copro
 *
 * Ce service fournit l'ID de la copropriété active pour le mode "Single Copro".
 * Il utilise la fonction SQL get_default_copro_id() pour récupérer la première copro.
 *
 * Stratégie:
 * 1. Cache in-memory (le plus rapide)
 * 2. Cache sessionStorage (persiste entre refreshes dans la même session)
 * 3. Fetch Supabase via RPC get_default_copro_id()
 *
 * Future: Pour revenir au multi-copro, remplacer ce service par une logique
 * basée sur les memberships de l'utilisateur.
 *
 * TODO: REMOVE DEV BOOTSTRAP - La fonction ensure_dev_membership est temporaire
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'coproflex_active_copro_id';
const COPRO_NAME_KEY = 'coproflex_active_copro_name';

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

interface CoproCache {
  id: string | null;
  name: string | null;
  timestamp: number;
}

// Cache global in-memory (singleton)
let memoryCache: CoproCache | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function isCacheValid(cache: CoproCache | null): cache is CoproCache {
  if (!cache || !cache.id) return false;
  return Date.now() - cache.timestamp < CACHE_TTL;
}

// ============================================================================
// ACTIVE COPRO SERVICE
// ============================================================================

export interface ActiveCopro {
  id: string;
  name: string;
}

/**
 * Récupère l'ID de la copro active.
 * Utilise un système de cache multi-niveau pour optimiser les performances.
 *
 * TODO: REMOVE DEV BOOTSTRAP - En mode dev, appelle ensure_dev_membership
 * pour auto-créer le membership si nécessaire.
 */
export async function getActiveCopro(): Promise<ActiveCopro | null> {
  // 1. Check in-memory cache
  if (isCacheValid(memoryCache) && memoryCache.id && memoryCache.name) {
    return { id: memoryCache.id, name: memoryCache.name };
  }

  // 2. Check sessionStorage
  if (typeof window !== 'undefined') {
    const storedId = sessionStorage.getItem(STORAGE_KEY);
    const storedName = sessionStorage.getItem(COPRO_NAME_KEY);
    if (storedId && storedName) {
      memoryCache = { id: storedId, name: storedName, timestamp: Date.now() };
      return { id: storedId, name: storedName };
    }
  }

  // 3. Fetch from Supabase with DEV BOOTSTRAP
  try {
    const supabase = createClient();

    // =================================================================
    // TODO: REMOVE DEV BOOTSTRAP - Cette section est temporaire
    // Appel à ensure_dev_membership pour auto-créer membership admin
    // =================================================================
    let coproIdFromBootstrap: string | null = null;
    try {
      // Cast to any to bypass TypeScript check for untyped RPC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bootstrapData, error: bootstrapError } = await (supabase as any)
        .rpc('ensure_dev_membership', { p_copro_id: null });

      if (bootstrapError) {
        // Si l'utilisateur n'est pas authentifié, ce n'est pas grave
        // On continue avec la méthode standard
        if (!bootstrapError.message.includes('Not authenticated')) {
          // DEV bootstrap warning
        }
      } else if (bootstrapData) {
        coproIdFromBootstrap = bootstrapData as string;
        // DEV bootstrap: membership ensured
      }
    } catch (bootstrapErr) {
      // Silently ignore bootstrap errors - fallback to standard method
      // DEV bootstrap failed, using standard method
    }
    // =================================================================
    // END DEV BOOTSTRAP
    // =================================================================

    // Récupérer la copro (préférer celle du bootstrap si disponible)
    let copro: { id: string; name: string } | null = null;

    if (coproIdFromBootstrap) {
      const { data, error } = await supabase
        .from('copros')
        .select('id, name')
        .eq('id', coproIdFromBootstrap)
        .single();

      if (!error && data) {
        copro = data;
      }
    }

    // Fallback: récupérer la première copro
    if (!copro) {
      const { data, error: selectError } = await supabase
        .from('copros')
        .select('id, name')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (selectError || !data) {
        console.error('[ActiveCopro] Select error:', selectError);
        return null;
      }
      copro = data;
    }

    const result: ActiveCopro = { id: copro.id, name: copro.name };

    // Update caches
    memoryCache = { id: result.id, name: result.name, timestamp: Date.now() };
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEY, result.id);
      sessionStorage.setItem(COPRO_NAME_KEY, result.name);
    }

    return result;
  } catch (err) {
    console.error('[ActiveCopro] Fetch error:', err);
    return null;
  }
}

/**
 * Récupère uniquement l'ID de la copro active (raccourci)
 */
export async function getActiveCoproId(): Promise<string | null> {
  const copro = await getActiveCopro();
  return copro?.id ?? null;
}

/**
 * Invalide le cache (utile pour le futur multi-copro)
 */
export function invalidateActiveCoproCache(): void {
  memoryCache = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(COPRO_NAME_KEY);
  }
}

/**
 * Change la copro active (utilisé par le portefeuille gestionnaire).
 * Met à jour le cache mémoire + sessionStorage.
 */
export function setActiveCopro(id: string, name: string): void {
  memoryCache = { id, name, timestamp: Date.now() };
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, id);
    sessionStorage.setItem(COPRO_NAME_KEY, name);
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

export interface UseActiveCoproReturn {
  coproId: string | null;
  coproName: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook React pour accéder à la copro active.
 *
 * Usage:
 * ```tsx
 * const { coproId, coproName, isLoading, error } = useActiveCopro();
 * ```
 */
export function useActiveCopro(): UseActiveCoproReturn {
  const [coproId, setCoproId] = useState<string | null>(null);
  const [coproName, setCoproName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveCopro = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const copro = await getActiveCopro();

      if (copro) {
        setCoproId(copro.id);
        setCoproName(copro.name);
      } else {
        setError('Aucune copropriété trouvée');
        setCoproId(null);
        setCoproName(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setCoproId(null);
      setCoproName(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCopro();
  }, [fetchActiveCopro]);

  return {
    coproId,
    coproName,
    isLoading,
    error,
    refresh: fetchActiveCopro,
  };
}

/**
 * Hook simplifié qui retourne uniquement l'ID (pour compatibilité)
 */
export function useActiveCoproId(): {
  coproId: string | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const { coproId, isLoading, error, refresh } = useActiveCopro();
  return { coproId, isLoading, error, refresh };
}
