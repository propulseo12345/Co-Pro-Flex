/**
 * Hook pour la gestion de la configuration d'envoi des convocations
 *
 * ÉTAPE 3 - 100% DB-driven
 *
 * Persiste la configuration dans ag_session_drafts (Supabase)
 * au lieu de localStorage.
 *
 * Gère:
 * - Mode d'envoi global (email, courrier, les deux, par copropriétaire)
 * - Overrides par copropriétaire
 * - Tracking email (via ag_notifications à terme)
 * - Paramètres courrier (LRAR)
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { DeliveryMode, EmailSendStatus, PostalSendType, ARStatus } from '@/types/enums';
import { modeRequiresEmail, modeRequiresAddress } from '@/lib/constants/delivery';
import { logger } from '@/lib/utils/logger';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';

// Types
export interface CoproprietaireDelivery {
  id: string;
  nom: string;
  lot: string;
  email?: string;
  adressePostale?: {
    rue: string;
    codePostal: string;
    ville: string;
  };
  tantiemes: number;
  preferredDeliveryMode?: DeliveryMode;
}

export interface EmailTracking {
  status: EmailSendStatus;
  sentAt?: string;
  error?: string;
}

export interface PostalTracking {
  sendType: PostalSendType;
  sentAt?: string;
  arTrackingId?: string;
  arStatus?: ARStatus;
}

export interface DeliveryConfigState {
  globalMode: DeliveryMode | 'PAR_COPROPRIETAIRE';
  overridesEnabled: boolean;
  deliveryByOwner: Record<string, DeliveryMode>;
  emailTracking: Record<string, EmailTracking>;
  postalTracking: Record<string, PostalTracking>;
  postalSettings: {
    isRegistered: boolean;
    sendType: PostalSendType;
  };
}

export interface OwnerDeliveryStatus {
  id: string;
  nom: string;
  lot: string;
  email?: string;
  hasEmail: boolean;
  adressePostale?: CoproprietaireDelivery['adressePostale'];
  hasAddress: boolean;
  tantiemes: number;
  effectiveMode: DeliveryMode;
  isOverridden: boolean;
  eligibility: 'OK' | 'BLOQUANT';
  eligibilityReason?: string;
  emailStatus?: EmailTracking;
  postalStatus?: PostalTracking;
}

export interface DeliveryStats {
  totalOwners: number;
  byEmail: number;
  byCourrier: number;
  byBoth: number;
  eligible: number;
  blocked: number;
  emailsSent: number;
  emailsFailed: number;
  estimatedPostalCost: number;
}

interface UseDeliveryConfigOptions {
  agId: string;
  coproprietaires: CoproprietaireDelivery[];
}

interface UseDeliveryConfigReturn {
  config: DeliveryConfigState;
  ownerStatuses: OwnerDeliveryStatus[];
  stats: DeliveryStats;
  canValidate: boolean;
  validationErrors: string[];
  isLoading: boolean;
  setGlobalMode: (mode: DeliveryMode | 'PAR_COPROPRIETAIRE') => void;
  setOwnerMode: (ownerId: string, mode: DeliveryMode) => void;
  setPostalRegistered: (isRegistered: boolean) => void;
  sendEmail: (ownerId: string) => void;
  sendAllEmails: () => void;
  saveAsPreferences: () => void;
  resetToPreferences: () => void;
  getOwnersForPostal: () => OwnerDeliveryStatus[];
  getOwnersForEmail: () => OwnerDeliveryStatus[];
}

const DRAFT_KEY_CONFIG = 'ag-delivery-config';
const DRAFT_KEY_PREFERENCES = 'copro-delivery-preferences';

/**
 * Crée la configuration initiale
 */
function createInitialConfig(coproprietaires: CoproprietaireDelivery[]): DeliveryConfigState {
  const deliveryByOwner: Record<string, DeliveryMode> = {};
  coproprietaires.forEach((c) => {
    deliveryByOwner[c.id] = c.preferredDeliveryMode || DeliveryMode.EMAIL;
  });

  return {
    globalMode: DeliveryMode.EMAIL,
    overridesEnabled: false,
    deliveryByOwner,
    emailTracking: Object.fromEntries(
      coproprietaires.map((c) => [c.id, { status: EmailSendStatus.A_ENVOYER }])
    ),
    postalTracking: {},
    postalSettings: {
      isRegistered: false,
      sendType: PostalSendType.LETTRE_SIMPLE,
    },
  };
}

export function useDeliveryConfig({
  agId,
  coproprietaires,
}: UseDeliveryConfigOptions): UseDeliveryConfigReturn {
  const [config, setConfig] = useState<DeliveryConfigState>(() =>
    createInitialConfig(coproprietaires)
  );
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ========================================
  // Chargement initial depuis Supabase
  // ========================================
  useEffect(() => {
    if (!isValidUUID(agId) || initialLoadDone.current) {
      setIsLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        // Charger la config depuis ag_session_drafts
        const { data: savedConfig } = await loadDraft<DeliveryConfigState>(
          agId,
          'session',
          `${DRAFT_KEY_CONFIG}-${agId}`
        );

        if (savedConfig) {
          // Merger avec les nouveaux copropriétaires (si ajoutés depuis)
          const mergedDeliveryByOwner = { ...savedConfig.deliveryByOwner };
          const mergedEmailTracking = { ...savedConfig.emailTracking };

          coproprietaires.forEach((c) => {
            if (!mergedDeliveryByOwner[c.id]) {
              mergedDeliveryByOwner[c.id] = c.preferredDeliveryMode || DeliveryMode.EMAIL;
            }
            if (!mergedEmailTracking[c.id]) {
              mergedEmailTracking[c.id] = { status: EmailSendStatus.A_ENVOYER };
            }
          });

          // S'assurer que postalSettings existe (compatibilité avec anciens formats)
          const postalSettings = savedConfig.postalSettings || {
            isRegistered: false,
            sendType: PostalSendType.LETTRE_SIMPLE,
          };

          setConfig({
            ...savedConfig,
            deliveryByOwner: mergedDeliveryByOwner,
            emailTracking: mergedEmailTracking,
            postalSettings,
            postalTracking: savedConfig.postalTracking || {},
          });
        } else {
          // Pas de config sauvegardée, charger les préférences générales
          const { data: preferences } = await loadDraft<Record<string, DeliveryMode>>(
            agId,
            'session',
            DRAFT_KEY_PREFERENCES
          );

          if (preferences) {
            const deliveryByOwner: Record<string, DeliveryMode> = {};
            coproprietaires.forEach((c) => {
              deliveryByOwner[c.id] = preferences[c.id] || c.preferredDeliveryMode || DeliveryMode.EMAIL;
            });
            setConfig((prev) => ({ ...prev, deliveryByOwner }));
          }
        }
      } catch (err) {
        logger.warn('Erreur chargement config delivery', {
          agId,
          step: 'delivery',
          action: 'loadConfig',
          error: err instanceof Error ? err.message : 'Unknown',
        });
      } finally {
        initialLoadDone.current = true;
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [agId, coproprietaires]);

  // ========================================
  // Sauvegarde automatique (debounced)
  // ========================================
  useEffect(() => {
    if (!isValidUUID(agId) || !initialLoadDone.current) return;

    // Debounce la sauvegarde
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveDraft(agId, 'session', config, `${DRAFT_KEY_CONFIG}-${agId}`);
        logger.debug('Config delivery sauvegardée', {
          agId,
          step: 'delivery',
          action: 'saveConfig',
        });
      } catch (err) {
        logger.error('Erreur sauvegarde config delivery', {
          agId,
          step: 'delivery',
          action: 'saveConfig',
          errorCode: 'ERR-DELIVERY-001',
          error: err instanceof Error ? err.message : 'Unknown',
        });
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [agId, config]);

  // ========================================
  // Calcul du mode effectif pour chaque copropriétaire
  // ========================================
  const ownerStatuses = useMemo<OwnerDeliveryStatus[]>(() => {
    return coproprietaires.map((copro) => {
      const effectiveMode =
        config.globalMode === 'PAR_COPROPRIETAIRE'
          ? config.deliveryByOwner[copro.id] || DeliveryMode.EMAIL
          : config.globalMode;

      const hasEmail = Boolean(copro.email && copro.email.trim());
      const hasAddress = Boolean(
        copro.adressePostale?.rue &&
          copro.adressePostale?.codePostal &&
          copro.adressePostale?.ville
      );

      const needsEmail = modeRequiresEmail(effectiveMode);
      const needsAddress = modeRequiresAddress(effectiveMode);

      let eligibility: 'OK' | 'BLOQUANT' = 'OK';
      let eligibilityReason: string | undefined;

      if (needsEmail && !hasEmail) {
        eligibility = 'BLOQUANT';
        eligibilityReason = 'Email manquant';
      } else if (needsAddress && !hasAddress) {
        eligibility = 'BLOQUANT';
        eligibilityReason = 'Adresse postale manquante';
      } else if (needsEmail && needsAddress && (!hasEmail || !hasAddress)) {
        eligibility = 'BLOQUANT';
        eligibilityReason = !hasEmail ? 'Email manquant' : 'Adresse postale manquante';
      }

      return {
        id: copro.id,
        nom: copro.nom,
        lot: copro.lot,
        email: copro.email,
        hasEmail,
        adressePostale: copro.adressePostale,
        hasAddress,
        tantiemes: copro.tantiemes,
        effectiveMode,
        isOverridden:
          config.globalMode === 'PAR_COPROPRIETAIRE' &&
          config.deliveryByOwner[copro.id] !== undefined,
        eligibility,
        eligibilityReason,
        emailStatus: config.emailTracking[copro.id],
        postalStatus: config.postalTracking[copro.id],
      };
    });
  }, [coproprietaires, config]);

  // ========================================
  // Statistiques
  // ========================================
  const stats = useMemo<DeliveryStats>(() => {
    // Protection défensive pour postalSettings
    const sendType = config.postalSettings?.sendType || PostalSendType.LETTRE_SIMPLE;
    const postalCost =
      sendType === PostalSendType.LRAR
        ? 6.5
        : sendType === PostalSendType.AR_EXTERNE
          ? 8.9
          : 1.49;

    let byEmail = 0;
    let byCourrier = 0;
    let byBoth = 0;
    let eligible = 0;
    let blocked = 0;
    let emailsSent = 0;
    let emailsFailed = 0;

    ownerStatuses.forEach((owner) => {
      if (owner.effectiveMode === DeliveryMode.EMAIL) byEmail++;
      else if (owner.effectiveMode === DeliveryMode.COURRIER) byCourrier++;
      else if (owner.effectiveMode === DeliveryMode.EMAIL_ET_COURRIER) byBoth++;

      if (owner.eligibility === 'OK') eligible++;
      else blocked++;

      if (owner.emailStatus?.status === EmailSendStatus.ENVOYE) emailsSent++;
      if (owner.emailStatus?.status === EmailSendStatus.ECHEC) emailsFailed++;
    });

    const postalRecipients = byCourrier + byBoth;

    return {
      totalOwners: coproprietaires.length,
      byEmail,
      byCourrier,
      byBoth,
      eligible,
      blocked,
      emailsSent,
      emailsFailed,
      estimatedPostalCost: postalRecipients * postalCost,
    };
  }, [ownerStatuses, coproprietaires.length, config.postalSettings?.sendType]);

  // ========================================
  // Validation
  // ========================================
  const { canValidate, validationErrors } = useMemo(() => {
    const errors: string[] = [];

    const blockedOwners = ownerStatuses.filter((o) => o.eligibility === 'BLOQUANT');
    if (blockedOwners.length > 0) {
      errors.push(`${blockedOwners.length} copropriétaire(s) avec données manquantes`);
    }

    return {
      canValidate: errors.length === 0,
      validationErrors: errors,
    };
  }, [ownerStatuses]);

  // ========================================
  // Actions
  // ========================================
  const setGlobalMode = useCallback((mode: DeliveryMode | 'PAR_COPROPRIETAIRE') => {
    setConfig((prev) => ({
      ...prev,
      globalMode: mode,
      overridesEnabled: mode === 'PAR_COPROPRIETAIRE',
    }));
  }, []);

  const setOwnerMode = useCallback((ownerId: string, mode: DeliveryMode) => {
    setConfig((prev) => ({
      ...prev,
      deliveryByOwner: {
        ...prev.deliveryByOwner,
        [ownerId]: mode,
      },
    }));
  }, []);

  const setPostalRegistered = useCallback((isRegistered: boolean) => {
    setConfig((prev) => ({
      ...prev,
      postalSettings: {
        ...prev.postalSettings,
        isRegistered,
        sendType: isRegistered ? PostalSendType.LRAR : PostalSendType.LETTRE_SIMPLE,
      },
    }));
  }, []);

  const sendEmail = useCallback((ownerId: string) => {
    const owner = ownerStatuses.find((o) => o.id === ownerId);
    if (!owner || !owner.hasEmail) return;

    // TODO: Intégrer avec ag_notifications pour le vrai envoi
    // Pour l'instant, simulation
    const success = Math.random() > 0.1; // 90% de succès

    setConfig((prev) => ({
      ...prev,
      emailTracking: {
        ...prev.emailTracking,
        [ownerId]: {
          status: success ? EmailSendStatus.ENVOYE : EmailSendStatus.ECHEC,
          sentAt: success ? new Date().toISOString() : undefined,
          error: success ? undefined : 'Erreur de connexion SMTP (simulation)',
        },
      },
    }));

    logger.info('Email envoyé (simulation)', {
      agId,
      step: 'delivery',
      action: 'sendEmail',
      ownerId,
      success,
    });
  }, [agId, ownerStatuses]);

  const sendAllEmails = useCallback(() => {
    const emailRecipients = ownerStatuses.filter(
      (o) =>
        (o.effectiveMode === DeliveryMode.EMAIL ||
          o.effectiveMode === DeliveryMode.EMAIL_ET_COURRIER) &&
        o.hasEmail &&
        o.emailStatus?.status !== EmailSendStatus.ENVOYE
    );

    const newTracking: Record<string, EmailTracking> = { ...config.emailTracking };

    emailRecipients.forEach((owner) => {
      // TODO: Intégrer avec ag_notifications
      const success = Math.random() > 0.05; // 95% de succès en masse
      newTracking[owner.id] = {
        status: success ? EmailSendStatus.ENVOYE : EmailSendStatus.ECHEC,
        sentAt: success ? new Date().toISOString() : undefined,
        error: success ? undefined : 'Adresse email invalide (simulation)',
      };
    });

    setConfig((prev) => ({
      ...prev,
      emailTracking: newTracking,
    }));

    logger.info('Envoi en masse emails (simulation)', {
      agId,
      step: 'delivery',
      action: 'sendAllEmails',
      count: emailRecipients.length,
    });
  }, [agId, ownerStatuses, config.emailTracking]);

  const saveAsPreferences = useCallback(async () => {
    if (!isValidUUID(agId)) return;

    try {
      const preferences: Record<string, DeliveryMode> = {};
      ownerStatuses.forEach((owner) => {
        preferences[owner.id] = owner.effectiveMode;
      });

      await saveDraft(agId, 'session', preferences, DRAFT_KEY_PREFERENCES);

      logger.info('Préférences delivery sauvegardées', {
        agId,
        step: 'delivery',
        action: 'savePreferences',
      });
    } catch (err) {
      logger.error('Erreur sauvegarde préférences', {
        agId,
        step: 'delivery',
        action: 'savePreferences',
        errorCode: 'ERR-DELIVERY-002',
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }, [agId, ownerStatuses]);

  const resetToPreferences = useCallback(async () => {
    if (!isValidUUID(agId)) return;

    try {
      const { data: preferences } = await loadDraft<Record<string, DeliveryMode>>(
        agId,
        'session',
        DRAFT_KEY_PREFERENCES
      );

      setConfig((prev) => {
        const deliveryByOwner: Record<string, DeliveryMode> = {};
        coproprietaires.forEach((c) => {
          deliveryByOwner[c.id] =
            (preferences && preferences[c.id]) || c.preferredDeliveryMode || DeliveryMode.EMAIL;
        });
        return {
          ...prev,
          deliveryByOwner,
        };
      });
    } catch (err) {
      logger.warn('Erreur restauration préférences', {
        agId,
        step: 'delivery',
        action: 'resetPreferences',
        error: err instanceof Error ? err.message : 'Unknown',
      });
    }
  }, [agId, coproprietaires]);

  const getOwnersForPostal = useCallback(() => {
    return ownerStatuses.filter(
      (o) =>
        (o.effectiveMode === DeliveryMode.COURRIER ||
          o.effectiveMode === DeliveryMode.EMAIL_ET_COURRIER) &&
        o.hasAddress
    );
  }, [ownerStatuses]);

  const getOwnersForEmail = useCallback(() => {
    return ownerStatuses.filter(
      (o) =>
        (o.effectiveMode === DeliveryMode.EMAIL ||
          o.effectiveMode === DeliveryMode.EMAIL_ET_COURRIER) &&
        o.hasEmail
    );
  }, [ownerStatuses]);

  return {
    config,
    ownerStatuses,
    stats,
    canValidate,
    validationErrors,
    isLoading,
    setGlobalMode,
    setOwnerMode,
    setPostalRegistered,
    sendEmail,
    sendAllEmails,
    saveAsPreferences,
    resetToPreferences,
    getOwnersForPostal,
    getOwnersForEmail,
  };
}
