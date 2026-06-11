'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type IntegrityIssue =
  Database['public']['Functions']['audit_finance_integrity']['Returns'][number];

interface UseFinanceDiagnosticResult {
  issues: IntegrityIssue[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Charge en lecture seule les anomalies de cohérence financière de la copro
 * active via la fonction `audit_finance_integrity` (source unique de vérité,
 * filets V0). Aucune mutation.
 */
export function useFinanceDiagnostic(): UseFinanceDiagnosticResult {
  const { currentCoproId, isLoading: coproLoading, error: coproError } = useCopro();
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Compteur de requêtes : ignore les réponses obsolètes (changement de copro
  // pendant un fetch en vol → on ne doit pas écrire le résultat d'une autre copro).
  const reqRef = useRef(0);

  const refresh = useCallback(async () => {
    const reqId = ++reqRef.current;

    // Copro active pas encore résolue : NE PAS dégrader en « tout au vert ».
    if (!currentCoproId) {
      setIssues([]);
      if (coproError) {
        setError(coproError);
        setIsLoading(false);
      } else if (coproLoading) {
        setError(null);
        setIsLoading(true); // le contexte résout encore la copro active
      } else {
        setError('Aucune copropriété active sélectionnée.');
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .rpc('audit_finance_integrity', { p_copro_id: currentCoproId });

    // Réponse obsolète (la copro active a changé entre-temps) → on l'ignore.
    if (reqId !== reqRef.current) return;

    if (fetchError) {
      setError(fetchError.message);
      setIssues([]);
    } else {
      setIssues(data ?? []);
    }

    setIsLoading(false);
  }, [currentCoproId, coproLoading, coproError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { issues, isLoading, error, refresh };
}
