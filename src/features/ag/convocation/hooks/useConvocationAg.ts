/**
 * Hook pour charger les données AG depuis ag_meetings
 */

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { loadDraft } from '@/lib/ag/draft-persistence';
import { logger, CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import { AGFormat } from '@/types';
import type { AgMeeting } from '@/lib/ag/types';
import type { AGData, SyndicInfo, DraftMetadata } from '../types';
import {
  TYPE_MAPPING_FROM_DB,
  extractDateFromISO,
  extractTimeFromISO,
  deserializeMetadata,
} from '../services/convocationHelpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export interface UseConvocationAgResult {
  agData: AGData | null;
  syndic: SyndicInfo | null;
  coproId: string | null;
  isLoading: boolean;
  error: Error | null;
  failed: boolean;
}

export interface UseConvocationAgReturn extends UseConvocationAgResult {
  loadAgData: (agId: string) => Promise<UseConvocationAgResult>;
  reset: () => void;
}

const initialResult: UseConvocationAgResult = {
  agData: null,
  syndic: null,
  coproId: null,
  isLoading: false,
  error: null,
  failed: false,
};

export function useConvocationAg(): UseConvocationAgReturn {
  const [state, setState] = useState<UseConvocationAgResult>(initialResult);
  const mountedRef = useRef(true);

  // Créer le client une seule fois
  const supabaseRef = useRef(createUntypedClient());

  const reset = useCallback(() => {
    setState(initialResult);
  }, []);

  const loadAgData = useCallback(async (agId: string): Promise<UseConvocationAgResult> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const supabase = supabaseRef.current;

      const { data: meeting, error: meetingError } = await supabase
        .from('ag_meetings')
        .select('*')
        .eq('id', agId)
        .single();

      // Ignorer AbortError (causé par React Strict Mode ou démontage du composant)
      // Retourner un état "loading" pour que le prochain mount refasse la requête
      if (meetingError?.message?.toLowerCase().includes('abort')) {
        return { ...initialResult, isLoading: true };
      }

      if (meetingError || !meeting) {
        logger.error('AG non trouvée dans Supabase', {
          agId,
          step: 'convocation',
          action: 'loadAgData',
          error: meetingError?.message,
        });
        throw new Error(`AG non trouvée: ${meetingError?.message || 'ID inconnu'}`);
      }

      const m = meeting as AgMeeting;
      const coproId = m.copro_id;

      let sessionMetadata: DraftMetadata = {};
      try {
        const { data: sessionData } = await loadDraft<DraftMetadata>(agId, 'session', `ag-session-${agId}`);
        if (sessionData) {
          sessionMetadata = sessionData;
        } else {
          sessionMetadata = deserializeMetadata(m.opening_notes);
        }
      } catch {
        sessionMetadata = deserializeMetadata(m.opening_notes);
      }

      const agData: AGData = {
        type: TYPE_MAPPING_FROM_DB[m.meeting_type] || 'ORDINAIRE',
        format: sessionMetadata.format || AGFormat.PRESENTIEL,
        date: extractDateFromISO(m.meeting_date),
        heure: sessionMetadata.heure || extractTimeFromISO(m.meeting_date) || '',
        lieu: m.location || '',
        adresse: sessionMetadata.adresse || {
          nomLieu: '',
          rue: '',
          codePostal: '',
          ville: '',
        },
        adresseComplete: m.location || '',
        visioUrl: sessionMetadata.visioUrl || '',
        visioProvider: sessionMetadata.visioProvider,
        budget: sessionMetadata.budget || false,
        budgetMontant: sessionMetadata.budgetMontant || '',
        budgetExercice: sessionMetadata.budgetExercice || (new Date().getFullYear() + 1 + ''),
      };

      const syndic = sessionMetadata.syndic || null;

      const result: UseConvocationAgResult = {
        agData,
        syndic,
        coproId,
        isLoading: false,
        error: null,
        failed: false,
      };

      setState(result);
      return result;
    } catch (err) {
      // Ignorer AbortError (causé par React Strict Mode ou démontage du composant)
      // Retourner un état "loading" pour que le prochain mount refasse la requête
      if (err instanceof Error && (err.name === 'AbortError' || err.message.toLowerCase().includes('abort'))) {
        return { ...initialResult, isLoading: true };
      }

      logger.convocationError(
        agId,
        'loadAgData',
        CONVOCATION_ERROR_CODES.LOAD_AG_DATA_FAILED,
        err instanceof Error ? err : undefined
      );

      const result: UseConvocationAgResult = {
        agData: null,
        syndic: null,
        coproId: null,
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
    loadAgData,
    reset,
  };
}
