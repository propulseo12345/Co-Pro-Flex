/**
 * Hook pour charger les données de la page Convocation
 *
 * ÉTAPE 3 - 100% DB-driven
 *
 * Charge depuis Supabase:
 * - Données AG (étape 1) depuis ag_meetings + v_ag_overview
 * - Résolutions (étape 2) depuis v_ag_resolutions_results
 * - Copropriétaires depuis v_coproprietaires_overview
 * - Copropriété depuis copros
 *
 * Aucun fallback localStorage pour les données métier.
 * États: loading / ready / error / degraded
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { logger, CONVOCATION_ERROR_CODES } from '@/lib/utils/logger';
import { DEFAULT_TIMEOUTS } from '@/lib/utils/timeout';
import { AGFormat } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';
import type { AgMeeting } from '@/lib/ag/types';

// Helper: Create untyped client for tables not in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface AdressePostale {
  rue: string;
  codePostal: string;
  ville: string;
}

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

export interface Coproprietaire {
  id: string;
  nom: string;
  lot: string;
  email?: string;
  telephone?: string;
  adressePostale?: AdressePostale;
  tantiemes: number;
}

export interface CoproprietaireEditable extends Coproprietaire {
  isEditing?: boolean;
}

export interface CoproprieteInfo {
  id: string;
  nom: string;
  adresse: string;
  ville: string;
  codePostal: string;
}

export interface SyndicInfo {
  nom: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

export type SendingMethod = 'RECOMMANDE' | 'LETTRE_SIMPLE' | 'AVIS_ELECTRONIQUE' | 'EMAIL' | 'REMISE_MAIN_PROPRE';

export interface SendingChoice {
  coproprietaireId: string;
  methods: SendingMethod[];
}

// État du chargement
export type LoadingStatus = 'loading' | 'ready' | 'error' | 'degraded';

export interface ConvocationState {
  status: LoadingStatus;
  agData: AGData | null;
  resolutions: Resolution[];
  coproprietaires: CoproprietaireEditable[];
  copropriete: CoproprieteInfo | null;
  syndic: SyndicInfo | null;
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

// ============================================================================
// HELPERS
// ============================================================================

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
 * Désérialise les métadonnées depuis opening_notes ou session draft
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
  syndic?: SyndicInfo;
}

function deserializeMetadata(raw: string | null): DraftMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DraftMetadata;
  } catch {
    return {};
  }
}

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook principal pour le chargement des données de convocation
 * 100% DB-driven - Supabase seule source de vérité
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
    copropriete: null,
    syndic: null,
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
   * Charge toutes les données depuis Supabase
   */
  const loadData = useCallback(async () => {
    // Vérifier que l'agId est un UUID valide
    if (!agId || !isValidUUID(agId)) {
      logger.error('ID AG invalide ou non-UUID', {
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
          details: `L'identifiant "${agId}" n'est pas un UUID valide. Créez une AG via la page de planification.`,
        },
      }));
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

    try {
      const supabase = createUntypedClient();
      const degradedMode = {
        agDataFailed: false,
        resolutionsFailed: false,
        coproprietairesFailed: false,
      };

      let agData: AGData | null = null;
      let resolutions: Resolution[] = [];
      let coproprietaires: CoproprietaireEditable[] = [];
      let copropriete: CoproprieteInfo | null = null;
      let syndic: SyndicInfo | null = null;
      let sendingChoices: SendingChoice[] = [];
      let coproId: string | null = null;

      // ========================================
      // 1. Charger les données de l'AG depuis ag_meetings
      // ========================================
      try {
        const { data: meeting, error: meetingError } = await supabase
          .from('ag_meetings')
          .select('*')
          .eq('id', agId)
          .single();

        if (meetingError || !meeting) {
          logger.error('AG non trouvée dans Supabase', {
            agId,
            step: 'convocation',
            action: 'loadAgData',
            error: meetingError?.message,
          });
          // Erreur critique - on ne peut pas continuer sans l'AG
          throw new Error(`AG non trouvée: ${meetingError?.message || 'ID inconnu'}`);
        }

        const m = meeting as AgMeeting;
        coproId = m.copro_id;

        // Charger les métadonnées depuis ag_session_drafts
        let sessionMetadata: DraftMetadata = {};
        try {
          const { data: sessionData } = await loadDraft<DraftMetadata>(agId, 'session', `ag-session-${agId}`);
          if (sessionData) {
            sessionMetadata = sessionData;
          } else {
            // Fallback: opening_notes pour compatibilité
            sessionMetadata = deserializeMetadata(m.opening_notes);
          }
        } catch {
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

        // Récupérer le syndic depuis les métadonnées si disponible
        if (sessionMetadata.syndic) {
          syndic = sessionMetadata.syndic;
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

      // Si on n'a pas de copro_id, on ne peut pas continuer
      if (!coproId) {
        throw new Error('Impossible de déterminer la copropriété liée à cette AG');
      }

      // ========================================
      // 2. Charger les résolutions depuis v_ag_resolutions_results
      // ========================================
      try {
        const { data: dbResolutions, error: resError } = await supabase
          .from('v_ag_resolutions_results')
          .select('*')
          .eq('ag_id', agId)
          .order('resolution_number', { ascending: true });

        if (resError) {
          throw resError;
        }

        if (dbResolutions && Array.isArray(dbResolutions)) {
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
          logger.debug('Aucune résolution trouvée en DB pour cette AG', {
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

      // ========================================
      // 3. Charger les copropriétaires depuis v_coproprietaires_overview
      // ========================================
      try {
        const { data: dbOwners, error: ownersError } = await supabase
          .from('v_coproprietaires_overview')
          .select('*')
          .eq('copro_id', coproId)
          .eq('owner_type', 'COPROPRIETAIRE')
          .order('display_name', { ascending: true });

        if (ownersError) {
          throw ownersError;
        }

        if (dbOwners && Array.isArray(dbOwners)) {
          coproprietaires = dbOwners.map((owner: {
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
          }) => {
            // Construire l'adresse postale si disponible
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
      } catch (err) {
        logger.convocationError(
          agId,
          'loadCoproprietaires',
          CONVOCATION_ERROR_CODES.LOAD_COPROPRIETAIRES_FAILED,
          err instanceof Error ? err : undefined
        );
        degradedMode.coproprietairesFailed = true;
      }

      // ========================================
      // 4. Charger les infos de la copropriété depuis copros
      // ========================================
      try {
        const { data: coproData, error: coproError } = await supabase
          .from('copros')
          .select('id, name, address, city, postal_code')
          .eq('id', coproId)
          .single();

        if (coproError) {
          throw coproError;
        }

        if (coproData) {
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
        // Non bloquant - on continue avec les valeurs par défaut
      }

      // ========================================
      // 5. Charger les choix d'envoi depuis ag_session_drafts
      // ========================================
      try {
        const { data: savedChoices } = await loadDraft<SendingChoice[]>(agId, 'session', `ag-sending-${agId}`);
        if (savedChoices && Array.isArray(savedChoices)) {
          sendingChoices = savedChoices;
        } else {
          // Initialiser les choix d'envoi vides pour chaque copropriétaire
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
      const hasDegradedData = degradedMode.resolutionsFailed || degradedMode.coproprietairesFailed;

      if (hasCriticalError) {
        setState({
          status: 'error',
          agData: null,
          resolutions: [],
          coproprietaires,
          copropriete,
          syndic,
          sendingChoices,
          error: {
            code: CONVOCATION_ERROR_CODES.AG_NOT_FOUND,
            message: 'Assemblée générale non trouvée',
            details: `Aucune AG avec l'identifiant "${agId}" n'a été trouvée dans Supabase. Créez d'abord une AG ou vérifiez l'URL.`,
          },
          degradedMode,
        });
      } else if (hasDegradedData) {
        setState({
          status: 'degraded',
          agData,
          resolutions,
          coproprietaires,
          copropriete,
          syndic,
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
          agData,
          resolutions,
          coproprietaires,
          copropriete,
          syndic,
          sendingChoices,
          error: null,
          degradedMode,
        });
        logger.debug('Chargement données convocation réussi', {
          agId,
          step: 'convocation',
          action: 'loadData',
          resolutionsCount: resolutions.length,
          coproprietairesCount: coproprietaires.length,
        });
      }
    } catch (err) {
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      logger.error('Erreur lors du chargement depuis Supabase', {
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
          message: 'Erreur de chargement',
          details: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.',
        },
      }));
    }
  }, [agId, timeoutMs]);

  // Charger au montage
  useEffect(() => {
    loadData();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [loadData]);

  // ========================================
  // SETTERS ET PERSISTANCE
  // ========================================

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

  /**
   * Sauvegarde les copropriétaires modifiés
   * Note: Pour l'instant, on ne modifie pas les copropriétaires directement
   * car ils viennent de la DB. Cette fonction est gardée pour compatibilité.
   */
  const saveCoproprietaires = useCallback(
    async (copros: CoproprietaireEditable[]) => {
      // Les modifications de copropriétaires devraient passer par updateCoproprietaire
      // Pour l'instant on sauvegarde dans un draft temporaire
      if (isValidUUID(agId)) {
        await saveDraft(agId, 'session', copros, `ag-coproprietaires-temp-${agId}`);
      }
    },
    [agId]
  );

  /**
   * Sauvegarde les choix d'envoi dans ag_session_drafts
   */
  const saveSendingChoices = useCallback(
    async (choices: SendingChoice[]) => {
      if (isValidUUID(agId)) {
        await saveDraft(agId, 'session', choices, `ag-sending-${agId}`);
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
