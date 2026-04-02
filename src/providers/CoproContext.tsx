'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useActiveCopro, setActiveCopro, invalidateActiveCoproCache } from '@/lib/copro/activeCopro';
import { createClient } from '@/lib/supabase/client';

// ============================================================================
// TYPES
// ============================================================================

export interface Copro {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
}

export interface CoproContextValue {
  // Current selection
  currentCopro: Copro | null;
  currentCoproId: string | null;

  // Available copros for current user
  // NOTE: En mode Single Copro, cette liste contient uniquement la copro active
  copros: Copro[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  // NOTE: setCurrentCoproId est conservé pour compatibilité future multi-copro
  // mais n'a aucun effet en mode Single Copro
  setCurrentCoproId: (id: string, name?: string) => void;
  refreshCopros: () => Promise<void>;

  // User role for current copro
  userRole: string | null;
  isManager: boolean;
}

const CoproContext = createContext<CoproContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER - MODE SINGLE COPRO
// ============================================================================

interface CoproProviderProps {
  children: ReactNode;
}

/**
 * CoproProvider - Mode Single Copro
 *
 * Simplifié pour n'utiliser qu'une seule copropriété (la première par date).
 * Utilise le service activeCopro pour récupérer l'ID automatiquement.
 *
 * Pour revenir au mode multi-copro:
 * 1. Restaurer la logique basée sur memberships (voir git history)
 * 2. Réactiver le CoproSelector dans l'UI
 * 3. Retirer la dépendance sur useActiveCopro
 */
export function CoproProvider({ children }: CoproProviderProps) {
  // Mode Single Copro: utiliser le hook activeCopro
  const { coproId: activeCoproId, coproName, isLoading: activeLoading, error: activeError, refresh: refreshActiveCopro } = useActiveCopro();

  const [currentCopro, setCurrentCopro] = useState<Copro | null>(null);
  const [overrideCoproId, setOverrideCoproId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ID effectif : l'override local (set par onboarding/sélecteur) prime sur activeCopro
  const effectiveCoproId = overrideCoproId || activeCoproId;

  // En mode single copro, la liste ne contient que la copro active
  const copros = currentCopro ? [currentCopro] : [];

  // Manager = admin or gestionnaire (défaut à true en mode single copro pour simplifier)
  const isManager = userRole === 'admin' || userRole === 'gestionnaire' || true;

  // Charger les détails de la copro active
  const loadCoproDetails = useCallback(async (coproId: string) => {
    try {
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('copros')
        .select('id, name, address, city, postal_code')
        .eq('id', coproId)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (data) {
        setCurrentCopro(data as Copro);
      }

      // Tenter de récupérer le rôle (optionnel, peut échouer si pas de membership)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membership } = await supabase
          .from('memberships')
          .select('role')
          .eq('user_id', user.id)
          .eq('copro_id', coproId)
          .maybeSingle();

        setUserRole(membership?.role || 'gestionnaire'); // Défaut: gestionnaire en mode single copro
      } else {
        // Pas d'utilisateur authentifié, défaut à gestionnaire pour le dev
        setUserRole('gestionnaire');
      }

    } catch (err) {
      console.error('[CoproContext] Erreur chargement copro:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    }
  }, []);

  // setCurrentCoproId - Bascule la copro active (cache + contexte + state local)
  // Utilisé par l'onboarding et le futur sélecteur multi-copro
  const setCurrentCoproId = useCallback((id: string, name?: string) => {
    // 1. State local React — prise en compte immédiate
    setOverrideCoproId(id);
    // 2. Cache global (mémoire + sessionStorage) — persistance
    setActiveCopro(id, name || '');
    // 3. Recharger les détails depuis Supabase
    loadCoproDetails(id).finally(() => setIsLoading(false));
  }, [loadCoproDetails]);

  // Synchroniser avec activeCopro
  useEffect(() => {
    if (activeLoading) {
      setIsLoading(true);
      return;
    }

    if (activeError) {
      setError(activeError);
      setIsLoading(false);
      return;
    }

    if (effectiveCoproId) {
      // Charger les détails complets
      loadCoproDetails(effectiveCoproId).finally(() => {
        setIsLoading(false);
      });
    } else {
      setError('Aucune copropriété disponible');
      setIsLoading(false);
    }
  }, [effectiveCoproId, activeLoading, activeError, loadCoproDetails]);

  // Refresh = recharger la copro active
  const refreshCopros = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await refreshActiveCopro();
  }, [refreshActiveCopro]);

  const value: CoproContextValue = {
    currentCopro,
    currentCoproId: effectiveCoproId,  // Override local > activeCopro
    copros,
    isLoading,
    error,
    setCurrentCoproId,
    refreshCopros,
    userRole,
    isManager,
  };

  return (
    <CoproContext.Provider value={value}>
      {children}
    </CoproContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useCopro(): CoproContextValue {
  const context = useContext(CoproContext);

  if (context === undefined) {
    throw new Error('useCopro must be used within a CoproProvider');
  }

  return context;
}

// ============================================================================
// SELECTOR COMPONENT - DÉSACTIVÉ EN MODE SINGLE COPRO
// ============================================================================

interface CoproSelectorProps {
  className?: string;
}

/**
 * CoproSelector - Affiche le nom de la copro active
 *
 * En mode Single Copro:
 * - Affiche uniquement le nom de la copro (pas de dropdown)
 * - Le sélecteur multi-copro est désactivé
 *
 * Pour réactiver le mode multi-copro:
 * - Décommenter le code du sélecteur ci-dessous
 * - Mettre SINGLE_COPRO_MODE à false
 */
const SINGLE_COPRO_MODE = true;

export function CoproSelector({ className }: CoproSelectorProps) {
  const { copros, currentCopro, isLoading } = useCopro();

  if (isLoading) {
    return (
      <div className={className}>
        <span className="text-sm text-gray-500">Chargement...</span>
      </div>
    );
  }

  // Mode Single Copro: afficher uniquement le nom
  if (SINGLE_COPRO_MODE || copros.length <= 1) {
    if (!currentCopro) {
      return null;
    }
    return (
      <div className={className}>
        <span className="text-sm font-medium">{currentCopro.name}</span>
      </div>
    );
  }

  // TODO: Multi-copro - Réactiver ce code
  /*
  return (
    <div className={className}>
      <select
        value={currentCoproId || ''}
        onChange={(e) => setCurrentCoproId(e.target.value)}
        className="select select-sm"
      >
        {copros.map((copro) => (
          <option key={copro.id} value={copro.id}>
            {copro.name}
          </option>
        ))}
      </select>
    </div>
  );
  */

  return null;
}
