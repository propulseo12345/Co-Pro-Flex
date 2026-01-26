'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  copros: Copro[];

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  setCurrentCoproId: (id: string) => void;
  refreshCopros: () => Promise<void>;

  // User role for current copro
  userRole: string | null;
  isManager: boolean;
}

const CoproContext = createContext<CoproContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface CoproProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = 'coproflex_active_copro_id';

export function CoproProvider({ children }: CoproProviderProps) {
  const [copros, setCopros] = useState<Copro[]>([]);
  const [currentCoproId, setCurrentCoproIdState] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current copro from the list
  const currentCopro = copros.find((c) => c.id === currentCoproId) || null;

  // Manager = admin or gestionnaire
  const isManager = userRole === 'admin' || userRole === 'gestionnaire';

  // Persist selection to localStorage
  const setCurrentCoproId = useCallback((id: string) => {
    setCurrentCoproIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  // Fetch user's accessible copros
  const refreshCopros = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        // Not authenticated - set empty state
        setCopros([]);
        setCurrentCoproIdState(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      // Get user's memberships with copro details
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select(`
          role,
          copros (
            id,
            name,
            address,
            city,
            postal_code
          )
        `)
        .eq('user_id', user.id);

      if (membershipError) {
        throw new Error(membershipError.message);
      }

      // Extract copros and find role
      const userCopros: Copro[] = [];
      let selectedRole: string | null = null;

      memberships?.forEach((m) => {
        if (m.copros) {
          const copro = m.copros as unknown as Copro;
          userCopros.push(copro);

          // If this is the current copro, set the role
          if (copro.id === currentCoproId) {
            selectedRole = m.role;
          }
        }
      });

      setCopros(userCopros);

      // Restore from localStorage or use first copro
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        const validStored = stored && userCopros.some((c) => c.id === stored);

        if (validStored) {
          setCurrentCoproIdState(stored);
          // Find role for stored copro
          const membership = memberships?.find(
            (m) => (m.copros as unknown as Copro)?.id === stored
          );
          setUserRole(membership?.role || null);
        } else if (userCopros.length > 0) {
          setCurrentCoproIdState(userCopros[0].id);
          localStorage.setItem(STORAGE_KEY, userCopros[0].id);
          // Use role of first copro
          setUserRole(memberships?.[0]?.role || null);
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des copropriétés');
    } finally {
      setIsLoading(false);
    }
  }, [currentCoproId]);

  // Update role when copro changes
  useEffect(() => {
    async function updateRole() {
      if (!currentCoproId) {
        setUserRole(null);
        return;
      }

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('copro_id', currentCoproId)
        .single();

      setUserRole(data?.role || null);
    }

    updateRole();
  }, [currentCoproId]);

  // Initial load
  useEffect(() => {
    refreshCopros();
  }, [refreshCopros]);

  const value: CoproContextValue = {
    currentCopro,
    currentCoproId,
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
// SELECTOR COMPONENT
// ============================================================================

interface CoproSelectorProps {
  className?: string;
}

export function CoproSelector({ className }: CoproSelectorProps) {
  const { copros, currentCoproId, setCurrentCoproId, isLoading } = useCopro();

  if (isLoading) {
    return (
      <div className={className}>
        <select disabled className="select">
          <option>Chargement...</option>
        </select>
      </div>
    );
  }

  if (copros.length === 0) {
    return null;
  }

  if (copros.length === 1) {
    return (
      <div className={className}>
        <span className="text-sm font-medium">{copros[0].name}</span>
      </div>
    );
  }

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
}
