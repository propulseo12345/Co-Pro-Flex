'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type IntegrityIssue =
  Database['public']['Views']['v_finance_integrity_issues']['Row'];

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
 * active depuis la vue `v_finance_integrity_issues` (source unique de vérité,
 * filets V0). Aucune mutation.
 */
export function useFinanceDiagnostic(): UseFinanceDiagnosticResult {
  const { currentCoproId } = useCopro();
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('v_finance_integrity_issues')
      .select('*')
      .eq('copro_id', currentCoproId);

    if (fetchError) {
      setError(fetchError.message);
      setIssues([]);
    } else {
      setIssues(data ?? []);
    }

    setIsLoading(false);
  }, [currentCoproId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { issues, isLoading, error, refresh };
}
