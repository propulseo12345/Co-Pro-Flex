/**
 * Hook pour charger les données de la page Convocation
 *
 * Gère:
 * - Chargement depuis localStorage avec timeout
 * - États: loading / ready / error / degraded
 * - Mode dégradé si chargement partiel
 * - Logging structuré des erreurs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger, CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import { DEFAULT_TIMEOUTS } from '@/lib/utils/timeout';
import { MOCK_COPROPRIETAIRES, Coproprietaire, AdressePostale } from '@/data/mock';
import { AGFormat } from '@/types';

// Types pour les données de l'AG
export interface AGData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
  format?: AGFormat | 'PRESENTIEL' | 'VISIO' | 'MIXTE';
  date: string;
  heure: string;
  lieu: string;
  adresse: string | { nomLieu: string; rue: string; codePostal: string; ville: string };
  adresseComplete?: string;
  visioUrl?: string;
  visioProvider?: string;
  budget: boolean;
  budgetMontant: string;
  budgetExercice: string;
}

export interface Resolution {
  id: string;
  titre: string;
  texte: string;
  majorite: string;
  variables?: Record<string, string>;
  templateId?: string;
}

export type SendingMethod = 'RECOMMANDE' | 'LETTRE_SIMPLE' | 'AVIS_ELECTRONIQUE' | 'EMAIL' | 'REMISE_MAIN_PROPRE';

export interface SendingChoice {
  coproprietaireId: string;
  methods: SendingMethod[];
}

export interface CoproprietaireEditable extends Coproprietaire {
  isEditing?: boolean;
}

// État du chargement
export type LoadingStatus = 'loading' | 'ready' | 'error' | 'degraded';

export interface ConvocationState {
  status: LoadingStatus;
  agData: AGData | null;
  resolutions: Resolution[];
  coproprietaires: CoproprietaireEditable[];
  sendingChoices: SendingChoice[];
  error: {
    code: string;
    message: string;
    details?: string;
  } | null;
  degradedMode: {
    agDataFailed: boolean;
    resolutionsFailed: boolean;
    coproprietairesFailed: boolean;
  };
}

interface UseConvocationDataOptions {
  agId: string;
  timeoutMs?: number;
}

interface UseConvocationDataReturn extends ConvocationState {
  reload: () => void;
  setCoproprietaires: React.Dispatch<React.SetStateAction<CoproprietaireEditable[]>>;
  setSendingChoices: React.Dispatch<React.SetStateAction<SendingChoice[]>>;
  saveCoproprietaires: (copros: CoproprietaireEditable[]) => void;
  saveSendingChoices: (choices: SendingChoice[]) => void;
}

/**
 * Charge les données depuis localStorage de manière sécurisée
 */
function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

/**
 * Hook principal pour le chargement des données de convocation
 */
export function useConvocationData({
  agId,
  timeoutMs = DEFAULT_TIMEOUTS.LOAD_DATA,
}: UseConvocationDataOptions): UseConvocationDataReturn {
  const [state, setState] = useState<ConvocationState>({
    status: 'loading',
    agData: null,
    resolutions: [],
    coproprietaires: [],
    sendingChoices: [],
    error: null,
    degradedMode: {
      agDataFailed: false,
      resolutionsFailed: false,
      coproprietairesFailed: false,
    },
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadAttemptRef = useRef(0);

  /**
   * Charge toutes les données avec gestion du timeout
   */
  const loadData = useCallback(() => {
    // Vérifier que l'agId est valide
    if (!agId || agId === 'undefined' || agId === 'null') {
      logger.error('ID AG invalide', {
        agId,
        step: 'convocation',
        action: 'loadData',
        errorCode: CONVOCATION_ERROR_CODES.INVALID_AG_ID,
      });
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: {
          code: CONVOCATION_ERROR_CODES.INVALID_AG_ID,
          message: 'Identifiant AG invalide',
          details: `L'identifiant "${agId}" n'est pas valide.`,
        },
      }));
      return;
    }

    loadAttemptRef.current += 1;
    const currentAttempt = loadAttemptRef.current;

    logger.debug('Début chargement données convocation', {
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
      if (loadAttemptRef.current === currentAttempt) {
        logger.error('Timeout chargement données convocation', {
          agId,
          step: 'convocation',
          action: 'loadData',
          errorCode: CONVOCATION_ERROR_CODES.TIMEOUT_LOADING,
        });
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: {
            code: CONVOCATION_ERROR_CODES.TIMEOUT_LOADING,
            message: 'Le chargement a pris trop de temps',
            details: `Délai de ${timeoutMs / 1000}s dépassé. Veuillez réessayer.`,
          },
        }));
      }
    }, timeoutMs);

    // Charger les données (synchrone car localStorage)
    try {
      const degradedMode = {
        agDataFailed: false,
        resolutionsFailed: false,
        coproprietairesFailed: false,
      };

      // 1. Charger les données de l'AG
      let agData: AGData | null = null;
      try {
        agData = safeJsonParse<AGData | null>(`ag-draft-${agId}`, null);
        if (!agData) {
          logger.warn('Données AG non trouvées, AG peut ne pas exister', {
            agId,
            step: 'convocation',
            action: 'loadAgData',
          });
          degradedMode.agDataFailed = true;
        }
      } catch (err) {
        logger.convocationError(
          agId,
          'loadAgData',
          CONVOCATION_ERROR_CODES.LOAD_AG_DATA_FAILED,
          err instanceof Error ? err : undefined
        );
        degradedMode.agDataFailed = true;
      }

      // 2. Charger les résolutions
      let resolutions: Resolution[] = [];
      try {
        resolutions = safeJsonParse<Resolution[]>(`ag-resolutions-${agId}`, []);
        if (resolutions.length === 0) {
          logger.debug('Aucune résolution trouvée', {
            agId,
            step: 'convocation',
            action: 'loadResolutions',
          });
        }
      } catch (err) {
        logger.convocationError(
          agId,
          'loadResolutions',
          CONVOCATION_ERROR_CODES.LOAD_RESOLUTIONS_FAILED,
          err instanceof Error ? err : undefined
        );
        degradedMode.resolutionsFailed = true;
      }

      // 3. Charger les copropriétaires
      let coproprietaires: CoproprietaireEditable[] = [];
      try {
        coproprietaires = safeJsonParse<CoproprietaireEditable[]>(
          `ag-coproprietaires-${agId}`,
          MOCK_COPROPRIETAIRES
        );
      } catch (err) {
        logger.convocationError(
          agId,
          'loadCoproprietaires',
          CONVOCATION_ERROR_CODES.LOAD_COPROPRIETAIRES_FAILED,
          err instanceof Error ? err : undefined
        );
        coproprietaires = MOCK_COPROPRIETAIRES;
        degradedMode.coproprietairesFailed = true;
      }

      // 4. Charger les choix d'envoi
      let sendingChoices: SendingChoice[] = [];
      try {
        const savedChoices = localStorage.getItem(`ag-sending-${agId}`);
        if (savedChoices) {
          sendingChoices = JSON.parse(savedChoices);
        } else {
          // Initialiser avec des choix vides pour chaque copropriétaire
          sendingChoices = coproprietaires.map((copro) => ({
            coproprietaireId: copro.id,
            methods: [] as SendingMethod[],
          }));
        }
      } catch {
        sendingChoices = coproprietaires.map((copro) => ({
          coproprietaireId: copro.id,
          methods: [] as SendingMethod[],
        }));
      }

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      // Déterminer le statut final
      const hasCriticalError = degradedMode.agDataFailed && !agData;
      const hasDegradedData =
        degradedMode.resolutionsFailed || degradedMode.coproprietairesFailed;

      if (hasCriticalError) {
        // L'AG n'existe pas ou données critiques manquantes
        setState({
          status: 'error',
          agData: null,
          resolutions: [],
          coproprietaires,
          sendingChoices,
          error: {
            code: CONVOCATION_ERROR_CODES.AG_NOT_FOUND,
            message: 'Assemblée générale non trouvée',
            details: `Aucune AG avec l'identifiant "${agId}" n'a été trouvée. Créez d'abord une AG ou vérifiez l'URL.`,
          },
          degradedMode,
        });
      } else if (hasDegradedData) {
        // Certaines données sont en mode dégradé mais on peut continuer
        setState({
          status: 'degraded',
          agData,
          resolutions,
          coproprietaires,
          sendingChoices,
          error: null,
          degradedMode,
        });
        logger.info('Chargement en mode dégradé', {
          agId,
          step: 'convocation',
          action: 'loadData',
        });
      } else {
        // Tout est OK
        setState({
          status: 'ready',
          agData,
          resolutions,
          coproprietaires,
          sendingChoices,
          error: null,
          degradedMode,
        });
        logger.debug('Chargement données convocation réussi', {
          agId,
          step: 'convocation',
          action: 'loadData',
        });
      }
    } catch (err) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      logger.convocationError(
        agId,
        'loadData',
        CONVOCATION_ERROR_CODES.LOAD_AG_DATA_FAILED,
        err instanceof Error ? err : undefined
      );

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: {
          code: CONVOCATION_ERROR_CODES.LOAD_AG_DATA_FAILED,
          message: 'Erreur lors du chargement',
          details: err instanceof Error ? err.message : 'Erreur inconnue',
        },
      }));
    }
  }, [agId, timeoutMs]);

  /**
   * Sauvegarde les copropriétaires dans localStorage
   */
  const saveCoproprietaires = useCallback(
    (copros: CoproprietaireEditable[]) => {
      try {
        localStorage.setItem(`ag-coproprietaires-${agId}`, JSON.stringify(copros));
      } catch (err) {
        logger.error('Erreur sauvegarde copropriétaires', {
          agId,
          step: 'convocation',
          action: 'saveCoproprietaires',
          errorCode: 'ERR-SAVE-001',
        });
      }
    },
    [agId]
  );

  /**
   * Sauvegarde les choix d'envoi dans localStorage
   */
  const saveSendingChoices = useCallback(
    (choices: SendingChoice[]) => {
      try {
        localStorage.setItem(`ag-sending-${agId}`, JSON.stringify(choices));
      } catch (err) {
        logger.error('Erreur sauvegarde choix envoi', {
          agId,
          step: 'convocation',
          action: 'saveSendingChoices',
          errorCode: 'ERR-SAVE-002',
        });
      }
    },
    [agId]
  );

  // Setter pour coproprietaires qui sauvegarde automatiquement
  const setCoproprietaires = useCallback(
    (
      value:
        | CoproprietaireEditable[]
        | ((prev: CoproprietaireEditable[]) => CoproprietaireEditable[])
    ) => {
      setState((prev) => {
        const newCopros =
          typeof value === 'function' ? value(prev.coproprietaires) : value;
        saveCoproprietaires(newCopros);
        return { ...prev, coproprietaires: newCopros };
      });
    },
    [saveCoproprietaires]
  );

  // Setter pour sendingChoices qui sauvegarde automatiquement
  const setSendingChoices = useCallback(
    (value: SendingChoice[] | ((prev: SendingChoice[]) => SendingChoice[])) => {
      setState((prev) => {
        const newChoices =
          typeof value === 'function' ? value(prev.sendingChoices) : value;
        saveSendingChoices(newChoices);
        return { ...prev, sendingChoices: newChoices };
      });
    },
    [saveSendingChoices]
  );

  // Charger les données au montage
  useEffect(() => {
    loadData();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadData]);

  return {
    ...state,
    reload: loadData,
    setCoproprietaires,
    setSendingChoices,
    saveCoproprietaires,
    saveSendingChoices,
  };
}

// Re-export des types pour faciliter l'import
export type { Coproprietaire, AdressePostale };
