/**
 * Hook pour charger les données de la page Convocation
 *
 * Gère:
 * - Chargement depuis Supabase (ag_meetings + ag_session_drafts)
 * - Fallback localStorage pour les AG legacy (non-UUID)
 * - États: loading / ready / error / degraded
 * - Mode dégradé si chargement partiel
 * - Logging structuré des erreurs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger, CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import { DEFAULT_TIMEOUTS } from '@/lib/utils/timeout';
import { MOCK_COPROPRIETAIRES, Coproprietaire, AdressePostale } from '@/data/mock';
export type { AdressePostale };
import { AGFormat } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';
import { useCopro } from '@/providers/CoproContext';
import type { AgMeeting } from '@/lib/ag/types';

// Helper: Create untyped client for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

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
 * Mapping des types AG depuis la DB vers le frontend
 */
const TYPE_MAPPING_FROM_DB: Record<string, AGData['type']> = {
  'ordinary': 'ORDINAIRE',
  'extraordinary': 'EXTRAORDINAIRE',
  'mixed': 'URGENTE',
  'special': 'URGENTE',
};

/**
 * Charge les données depuis localStorage de manière sécurisée (pour legacy)
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
 * Extrait la date (sans heure) d'un datetime ISO
 */
function extractDateFromISO(isoString: string | null): string {
  if (!isoString) return '';
  try {
    return isoString.split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Extrait l'heure d'un datetime ISO
 */
function extractTimeFromISO(isoString: string | null): string {
  if (!isoString) return '';
  try {
    const timePart = isoString.split('T')[1];
    if (!timePart) return '';
    return timePart.substring(0, 5); // HH:MM
  } catch {
    return '';
  }
}

/**
 * Désérialise les métadonnées depuis opening_notes
 */
interface DraftMetadata {
  format?: AGFormat;
  heure?: string;
  adresse?: { nomLieu: string; rue: string; codePostal: string; ville: string };
  visioUrl?: string;
  visioProvider?: string;
  budget?: boolean;
  budgetMontant?: string;
  budgetExercice?: string;
}

function deserializeMetadata(raw: string | null): DraftMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DraftMetadata;
  } catch {
    return {};
  }
}

/**
 * Hook principal pour le chargement des données de convocation
 */
export function useConvocationData({
  agId,
  timeoutMs = DEFAULT_TIMEOUTS.LOAD_DATA,
}: UseConvocationDataOptions): UseConvocationDataReturn {
  const { currentCoproId } = useCopro();
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
  const loadData = useCallback(async () => {
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

    // Charger les données
    try {
      const degradedMode = {
        agDataFailed: false,
        resolutionsFailed: false,
        coproprietairesFailed: false,
      };

      let agData: AGData | null = null;
      let resolutions: Resolution[] = [];
      let coproprietaires: CoproprietaireEditable[] = [];
      let sendingChoices: SendingChoice[] = [];

      // Déterminer si c'est un UUID Supabase ou un ID legacy
      const useSupabase = isValidUUID(agId);

      if (useSupabase) {
        // === CHARGEMENT SUPABASE ===

        // 1. Charger les données de l'AG depuis ag_meetings
        try {
          const supabase = createUntypedClient();
          const { data: meeting, error: meetingError } = await supabase
            .from('ag_meetings')
            .select('*')
            .eq('id', agId)
            .single();

          if (meetingError || !meeting) {
            logger.warn('AG non trouvée dans Supabase', {
              agId,
              step: 'convocation',
              action: 'loadAgData',
              error: meetingError?.message,
            });
            degradedMode.agDataFailed = true;
          } else {
            const m = meeting as AgMeeting;

            // Charger les métadonnées depuis ag_session_drafts (session data)
            // ou depuis opening_notes (pour les brouillons créés via useAgDraftEdit)
            let sessionMetadata: DraftMetadata = {};
            try {
              const { data: sessionData } = await loadDraft<DraftMetadata>(agId, 'session', `ag-session-${agId}`);
              if (sessionData) {
                sessionMetadata = sessionData;
              } else {
                // Fallback to opening_notes if session draft not found
                sessionMetadata = deserializeMetadata(m.opening_notes);
              }
            } catch {
              // Fallback to opening_notes on error
              sessionMetadata = deserializeMetadata(m.opening_notes);
            }

            agData = {
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

        // 2. Charger les résolutions depuis la vue v_ag_resolutions_results (Supabase)
        try {
          const supabaseRes = createUntypedClient();
          const { data: dbResolutions, error: resError } = await supabaseRes
            .from('v_ag_resolutions_results')
            .select('*')
            .eq('ag_id', agId)
            .order('resolution_number', { ascending: true });

          if (resError) {
            throw resError;
          }

          if (dbResolutions && Array.isArray(dbResolutions)) {
            // Convertir les résolutions Supabase au format frontend
            resolutions = dbResolutions.map((dbRes: {
              id: string;
              title: string;
              description: string | null;
              majority_type: string;
              variables?: Record<string, unknown> | null;
            }) => ({
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
            // Fallback: essayer loadDraft si aucune résolution en Supabase
            const { data: savedResolutions } = await loadDraft<Resolution[]>(agId, 'resolutions', `ag-resolutions-${agId}`);
            if (savedResolutions && Array.isArray(savedResolutions)) {
              resolutions = savedResolutions;
            }
          }

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

        // 3. Charger les copropriétaires (mock pour l'instant)
        coproprietaires = MOCK_COPROPRIETAIRES;

        // 4. Charger les choix d'envoi depuis ag_session_drafts
        try {
          const { data: savedChoices } = await loadDraft<SendingChoice[]>(agId, 'session', `ag-sending-${agId}`);
          if (savedChoices && Array.isArray(savedChoices)) {
            sendingChoices = savedChoices;
          } else {
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

      } else {
        // === CHARGEMENT LEGACY (localStorage) ===

        // 1. Charger les données de l'AG
        try {
          agData = safeJsonParse<AGData | null>(`ag-draft-${agId}`, null);
          if (!agData) {
            logger.warn('Données AG non trouvées dans localStorage', {
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
        try {
          resolutions = safeJsonParse<Resolution[]>(`ag-resolutions-${agId}`, []);
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
        try {
          const savedChoices = localStorage.getItem(`ag-sending-${agId}`);
          if (savedChoices) {
            sendingChoices = JSON.parse(savedChoices);
          } else {
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

      logger.error('Erreur inattendue lors du chargement', {
        agId,
        step: 'convocation',
        action: 'loadData',
        error: err instanceof Error ? err.message : 'Unknown error',
      });

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: {
          code: CONVOCATION_ERROR_CODES.UNEXPECTED_ERROR,
          message: 'Erreur inattendue',
          details: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.',
        },
      }));
    }
  }, [agId, timeoutMs, currentCoproId]);

  // Charger au montage
  useEffect(() => {
    loadData();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadData]);

  // Fonctions de mise à jour
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
      setState((prev) => ({
        ...prev,
        sendingChoices: typeof value === 'function' ? value(prev.sendingChoices) : value,
      }));
    },
    []
  );

  const saveCoproprietaires = useCallback(
    async (copros: CoproprietaireEditable[]) => {
      if (isValidUUID(agId)) {
        await saveDraft(agId, 'session', copros, `ag-coproprietaires-${agId}`);
      } else {
        localStorage.setItem(`ag-coproprietaires-${agId}`, JSON.stringify(copros));
      }
    },
    [agId]
  );

  const saveSendingChoices = useCallback(
    async (choices: SendingChoice[]) => {
      if (isValidUUID(agId)) {
        await saveDraft(agId, 'session', choices, `ag-sending-${agId}`);
      } else {
        localStorage.setItem(`ag-sending-${agId}`, JSON.stringify(choices));
      }
    },
    [agId]
  );

  return {
    ...state,
    reload: loadData,
    setCoproprietaires,
    setSendingChoices,
    saveCoproprietaires,
    saveSendingChoices,
  };
}
