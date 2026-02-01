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
 * - Choix d'envoi via get_ag_envoi_choices / save_ag_envoi_choices
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
import { logger } from '@/lib/utils/logger';
import type { SendingMethod, SendingChoice } from '../types';

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

interface SentMilestoneValue {
  value: boolean;
  sentAt?: string;
}

interface EnvoiMilestones {
  sent?: SentMilestoneValue | boolean; // Peut être un objet {value, sentAt} ou un boolean legacy
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

  // Ref pour debounce de sauvegarde
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

      if (!milestonesError && milestones) {
        const m = milestones as EnvoiMilestones;
        // Gérer les deux formats: {sent: {value: true}} ou {sent: true}
        const sentValue = m.sent;
        if (sentValue === true || (typeof sentValue === 'object' && sentValue?.value === true)) {
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
      const { data: savedData, error: saveError } = await supabase
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

      // RE-FETCH: Hydrater l'UI depuis la DB (pas d'état optimiste)
      if (savedData && Array.isArray(savedData)) {
        // Reconstruire avec les IDs des copros actuels
        const savedMap = new Map<string, SendingMethod[]>();
        (savedData as SendingChoice[]).forEach(c => {
          savedMap.set(c.coproprietaireId, c.methods || []);
        });

        setSendingChoices(prev => prev.map(choice => ({
          ...choice,
          methods: savedMap.get(choice.coproprietaireId) || choice.methods
        })));
      }

      logger.debug('Choix envoi sauvegardés et re-fetchés', {
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

  // Sauvegarde debounced quand les choix changent
  useEffect(() => {
    // Ne pas sauvegarder pendant le chargement initial
    if (isInitialLoadRef.current || status !== 'ready' || sendingChoices.length === 0) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveChoicesToDB(sendingChoices);
    }, 800); // Debounce plus long pour éviter les saves multiples

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
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
  // ENVOI (MARQUER COMME ENVOYÉ)
  // ========================================

  const handleSend = useCallback(async () => {
    const hasEmptyChoices = sendingChoices.some(choice => choice.methods.length === 0);
    if (hasEmptyChoices) {
      alert('Veuillez sélectionner au moins une méthode d\'envoi pour chaque copropriétaire.');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createUntypedClient();

      // 1. Sauvegarder les choix finaux
      const choicesSaved = await saveChoicesToDB(sendingChoices);
      if (!choicesSaved) {
        throw new Error('Échec de la sauvegarde des choix');
      }

      // 2. Marquer comme envoyé via RPC milestone (merge sûr)
      const { data: newMilestones, error: milestoneError } = await supabase
        .rpc('save_ag_milestone', {
          p_ag_id: agId,
          p_milestone_key: 'sent',
          p_milestone_value: {
            value: true,
            sentAt: new Date().toISOString()
          }
        });

      if (milestoneError) {
        throw new Error(milestoneError.message);
      }

      // RE-FETCH: Vérifier que le milestone est bien en DB
      const { data: verifyMilestones } = await supabase
        .rpc('get_ag_milestones', { p_ag_id: agId });

      const verifyM = verifyMilestones as EnvoiMilestones | null;
      const verifyValue = verifyM?.sent;
      const isVerified = verifyValue === true || (typeof verifyValue === 'object' && verifyValue?.value === true);

      if (isVerified) {
        setIsSent(true);
        logger.info('Convocations marquées comme envoyées (vérifié en DB)', {
          agId,
          step: 'envoi',
          action: 'handleSend',
          milestones: newMilestones,
        });
        alert('Convocations envoyées avec succès !');
      } else {
        throw new Error('Le milestone n\'a pas été correctement sauvegardé');
      }

    } catch (err) {
      logger.error('Erreur lors de l\'envoi des convocations', {
        agId,
        step: 'envoi',
        action: 'handleSend',
        error: err instanceof Error ? err.message : 'Unknown',
      });
      alert('Erreur lors de l\'envoi. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }, [sendingChoices, agId, saveChoicesToDB]);

  // ========================================
  // NAVIGATION
  // ========================================

  const handleContinue = useCallback(() => {
    router.push(`/ag/${agId}/preparation`);
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
  };
}
