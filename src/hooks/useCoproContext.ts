'use client';

/**
 * Hook pour le mode Single Copro
 * Récupère la copropriété par défaut de l'utilisateur via Supabase RPC
 * Remplace progressivement CurrentUserProvider
 */

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export interface CoproProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export interface Copro {
  id: string;
  name: string;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  siret: string | null;
  num_immatriculation: string | null;
  date_reglement: string | null;
}

export interface CoproContextValue {
  // Auth
  user: User | null;
  session: Session | null;
  profile: CoproProfile | null;

  // Single Copro
  coproId: string | null;
  copro: Copro | null;

  // State
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;

  // Actions
  refetch: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useCoproContext(): CoproContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CoproProfile | null>(null);
  const [coproId, setCoproId] = useState<string | null>(null);
  const [copro, setCopro] = useState<Copro | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchCoproContext = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. Get session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        // Not authenticated - clear state
        setProfile(null);
        setCoproId(null);
        setCopro(null);
        return;
      }

      // 2. Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, phone')
        .eq('id', currentSession.user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('Profile fetch error:', profileError);
      }
      setProfile(profileData as CoproProfile | null);

      // 3. Get default copro (first one by creation date)
      // Direct query instead of RPC to avoid typing issues
      const { data: coproData, error: coproError } = await supabase
        .from('copros')
        .select('id, name, address, postal_code, city, siret, num_immatriculation, date_reglement')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (coproError || !coproData) {
        console.warn('Copro fetch error:', coproError);
        setCoproId(null);
        setCopro(null);
        return;
      }

      setCoproId(coproData.id);
      setCopro(coproData as Copro);

    } catch (err) {
      console.error('CoproContext error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setCoproId(null);
    setCopro(null);
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchCoproContext();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await fetchCoproContext();
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setCoproId(null);
          setCopro(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCoproContext, supabase.auth]);

  return {
    user,
    session,
    profile,
    coproId,
    copro,
    isLoading,
    isAuthenticated: !!user,
    error,
    refetch: fetchCoproContext,
    signOut,
  };
}
