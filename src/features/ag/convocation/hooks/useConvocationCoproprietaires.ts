/**
 * Hook pour charger les copropriétaires via RPC sécurisée
 *
 * IMPORTANT: Gère proprement l'authentification
 * - Ne fait AUCUN appel RPC sans session valide
 * - Retourne une erreur claire si pas de session
 * - Log détaillé pour debugging
 */

import { useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger, CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import type { CoproprietaireEditable, AdressePostale, CoproprieteInfo } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

export interface UseConvocationCoproprietairesResult {
  coproprietaires: CoproprietaireEditable[];
  copropriete: CoproprieteInfo | null;
  isLoading: boolean;
  error: Error | null;
  failed: boolean;
  authError: boolean;
}

export interface UseConvocationCoproprietairesReturn extends UseConvocationCoproprietairesResult {
  loadCoproprietaires: (agId: string, coproId: string) => Promise<UseConvocationCoproprietairesResult>;
  waitForSession: () => Promise<boolean>;
  reset: () => void;
}

interface DbOwner {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address_line1: string | null;
  postal_code: string | null;
  city: string | null;
  total_tantiemes: number;
  lots_count: number;
}

const initialResult: UseConvocationCoproprietairesResult = {
  coproprietaires: [],
  copropriete: null,
  isLoading: false,
  error: null,
  failed: false,
  authError: false,
};

const MAX_SESSION_RETRIES = 3;
const SESSION_RETRY_DELAY = 500;

export function useConvocationCoproprietaires(): UseConvocationCoproprietairesReturn {
  const [state, setState] = useState<UseConvocationCoproprietairesResult>(initialResult);
  const sessionCheckedRef = useRef(false);

  const reset = useCallback(() => {
    setState(initialResult);
    sessionCheckedRef.current = false;
  }, []);

  const waitForSession = useCallback(async (): Promise<boolean> => {
    const supabase = createUntypedClient();
    let attempts = 0;

    while (attempts < MAX_SESSION_RETRIES) {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionData?.session?.user) {
        sessionCheckedRef.current = true;
        return true;
      }

      attempts++;
      if (attempts < MAX_SESSION_RETRIES) {
        logger.debug('Session non prête, retry...', {
          step: 'convocation',
          action: 'sessionCheck',
          attempt: attempts,
          sessionError: sessionError?.message,
        });
        await new Promise((resolve) => setTimeout(resolve, SESSION_RETRY_DELAY));
      }
    }

    logger.warn('Session auth non disponible après retries', {
      step: 'convocation',
      action: 'waitForSession',
      attempts,
    });

    return false;
  }, []);

  const loadCoproprietaires = useCallback(
    async (agId: string, coproId: string): Promise<UseConvocationCoproprietairesResult> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null, authError: false }));

      const supabase = createUntypedClient();

      // Vérifier la session AVANT tout appel RPC
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const hasSession = !!sessionData?.session?.user;

      if (!hasSession) {
        logger.warn('Session auth non disponible pour appel RPC copropriétaires', {
          agId,
          coproId,
          step: 'convocation',
          action: 'loadCoproprietaires',
          sessionError: sessionError?.message,
          hasSession: false,
        });

        const result: UseConvocationCoproprietairesResult = {
          coproprietaires: [],
          copropriete: null,
          isLoading: false,
          error: new Error('Session auth requise pour charger les copropriétaires (401)'),
          failed: true,
          authError: true,
        };

        setState(result);
        return result;
      }

      try {
        // Charger copropriétaires via RPC sécurisée
        const { data: dbOwners, error: ownersError } = await supabase.rpc('rpc_get_ag_coproprietaires', {
          p_ag_id: agId,
        });

        if (ownersError) {
          logger.error('Erreur RPC rpc_get_ag_coproprietaires', {
            agId,
            step: 'convocation',
            action: 'loadCoproprietaires',
            errorCode: ownersError.code,
            errorMessage: ownersError.message,
            hasSession,
            userId: sessionData?.session?.user?.id,
          });
          throw ownersError;
        }

        let coproprietaires: CoproprietaireEditable[] = [];

        if (dbOwners && Array.isArray(dbOwners)) {
          coproprietaires = dbOwners.map((owner: DbOwner) => {
            let adressePostale: AdressePostale | undefined;
            if (owner.address_line1 && owner.postal_code && owner.city) {
              adressePostale = {
                rue: owner.address_line1,
                codePostal: owner.postal_code,
                ville: owner.city,
              };
            }

            return {
              id: owner.id,
              nom: owner.display_name || 'Sans nom',
              lot: `${owner.lots_count} lot${owner.lots_count > 1 ? 's' : ''}`,
              email: owner.email || undefined,
              telephone: owner.mobile || owner.phone || undefined,
              adressePostale,
              tantiemes: owner.total_tantiemes || 0,
            };
          });
        }

        if (coproprietaires.length === 0) {
          logger.warn('Aucun copropriétaire trouvé en DB pour cette copropriété', {
            agId,
            coproId,
            step: 'convocation',
            action: 'loadCoproprietaires',
          });
        }

        // Charger infos copropriété
        let copropriete: CoproprieteInfo | null = null;
        try {
          const { data: coproData, error: coproError } = await supabase
            .from('copros')
            .select('id, name, address, city, postal_code')
            .eq('id', coproId)
            .single();

          if (!coproError && coproData) {
            copropriete = {
              id: coproData.id,
              nom: coproData.name || 'Copropriété',
              adresse: coproData.address || '',
              ville: coproData.city || '',
              codePostal: coproData.postal_code || '',
            };
          }
        } catch (err) {
          logger.warn('Impossible de charger les infos copropriété', {
            agId,
            coproId,
            step: 'convocation',
            action: 'loadCopropriete',
            error: err instanceof Error ? err.message : 'Unknown',
          });
        }

        const result: UseConvocationCoproprietairesResult = {
          coproprietaires,
          copropriete,
          isLoading: false,
          error: null,
          failed: false,
          authError: false,
        };

        setState(result);
        return result;
      } catch (err) {
        logger.convocationError(
          agId,
          'loadCoproprietaires',
          CONVOCATION_ERROR_CODES.LOAD_COPROPRIETAIRES_FAILED,
          err instanceof Error ? err : undefined
        );

        const result: UseConvocationCoproprietairesResult = {
          coproprietaires: [],
          copropriete: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Unknown error'),
          failed: true,
          authError: false,
        };

        setState(result);
        return result;
      }
    },
    []
  );

  return {
    ...state,
    loadCoproprietaires,
    waitForSession,
    reset,
  };
}
