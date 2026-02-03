/**
 * Hook d'orchestration pour Convocation
 *
 * Coordonne le chargement de toutes les données:
 * - AG (ag_meetings)
 * - Résolutions (v_ag_resolutions_results)
 * - Copropriétaires (RPC sécurisée)
 * - Drafts (ag_session_drafts)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isValidUUID } from '@/lib/ag/draft-persistence';
import { DEFAULT_TIMEOUTS } from '@/lib/utils/timeout';
import { logger } from '@/lib/utils/logger';
import type {
  ConvocationState,
  CoproprietaireEditable,
  SendingChoice,
  UseConvocationDataOptions,
} from '../types';
import {
  createInvalidAgIdError,
  createTimeoutError,
  createAgNotFoundError,
  createUnexpectedError,
  createInitialDegradedMode,
  determineStatus,
  CONVOCATION_ERROR_CODES,
} from '../services/convocationErrors';
import { useConvocationAg } from './useConvocationAg';
import { useConvocationResolutions } from './useConvocationResolutions';
import { useConvocationCoproprietaires } from './useConvocationCoproprietaires';
import { useConvocationDraft } from './useConvocationDraft';

const initialState: ConvocationState = {
  status: 'loading',
  agData: null,
  resolutions: [],
  coproprietaires: [],
  copropriete: null,
  syndic: null,
  sendingChoices: [],
  error: null,
  degradedMode: createInitialDegradedMode(),
};

export interface UseConvocationCoreReturn {
  state: ConvocationState;
  reload: () => void;
  setCoproprietaires: React.Dispatch<React.SetStateAction<CoproprietaireEditable[]>>;
  setSendingChoices: React.Dispatch<React.SetStateAction<SendingChoice[]>>;
  saveCoproprietaires: (copros: CoproprietaireEditable[]) => void;
  saveSendingChoices: (choices: SendingChoice[]) => void;
}

export function useConvocationCore({
  agId,
  timeoutMs = DEFAULT_TIMEOUTS.LOAD_DATA,
}: UseConvocationDataOptions): UseConvocationCoreReturn {
  const [state, setState] = useState<ConvocationState>(initialState);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadAttemptRef = useRef(0);
  const mountedRef = useRef(true);

  const agHook = useConvocationAg();
  const resolutionsHook = useConvocationResolutions();
  const coproprietairesHook = useConvocationCoproprietaires();
  const draftHook = useConvocationDraft();

  // Refs pour éviter les re-renders infinis (les hooks changent à chaque render)
  const agHookRef = useRef(agHook);
  const resolutionsHookRef = useRef(resolutionsHook);
  const coproprietairesHookRef = useRef(coproprietairesHook);
  const draftHookRef = useRef(draftHook);

  // Mettre à jour les refs à chaque render
  agHookRef.current = agHook;
  resolutionsHookRef.current = resolutionsHook;
  coproprietairesHookRef.current = coproprietairesHook;
  draftHookRef.current = draftHook;

  const loadData = useCallback(async () => {
    if (!agId || !isValidUUID(agId)) {
      logger.error('ID AG invalide ou non-UUID', {
        agId,
        step: 'convocation',
        action: 'loadData',
        errorCode: CONVOCATION_ERROR_CODES.INVALID_AG_ID,
      });
      setState({
        ...initialState,
        status: 'error',
        error: createInvalidAgIdError(agId),
      });
      return;
    }

    loadAttemptRef.current += 1;
    const currentAttempt = loadAttemptRef.current;

    logger.debug('Début chargement données convocation depuis Supabase', {
      agId,
      step: 'convocation',
      action: 'loadData',
    });

    setState((prev) => ({
      ...prev,
      status: 'loading',
      error: null,
    }));

    // Timeout de sécurité
    timeoutRef.current = setTimeout(() => {
      if (loadAttemptRef.current === currentAttempt && mountedRef.current) {
        logger.error('Timeout chargement données convocation', {
          agId,
          step: 'convocation',
          action: 'loadData',
          errorCode: CONVOCATION_ERROR_CODES.TIMEOUT_LOADING,
        });
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: createTimeoutError(timeoutMs),
        }));
      }
    }, timeoutMs);

    try {
      const degradedMode = createInitialDegradedMode();

      // 1. Attendre la session auth
      const hasSession = await coproprietairesHookRef.current.waitForSession();

      // 2. Charger les données AG
      const agResult = await agHookRef.current.loadAgData(agId);

      // Si la requête a été annulée (AbortError), ne rien faire - le prochain mount refera la requête
      if (agResult.isLoading && !agResult.coproId) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return; // Silencieusement ignorer - le composant va se remonter
      }

      if (agResult.failed) {
        degradedMode.agDataFailed = true;
      }

      // Si pas de coproId, erreur critique
      if (!agResult.coproId) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setState({
          ...initialState,
          status: 'error',
          error: createAgNotFoundError(agId),
          degradedMode,
        });
        return;
      }

      // 3. Charger les résolutions (en parallèle si possible)
      const resolutionsResult = await resolutionsHookRef.current.loadResolutions(agId);
      if (resolutionsResult.failed) {
        degradedMode.resolutionsFailed = true;
      }

      // 4. Charger les copropriétaires (nécessite session)
      let coproprietaires: CoproprietaireEditable[] = [];
      let copropriete = null;

      if (hasSession) {
        const coproResult = await coproprietairesHookRef.current.loadCoproprietaires(agId, agResult.coproId);
        if (coproResult.failed) {
          degradedMode.coproprietairesFailed = true;
        }
        coproprietaires = coproResult.coproprietaires;
        copropriete = coproResult.copropriete;
      } else {
        // Pas de session = pas d'appel RPC = mode dégradé
        degradedMode.coproprietairesFailed = true;
        logger.warn('Session non disponible - copropriétaires en mode dégradé', {
          agId,
          step: 'convocation',
          action: 'loadData',
        });
      }

      // 5. Charger les choix d'envoi
      const sendingChoices = await draftHookRef.current.loadSendingChoices(agId, coproprietaires);

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      // Déterminer le statut final
      const status = determineStatus(degradedMode, !!agResult.agData);

      if (status === 'error') {
        setState({
          status: 'error',
          agData: null,
          resolutions: [],
          coproprietaires,
          copropriete,
          syndic: agResult.syndic,
          sendingChoices,
          error: createAgNotFoundError(agId),
          degradedMode,
        });
      } else if (status === 'degraded') {
        setState({
          status: 'degraded',
          agData: agResult.agData,
          resolutions: resolutionsResult.resolutions,
          coproprietaires,
          copropriete,
          syndic: agResult.syndic,
          sendingChoices,
          error: null,
          degradedMode,
        });
        logger.info('Chargement en mode dégradé', {
          agId,
          step: 'convocation',
          action: 'loadData',
          degradedMode,
        });
      } else {
        setState({
          status: 'ready',
          agData: agResult.agData,
          resolutions: resolutionsResult.resolutions,
          coproprietaires,
          copropriete,
          syndic: agResult.syndic,
          sendingChoices,
          error: null,
          degradedMode,
        });
        logger.debug('Chargement données convocation réussi', {
          agId,
          step: 'convocation',
          action: 'loadData',
          resolutionsCount: resolutionsResult.resolutions.length,
          coproprietairesCount: coproprietaires.length,
        });
      }
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (!mountedRef.current) return;

      logger.error('Erreur lors du chargement depuis Supabase', {
        agId,
        step: 'convocation',
        action: 'loadData',
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: createUnexpectedError(err),
      }));
    }
  }, [agId, timeoutMs]); // Les hooks sont accédés via refs pour éviter les re-renders infinis

  // Charger au montage
  useEffect(() => {
    mountedRef.current = true;
    loadData();

    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadData]);

  // Setters
  const setCoproprietaires = useCallback(
    (value: React.SetStateAction<CoproprietaireEditable[]>) => {
      setState((prev) => ({
        ...prev,
        coproprietaires: typeof value === 'function' ? value(prev.coproprietaires) : value,
      }));
    },
    []
  );

  const setSendingChoices = useCallback(
    (value: React.SetStateAction<SendingChoice[]>) => {
      setState((prev) => {
        const newChoices = typeof value === 'function' ? value(prev.sendingChoices) : value;
        // Also update draft hook state
        draftHookRef.current.setSendingChoices(newChoices);
        return {
          ...prev,
          sendingChoices: newChoices,
        };
      });
    },
    []
  );

  const saveCoproprietaires = useCallback(
    (copros: CoproprietaireEditable[]) => {
      draftHookRef.current.saveCoproprietaires(agId, copros);
    },
    [agId]
  );

  const saveSendingChoices = useCallback(
    (choices: SendingChoice[]) => {
      draftHookRef.current.saveSendingChoices(agId, choices);
    },
    [agId]
  );

  return {
    state,
    reload: loadData,
    setCoproprietaires,
    setSendingChoices,
    saveCoproprietaires,
    saveSendingChoices,
  };
}
