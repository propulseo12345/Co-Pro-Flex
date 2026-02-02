/**
 * Hook pour charger les résolutions depuis v_ag_resolutions_results
 */

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger, CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import type { Resolution } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export interface UseConvocationResolutionsResult {
  resolutions: Resolution[];
  isLoading: boolean;
  error: Error | null;
  failed: boolean;
}

export interface UseConvocationResolutionsReturn extends UseConvocationResolutionsResult {
  loadResolutions: (agId: string) => Promise<UseConvocationResolutionsResult>;
  reset: () => void;
}

interface DbResolution {
  id: string;
  title: string;
  description: string | null;
  majority_type: string;
  variables?: Record<string, unknown> | null;
}

const initialResult: UseConvocationResolutionsResult = {
  resolutions: [],
  isLoading: false,
  error: null,
  failed: false,
};

export function useConvocationResolutions(): UseConvocationResolutionsReturn {
  const [state, setState] = useState<UseConvocationResolutionsResult>(initialResult);

  const reset = useCallback(() => {
    setState(initialResult);
  }, []);

  const loadResolutions = useCallback(async (agId: string): Promise<UseConvocationResolutionsResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = createUntypedClient();

      const { data: dbResolutions, error: resError } = await supabase
        .from('v_ag_resolutions_results')
        .select('*')
        .eq('ag_id', agId)
        .order('resolution_number', { ascending: true });

      if (resError) {
        throw resError;
      }

      let resolutions: Resolution[] = [];

      if (dbResolutions && Array.isArray(dbResolutions)) {
        resolutions = dbResolutions.map((dbRes: DbResolution) => ({
          id: dbRes.id,
          titre: dbRes.title,
          texte: dbRes.description || '',
          majorite: dbRes.majority_type,
          variables: dbRes.variables
            ? Object.fromEntries(
                Object.entries(dbRes.variables).map(([k, v]) => [k, String(v ?? '')])
              )
            : undefined,
        }));
      }

      if (resolutions.length === 0) {
        logger.debug('Aucune résolution trouvée en DB pour cette AG', {
          agId,
          step: 'convocation',
          action: 'loadResolutions',
        });
      }

      const result: UseConvocationResolutionsResult = {
        resolutions,
        isLoading: false,
        error: null,
        failed: false,
      };

      setState(result);
      return result;
    } catch (err) {
      logger.convocationError(
        agId,
        'loadResolutions',
        CONVOCATION_ERROR_CODES.LOAD_RESOLUTIONS_FAILED,
        err instanceof Error ? err : undefined
      );

      const result: UseConvocationResolutionsResult = {
        resolutions: [],
        isLoading: false,
        error: err instanceof Error ? err : new Error('Unknown error'),
        failed: true,
      };

      setState(result);
      return result;
    }
  }, []);

  return {
    ...state,
    loadResolutions,
    reset,
  };
}
