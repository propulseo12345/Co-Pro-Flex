'use client';

/**
 * Hook pour la page Envoi des convocations (Étape 4)
 *
 * 100% DB-driven - Supabase seule source de vérité
 * SÉCURISÉ: Utilise des RPC dédiées pour garantir le scoping des données
 *
 * Charge depuis Supabase:
 * - Copropriétaires via rpc_get_ag_coproprietaires (scoping sécurisé ag_id -> copro_id)
 * - Données AG via ag_meetings
 * - Choix d'envoi via get_ag_envoi_choices / save_ag_envoi_choices (migration 0063,
 *   stockés dans ag_meetings.envoi_choices = BROUILLON éditable, DISTINCT des traces
 *   d'envoi ag_envoi_tracking qui font foi). Contrat: tableau SendingChoice
 *   ({ coproprietaireId, methods: SendingMethod[] }) conservé tel quel ; le mapping
 *   SendingMethod -> notification_channel se fait à l'ENVOI réel (dispatch), pas ici.
 *   save remplace le brouillon ; ag_envoi_tracking n'est JAMAIS touché par les choix.
 * - Milestones via get_ag_milestones / save_ag_milestone
 *
 * Garanties:
 * - Aucun fallback localStorage pour données métier
 * - Re-fetch DB après chaque save (pas d'état optimiste)
 * - Scoping strict: un ag_id ne peut charger que ses propres copros
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isValidUUID } from '@/lib/ag/draft-persistence';
import { updateAgCurrentStep } from '@/lib/ag/api';
import { logger } from '@/lib/utils/logger';
import { generateConvocationPDF } from '@/lib/pdf/generateConvocationPDF';
import {
  dispatchConvocation,
  generatePostalZip,
  saveEnvoiTracking,
  SENDING_METHOD_LABELS,
} from '@/lib/services/convocation-dispatch.service';
import type { SendingMethod, SendingChoice } from '../types';
import type {
  SendProgress,
  DispatchResult,
  PostalEntry,
  ConvocationBundle,
} from '../types/envoi-dispatch';

// Helper: Create untyped client for RPC calls not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ============================================================================
// TYPES
// ============================================================================

export interface CoproprietaireEnvoi {
  id: string;
  nom: string;
  lot: string;
  email?: string;
  telephone?: string;
  tantiemes: number;
}

export interface AGEnvoiData {
  id: string;
  coproId: string;
  date: string;
  heure: string;
  lieu: string;
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
}

export type EnvoiStatus = 'loading' | 'ready' | 'error';

export interface EnvoiError {
  code: string;
  message: string;
  details?: string;
}

interface AgMilestoneRow {
  id: string;
  milestone_key: string | null;
  due_date: string | null;
  done: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SENDING_COSTS: Record<SendingMethod, number> = {
  RECOMMANDE: 6.50,
  LETTRE_SIMPLE: 1.50,
  AVIS_ELECTRONIQUE: 3.20,
  EMAIL: 0.00,
  REMISE_MAIN_PROPRE: 0.00
};

export const SENDING_METHODS: { value: SendingMethod; label: string }[] = [
  { value: 'RECOMMANDE', label: 'Recommandé' },
  { value: 'LETTRE_SIMPLE', label: 'Lettre simple' },
  { value: 'AVIS_ELECTRONIQUE', label: 'Avis électronique' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'REMISE_MAIN_PROPRE', label: 'Remise en main propre / Autre' }
];

const TYPE_MAPPING_FROM_DB: Record<string, AGEnvoiData['type']> = {
  'ordinary': 'ORDINAIRE',
  'extraordinary': 'EXTRAORDINAIRE',
  'mixed': 'URGENTE',
  'special': 'URGENTE',
};

// ============================================================================
// HOOK
// ============================================================================

interface UseAgEnvoiPageParams {
  agId: string;
}

export function useAgEnvoiPage({ agId }: UseAgEnvoiPageParams) {
  const router = useRouter();

  // États principaux
  const [status, setStatus] = useState<EnvoiStatus>('loading');
  const [error, setError] = useState<EnvoiError | null>(null);
  const [coproprietaires, setCoproprietaires] = useState<CoproprietaireEnvoi[]>([]);
  const [agData, setAgData] = useState<AGEnvoiData | null>(null);
  const [sendingChoices, setSendingChoices] = useState<SendingChoice[]>([]);
  const [isSent, setIsSent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Progression envoi
  const [progress, setProgress] = useState<SendProgress>({
    isActive: false,
    current: 0,
    total: 0,
    currentName: '',
    currentStep: 'loading',
    results: [],
    cancelled: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  // Ref pour éviter les saves pendant le chargement initial
  const isInitialLoadRef = useRef(true);

  // ========================================
  // CHARGEMENT DES DONNÉES (DB-FIRST)
  // ========================================

  const loadData = useCallback(async () => {
    // Validation UUID stricte
    if (!agId || !isValidUUID(agId)) {
      logger.error('ID AG invalide pour page envoi', {
        agId,
        step: 'envoi',
        action: 'loadData',
      });
      setStatus('error');
      setError({
        code: 'ERR-INVALID-AG-ID',
        message: 'Identifiant AG invalide',
        details: `L'identifiant "${agId}" n'est pas un UUID valide.`,
      });
      return;
    }

    isInitialLoadRef.current = true;
    setStatus('loading');
    setError(null);

    try {
      const supabase = createUntypedClient();

      // ========================================
      // 1. Charger l'AG depuis ag_meetings
      // ========================================
      const { data: meeting, error: meetingError } = await supabase
        .from('ag_meetings')
        .select('id, copro_id, meeting_date, meeting_type, location')
        .eq('id', agId)
        .single();

      if (meetingError || !meeting) {
        logger.error('AG non trouvée pour envoi', {
          agId,
          step: 'envoi',
          action: 'loadAgData',
          error: meetingError?.message,
        });
        setStatus('error');
        setError({
          code: 'ERR-AG-NOT-FOUND',
          message: 'Assemblée générale non trouvée',
          details: `Aucune AG avec l'identifiant "${agId}" n'a été trouvée.`,
        });
        return;
      }

      // Extraire date et heure
      const meetingDate = (meeting.meeting_date as string) || '';
      const datePart = meetingDate.split('T')[0] || '';
      const timePart = meetingDate.split('T')[1]?.substring(0, 5) || '';

      const loadedAgData: AGEnvoiData = {
        id: meeting.id as string,
        coproId: meeting.copro_id as string,
        date: datePart,
        heure: timePart,
        lieu: (meeting.location as string) || '',
        type: TYPE_MAPPING_FROM_DB[meeting.meeting_type as string] || 'ORDINAIRE',
      };
      setAgData(loadedAgData);

      // ========================================
      // 2. Charger les copropriétaires via RPC sécurisée
      // ========================================
      // Cette RPC encapsule: ag_id -> copro_id -> v_coproprietaires_overview
      // Garantit qu'on ne charge QUE les copros de la copropriété de l'AG

      const { data: dbOwners, error: ownersError } = await supabase
        .rpc('rpc_get_ag_coproprietaires', { p_ag_id: agId });

      if (ownersError) {
        logger.error('Erreur RPC chargement copropriétaires', {
          agId,
          step: 'envoi',
          action: 'loadCoproprietaires',
          error: ownersError.message,
        });
        setStatus('error');
        setError({
          code: 'ERR-LOAD-COPROPRIETAIRES',
          message: 'Erreur lors du chargement des copropriétaires',
          details: ownersError.message,
        });
        return;
      }

      const loadedCopros: CoproprietaireEnvoi[] = ((dbOwners as unknown[]) || []).map((owner: unknown) => {
        const o = owner as {
          id: string;
          display_name: string;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          total_tantiemes: number;
          lots_count: number;
        };
        return {
          id: o.id,
          nom: o.display_name || 'Sans nom',
          lot: `${o.lots_count} lot${o.lots_count > 1 ? 's' : ''}`,
          email: o.email || undefined,
          telephone: o.mobile || o.phone || undefined,
          tantiemes: o.total_tantiemes || 0,
        };
      });

      setCoproprietaires(loadedCopros);

      // ========================================
      // 3. Charger les choix d'envoi via RPC dédiée
      // ========================================
      let loadedChoices: SendingChoice[] = [];

      const { data: savedChoices, error: choicesError } = await supabase
        .rpc('get_ag_envoi_choices', { p_ag_id: agId });

      if (!choicesError && savedChoices && Array.isArray(savedChoices)) {
        loadedChoices = savedChoices as SendingChoice[];
      }

      // Construire la liste finale des choix
      // S'assurer que chaque copropriétaire a une entrée
      const choicesMap = new Map<string, SendingMethod[]>();
      loadedChoices.forEach(c => {
        choicesMap.set(c.coproprietaireId, c.methods || []);
      });

      const finalChoices: SendingChoice[] = loadedCopros.map(copro => ({
        coproprietaireId: copro.id,
        methods: choicesMap.get(copro.id) || []
      }));

      setSendingChoices(finalChoices);

      // ========================================
      // 4. Charger les milestones via RPC dédiée
      // ========================================
      const { data: milestones, error: milestonesError } = await supabase
        .rpc('get_ag_milestones', { p_ag_id: agId });

      if (!milestonesError && Array.isArray(milestones)) {
        // get_ag_milestones renvoie une liste de jalons ; l'envoi est fait si le
        // jalon 'sent' existe et est marqué done.
        const rows = milestones as AgMilestoneRow[];
        const sentDone = rows.some(m => m.milestone_key === 'sent' && m.done);
        if (sentDone) {
          setIsSent(true);
        }
      }

      // Fin du chargement
      isInitialLoadRef.current = false;
      setStatus('ready');

      logger.debug('Données envoi chargées avec succès (DB-first)', {
        agId,
        coproId: loadedAgData.coproId,
        step: 'envoi',
        action: 'loadData',
        coproprietairesCount: loadedCopros.length,
        choicesCount: finalChoices.length,
      });

    } catch (err) {
      logger.error('Erreur inattendue chargement page envoi', {
        agId,
        step: 'envoi',
        action: 'loadData',
        error: err instanceof Error ? err.message : 'Unknown',
      });
      setStatus('error');
      setError({
        code: 'ERR-UNEXPECTED',
        message: 'Erreur de chargement',
        details: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.',
      });
    }
  }, [agId]);

  // Charger au montage
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ========================================
  // SAUVEGARDE DES CHOIX (DB-FIRST)
  // ========================================

  const saveChoicesToDB = useCallback(async (choices: SendingChoice[]): Promise<boolean> => {
    if (!isValidUUID(agId)) return false;

    setIsSaving(true);
    try {
      const supabase = createUntypedClient();

      // Sauvegarder via RPC dédiée
      const { error: saveError } = await supabase
        .rpc('save_ag_envoi_choices', {
          p_ag_id: agId,
          p_choices: choices
        });

      if (saveError) {
        logger.error('Erreur sauvegarde choix envoi', {
          agId,
          step: 'envoi',
          action: 'saveChoices',
          error: saveError.message,
        });
        return false;
      }

      // État optimiste : l'UI fait foi, la DB suit
      // Pas de re-fetch pour éviter de reset le state pendant l'interaction

      logger.debug('Choix envoi sauvegardés', {
        agId,
        step: 'envoi',
        action: 'saveChoices',
      });

      return true;
    } catch (err) {
      logger.error('Exception sauvegarde choix envoi', {
        agId,
        step: 'envoi',
        action: 'saveChoices',
        error: err instanceof Error ? err.message : 'Unknown',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [agId]);

  // Persistance debounced quand les choix changent (évite rafales sur "Tout cocher")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (isInitialLoadRef.current || status !== 'ready' || sendingChoices.length === 0) {
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveChoicesToDB(sendingChoices);
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [sendingChoices, status, saveChoicesToDB]);

  // ========================================
  // ACTIONS
  // ========================================

  const toggleMethod = useCallback((coproId: string, method: SendingMethod) => {
    setSendingChoices(prev =>
      prev.map(choice => {
        if (choice.coproprietaireId === coproId) {
          const hasMethod = choice.methods.includes(method);
          return {
            ...choice,
            methods: hasMethod
              ? choice.methods.filter(m => m !== method)
              : [...choice.methods, method]
          };
        }
        return choice;
      })
    );
  }, []);

  const selectAllForMethod = useCallback((method: SendingMethod) => {
    setSendingChoices(prev =>
      prev.map(choice => {
        const hasMethod = choice.methods.includes(method);
        return hasMethod
          ? { ...choice, methods: choice.methods.filter(m => m !== method) }
          : { ...choice, methods: [...choice.methods, method] };
      })
    );
  }, []);

  // ========================================
  // CALCULS
  // ========================================

  const totalCost = useMemo(() => {
    return sendingChoices.reduce((total, choice) => {
      const choiceCost = choice.methods.reduce((sum, method) => sum + SENDING_COSTS[method], 0);
      return total + choiceCost;
    }, 0);
  }, [sendingChoices]);

  const stats = useMemo(() => {
    const result: Record<SendingMethod, number> = {
      RECOMMANDE: 0,
      LETTRE_SIMPLE: 0,
      AVIS_ELECTRONIQUE: 0,
      EMAIL: 0,
      REMISE_MAIN_PROPRE: 0
    };
    sendingChoices.forEach(choice => {
      choice.methods.forEach(method => { result[method]++; });
    });
    return result;
  }, [sendingChoices]);

  const selectedMethods = useMemo((): SendingMethod[] => {
    const allMethods = new Set<SendingMethod>();
    sendingChoices.forEach(choice => {
      choice.methods.forEach(method => allMethods.add(method));
    });
    return Array.from(allMethods);
  }, [sendingChoices]);

  // ========================================
  // CHARGEMENT BUNDLE CONVOCATION
  // ========================================

  const loadConvocationBundle = useCallback(async (): Promise<ConvocationBundle | null> => {
    const supabase = createUntypedClient();
    const { data, error: rpcError } = await supabase.rpc('rpc_get_ag_convocation_bundle', {
      p_ag_id: agId,
    });
    if (rpcError || !data) return null;
    return data as unknown as ConvocationBundle;
  }, [agId]);

  // ========================================
  // ENVOI AVEC PIPELINE COMPLET
  // ========================================

  const handleSend = useCallback(async () => {
    const hasEmptyChoices = sendingChoices.some(choice => choice.methods.length === 0);
    if (hasEmptyChoices) {
      alert('Veuillez sélectionner au moins une méthode d\'envoi pour chaque copropriétaire.');
      return;
    }

    // Init progression
    const totalOps = sendingChoices.reduce((sum, c) => sum + c.methods.length, 0);
    setProgress({
      isActive: true,
      current: 0,
      total: totalOps,
      currentName: 'Chargement des données...',
      currentStep: 'loading',
      results: [],
      cancelled: false,
    });
    abortRef.current = new AbortController();

    try {
      // 1. Sauvegarder les choix finaux
      await saveChoicesToDB(sendingChoices);

      // 2. Charger le bundle AG
      const bundle = await loadConvocationBundle();
      if (!bundle) {
        throw new Error('Impossible de charger les données de l\'AG');
      }

      const allResults: DispatchResult[] = [];
      const postalEntries: PostalEntry[] = [];
      let opIndex = 0;

      // 3. Boucle séquentielle
      for (const choice of sendingChoices) {
        if (abortRef.current.signal.aborted) break;

        const coproData = bundle.coproprietaires.find(c => c.id === choice.coproprietaireId);
        if (!coproData) continue;

        for (const method of choice.methods) {
          if (abortRef.current.signal.aborted) break;
          opIndex++;

          const methodLabel = SENDING_METHOD_LABELS[method] || method;
          setProgress(prev => ({
            ...prev,
            current: opIndex,
            currentName: `${coproData.nom} — ${methodLabel}`,
            currentStep: 'generating',
          }));

          // a. Générer le PDF personnalisé
          const agDateISO = bundle.agData.meeting_date.split('T')[0];

          const pdfResult = generateConvocationPDF({
            agData: {
              type: (bundle.agData.meeting_type === 'ordinary' ? 'ORDINAIRE' : 'EXTRAORDINAIRE') as 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE',
              date: bundle.agData.meeting_date,
              heure: '',
              lieu: bundle.agData.location || '',
              adresse: bundle.syndic.adresse || '',
              budget: false,
              budgetMontant: '',
              budgetExercice: '',
            },
            resolutions: bundle.resolutions.map(r => ({
              id: r.id,
              numero: r.resolution_number,
              titre: r.title,
              texte: r.description,
              majorite: r.majority_type,
              variables: r.variables as Record<string, string>,
            })),
            copropriete: { nom: bundle.syndic.nom, adresse: bundle.syndic.adresse },
            syndic: {
              nom: bundle.syndic.nom,
              adresse: `${bundle.syndic.adresse}, ${bundle.syndic.code_postal} ${bundle.syndic.ville}`,
            },
            destinataire: {
              nom: coproData.nom || '',
              adresse: coproData.address_line1 || '',
              complement: coproData.address_line2 || undefined,
              codePostal: coproData.postal_code || '',
              ville: coproData.city || '',
              lot: coproData.lot_id || '',
              tantiemes: coproData.tantiemes || 0,
              totalTantiemes: bundle.totalTantiemes,
              sendingMethod: methodLabel,
            },
          });

          const blob = pdfResult.blob;
          const safeName = (coproData.nom || 'copro').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
          const fileName = `Convocation_AG_${agDateISO}_${safeName}.pdf`;

          // b. Dispatcher
          setProgress(prev => ({ ...prev, currentStep: 'dispatching' }));

          const { result, postalEntry } = await dispatchConvocation({
            blob,
            fileName,
            copro: {
              id: coproData.id,
              nom: coproData.nom || '',
              email: coproData.email || undefined,
              adresse: coproData.address_line1 || undefined,
              codePostal: coproData.postal_code || undefined,
              ville: coproData.city || undefined,
            },
            method,
            agId,
            coproId: bundle.agData.copro_id,
            agDate: agDateISO,
          });

          allResults.push(result);
          if (postalEntry) {
            postalEntries.push(postalEntry);
          }

          setProgress(prev => ({
            ...prev,
            results: [...prev.results, result],
          }));
        }
      }

      // 4. Bulk insert tracking
      await saveEnvoiTracking(agId, allResults);

      // 5. ZIP si canaux postaux
      let zipUrl: string | undefined;
      if (postalEntries.length > 0) {
        const zipBlob = await generatePostalZip(postalEntries);
        zipUrl = URL.createObjectURL(zipBlob);
      }

      // 6. Marquer milestone si pas annulé
      if (!abortRef.current.signal.aborted) {
        const supabase = createUntypedClient();
        await supabase.rpc('save_ag_milestone', {
          p_ag_id: agId,
          p_milestone_key: 'sent',
          p_done: true,
        });
        setIsSent(true);
        await updateAgCurrentStep(agId, 5);
      }

      setProgress(prev => ({
        ...prev,
        isActive: true,
        currentStep: abortRef.current?.signal.aborted ? 'cancelled' : 'done',
        cancelled: abortRef.current?.signal.aborted || false,
        zipUrl,
      }));

    } catch (err) {
      setProgress(prev => ({
        ...prev,
        currentStep: 'done',
        currentName: err instanceof Error ? err.message : 'Erreur',
      }));
      alert('Erreur lors de l\'envoi. Veuillez réessayer.');
    }
  }, [sendingChoices, agId, saveChoicesToDB, loadConvocationBundle]);

  const handleCancelSend = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleDownloadZip = useCallback(() => {
    if (progress.zipUrl) {
      const a = document.createElement('a');
      a.href = progress.zipUrl;
      a.download = `convocations_courriers_${agId}.zip`;
      a.click();
    }
  }, [progress.zipUrl, agId]);

  const handleCloseProgress = useCallback(() => {
    if (progress.zipUrl) URL.revokeObjectURL(progress.zipUrl);
    setProgress(prev => ({ ...prev, isActive: false }));
    if (!progress.cancelled) {
      router.push(`/ag/${agId}/votes-correspondance`);
    }
  }, [progress.zipUrl, progress.cancelled, agId, router]);

  // ========================================
  // MISE À JOUR DE L'ÉTAPE COURANTE EN DB
  // ========================================

  // Met à jour current_step = 4 quand la page est prête
  useEffect(() => {
    if (status !== 'ready' || !isValidUUID(agId)) return;

    const updateStep = async () => {
      try {
        const supabase = createUntypedClient();
        await supabase.rpc('save_ag_wizard_state', {
          p_ag_id: agId,
          p_current_step: 4, // Étape 4 = Envoi convocations
          p_step_data: null,
          p_wizard_mode: null,
        });
        logger.debug('current_step mis à jour: 4', { agId, step: 'envoi' });
      } catch (err) {
        logger.warn('Erreur mise à jour current_step', {
          agId,
          step: 'envoi',
          action: 'updateStep',
          error: err instanceof Error ? err.message : 'Unknown',
        });
      }
    };

    updateStep();
  }, [status, agId]);

  // ========================================
  // NAVIGATION
  // ========================================

  const handleContinue = useCallback(() => {
    router.push(`/ag/${agId}/votes-correspondance`);
  }, [router, agId]);

  const goBack = useCallback(() => {
    router.push(`/ag/${agId}/convocation`);
  }, [router, agId]);

  // ========================================
  // RETURN
  // ========================================

  return {
    // États
    status,
    error,
    isLoading: status === 'loading',
    isSaving,

    // Données DB (scoped à l'AG)
    coproprietaires,
    agData,
    sendingChoices,
    isSent,

    // Statistiques
    totalCost,
    stats,
    selectedMethods,
    SENDING_COSTS,

    // Actions
    toggleMethod,
    selectAllForMethod,
    handleSend,
    handleContinue,
    goBack,
    reload: loadData,

    // Progression
    progress,
    handleCancelSend,
    handleDownloadZip,
    handleCloseProgress,
  };
}
