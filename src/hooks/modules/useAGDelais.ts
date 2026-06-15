/**
 * Hook de gestion des délais légaux AG
 *
 * ARCHITECTURE PRODUCTION:
 * - Source de vérité : Supabase (ag_milestones)
 * - AUCUN localStorage pour les données métier
 * - Calcule et surveille les jalons, génère des alertes proactives
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
    calculerJalonsAG,
    verifierDateAGValide,
    verifierEnvoiConvocationPossible,
    calculerDateAGMinimum,
    type JalonAG,
    type JalonType,
    type JalonStatus,
} from '@/lib/constants/ag-delais-legaux';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AGStatut = 'brouillon' | 'planifiee' | 'convocations_envoyees' | 'en_cours' | 'terminee' | 'annulee';

export interface AlerteDelai {
    id: string;
    type: 'info' | 'warning' | 'error' | 'success' | 'blocked';
    titre: string;
    message: string;
    jalonType?: JalonAG['type'];
    action?: {
        label: string;
        href: string;
    };
    dismissible: boolean;
}

export interface ValidationDateAG {
    valide: boolean;
    joursDisponibles: number;
    joursMinimum: number;
    message: string;
    niveau: 'ok' | 'warning' | 'error';
}

export interface ValidationEnvoi {
    possible: boolean;
    joursAvantAG: number;
    message: string;
    niveau: 'ok' | 'warning' | 'error' | 'blocked';
    peutForcer: boolean;
}

export interface DatesMinimales {
    minimum: Date;
    recommandee: Date;
    ideale: Date;
}

export interface UseAGDelaisProps {
    dateAG?: Date | string | null;
    dateConvocationEnvoyee?: Date | string | null;
    statut?: AGStatut;
    agId?: string;
}

export interface UseAGDelaisReturn {
    // État
    jalons: JalonAG[];
    jalonsAVenir: JalonAG[];
    jalonsUrgents: JalonAG[];
    jalonsDepasses: JalonAG[];
    alertes: AlerteDelai[];
    prochainJalon: JalonAG | null;

    // Validations
    validationDateAG: ValidationDateAG | null;
    validationEnvoi: ValidationEnvoi | null;
    datesMinimales: DatesMinimales;

    // Flags
    peutConvoquer: boolean;
    aDesAlertesCritiques: boolean;
    estEnRetard: boolean;
    joursAvantAG: number | null;

    // Actions
    marquerJalonComplete: (jalonType: JalonAG['type']) => void;
    dismissAlerte: (alerteId: string) => void;
    rafraichir: () => void;
}

// ═══════════════════════════════════════════════════════════════
// FONCTIONS UTILITAIRES
// ═══════════════════════════════════════════════════════════════

function parseDate(date: Date | string | null | undefined): Date | null {
    if (!date) return null;
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function differenceInDays(dateA: Date, dateB: Date): number {
    const diffTime = dateA.getTime() - dateB.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function useAGDelais({
    dateAG,
    dateConvocationEnvoyee,
    statut = 'brouillon',
    agId,
}: UseAGDelaisProps): UseAGDelaisReturn {
    const [jalonsCompletes, setJalonsCompletes] = useState<Set<JalonAG['type']>>(new Set());
    const [alertesDismissed, setAlertesDismissed] = useState<Set<string>>(new Set());
    const [now, setNow] = useState(() => new Date());
    const [, setIsLoading] = useState(false);

    // Vérifier si l'ID est un UUID valide (Supabase AG)
    const isValidUUID = useCallback((id: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }, []);

    // Charger les jalons complétés depuis Supabase
    useEffect(() => {
        if (!agId || typeof window === 'undefined') return;
        if (!isValidUUID(agId)) return; // Skip pour les AG legacy

        const loadMilestones = async () => {
            setIsLoading(true);
            try {
                const supabase = createUntypedClient();
                const { data: milestones, error } = await supabase
                    .rpc('get_ag_milestones', { p_ag_id: agId });

                if (error) {
                    console.error('[useAGDelais] Error loading milestones:', error);
                    return;
                }

                if (milestones && Array.isArray(milestones)) {
                    const types = milestones
                        .filter((m: { milestone_key: string | null; done: boolean }) => m.done)
                        .map((m: { milestone_key: string | null; done: boolean }) => m.milestone_key as JalonType);
                    setJalonsCompletes(new Set(types));
                }
            } catch (error) {
                console.error('[useAGDelais] Error loading milestones:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMilestones();
    }, [agId, isValidUUID]);

    // Rafraîchir "now" toutes les minutes pour mettre à jour les statuts
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date());
        }, 60000); // 1 minute

        return () => clearInterval(interval);
    }, []);

    // Parser les dates
    const dateAGParsed = useMemo(() => parseDate(dateAG), [dateAG]);
    const dateConvocationParsed = useMemo(() => parseDate(dateConvocationEnvoyee), [dateConvocationEnvoyee]);

    // Calculer les jalons
    const jalons = useMemo((): JalonAG[] => {
        if (!dateAGParsed) return [];

        const jalonsCalcules = calculerJalonsAG(dateAGParsed, now);

        // Mettre à jour les statuts des jalons complétés
        return jalonsCalcules.map(jalon => {
            if (jalonsCompletes.has(jalon.type)) {
                return { ...jalon, status: 'complete' as JalonStatus };
            }
            // Si convocation envoyée, marquer les jalons de convocation comme complétés
            if (dateConvocationParsed && ['date_limite_convocation', 'date_envoi_documents', 'date_limite_ordre_jour'].includes(jalon.type)) {
                if (statut === 'convocations_envoyees' || statut === 'en_cours' || statut === 'terminee') {
                    return { ...jalon, status: 'complete' as JalonStatus };
                }
            }
            return jalon;
        });
    }, [dateAGParsed, now, jalonsCompletes, dateConvocationParsed, statut]);

    // Filtrer les jalons par catégorie
    const jalonsAVenir = useMemo(() =>
        jalons.filter(j => j.status === 'a_venir' || j.status === 'imminent'),
        [jalons]
    );

    const jalonsUrgents = useMemo(() =>
        jalons.filter(j => j.status === 'urgent'),
        [jalons]
    );

    const jalonsDepasses = useMemo(() =>
        jalons.filter(j => j.status === 'depasse'),
        [jalons]
    );

    // Prochain jalon non complété
    const prochainJalon = useMemo(() => {
        const nonCompletes = jalons.filter(j => j.status !== 'complete' && j.status !== 'depasse');
        return nonCompletes.length > 0 ? nonCompletes[0] : null;
    }, [jalons]);

    // Validation de la date AG
    const validationDateAG = useMemo((): ValidationDateAG | null => {
        if (!dateAGParsed) return null;
        return verifierDateAGValide(dateAGParsed, now);
    }, [dateAGParsed, now]);

    // Validation de l'envoi
    const validationEnvoi = useMemo((): ValidationEnvoi | null => {
        if (!dateAGParsed) return null;
        // Si convocation déjà envoyée, utiliser cette date
        const dateEnvoi = dateConvocationParsed || now;
        return verifierEnvoiConvocationPossible(dateAGParsed, dateEnvoi);
    }, [dateAGParsed, dateConvocationParsed, now]);

    // Dates minimales
    const datesMinimales = useMemo((): DatesMinimales => {
        return calculerDateAGMinimum(now);
    }, [now]);

    // Générer les alertes
    const alertes = useMemo((): AlerteDelai[] => {
        const listeAlertes: AlerteDelai[] = [];
        const agIdSegment = agId || '{id}';

        // Alerte date AG invalide
        if (validationDateAG && !validationDateAG.valide) {
            listeAlertes.push({
                id: 'date-ag-invalide',
                type: 'error',
                titre: 'Date d\'AG trop proche',
                message: validationDateAG.message,
                dismissible: false,
            });
        } else if (validationDateAG && validationDateAG.niveau === 'warning') {
            listeAlertes.push({
                id: 'date-ag-warning',
                type: 'warning',
                titre: 'Délai court',
                message: validationDateAG.message,
                dismissible: true,
            });
        }

        // Alerte envoi bloqué
        if (validationEnvoi && validationEnvoi.niveau === 'blocked' && statut === 'planifiee') {
            listeAlertes.push({
                id: 'envoi-bloque',
                type: 'blocked',
                titre: 'Envoi des convocations impossible',
                message: validationEnvoi.message,
                action: {
                    label: 'Modifier la date de l\'AG',
                    href: `/ag/${agIdSegment}/edit`,
                },
                dismissible: false,
            });
        }

        // Alertes pour jalons urgents
        jalonsUrgents.forEach(jalon => {
            if (!jalonsCompletes.has(jalon.type)) {
                listeAlertes.push({
                    id: `urgent-${jalon.type}`,
                    type: 'warning',
                    titre: `${jalon.label} urgent`,
                    message: `Plus que ${jalon.joursRestants} jour(s) - ${jalon.description}`,
                    jalonType: jalon.type,
                    action: jalon.action ? {
                        label: jalon.action.label,
                        href: jalon.action.href.replace('{id}', agIdSegment),
                    } : undefined,
                    dismissible: true,
                });
            }
        });

        // Alertes pour jalons dépassés
        jalonsDepasses.forEach(jalon => {
            if (!jalonsCompletes.has(jalon.type) && jalon.obligatoire) {
                listeAlertes.push({
                    id: `depasse-${jalon.type}`,
                    type: 'error',
                    titre: `${jalon.label} dépassé`,
                    message: `Date dépassée de ${Math.abs(jalon.joursRestants)} jour(s) - Action requise immédiatement`,
                    jalonType: jalon.type,
                    action: jalon.action ? {
                        label: jalon.action.label,
                        href: jalon.action.href.replace('{id}', agIdSegment),
                    } : undefined,
                    dismissible: false,
                });
            }
        });

        // Alerte convocation à envoyer (si planifiée et non envoyée)
        if (statut === 'planifiee' && !dateConvocationParsed) {
            const jalonConvoc = jalons.find(j => j.type === 'date_limite_convocation');
            if (jalonConvoc && jalonConvoc.status === 'imminent') {
                listeAlertes.push({
                    id: 'convocation-imminente',
                    type: 'warning',
                    titre: 'Envoyez les convocations',
                    message: `Il reste ${jalonConvoc.joursRestants} jours pour envoyer les convocations dans les délais légaux.`,
                    action: {
                        label: 'Envoyer les convocations',
                        href: `/ag/${agIdSegment}/convocation`,
                    },
                    dismissible: true,
                });
            }
        }

        // Filtrer les alertes dismissées
        return listeAlertes.filter(a => !alertesDismissed.has(a.id) || !a.dismissible);
    }, [validationDateAG, validationEnvoi, jalonsUrgents, jalonsDepasses, jalons, jalonsCompletes, statut, dateConvocationParsed, alertesDismissed, agId]);

    // Flags calculés
    const peutConvoquer = useMemo(() => {
        if (!validationEnvoi) return false;
        return validationEnvoi.possible;
    }, [validationEnvoi]);

    const aDesAlertesCritiques = useMemo(() => {
        return alertes.some(a => a.type === 'error' || a.type === 'blocked');
    }, [alertes]);

    const estEnRetard = useMemo(() => {
        return jalonsDepasses.length > 0 && jalonsDepasses.some(j => j.obligatoire);
    }, [jalonsDepasses]);

    const joursAvantAG = useMemo(() => {
        if (!dateAGParsed) return null;
        return differenceInDays(dateAGParsed, now);
    }, [dateAGParsed, now]);

    // Actions
    const marquerJalonComplete = useCallback(async (jalonType: JalonAG['type']) => {
        // Mettre à jour l'état local immédiatement pour UX réactive
        setJalonsCompletes(prev => {
            const newSet = new Set(prev);
            newSet.add(jalonType);
            return newSet;
        });

        // Sauvegarder dans Supabase si c'est une AG valide
        if (agId && isValidUUID(agId)) {
            try {
                const supabase = createUntypedClient();
                const { error } = await supabase.rpc('save_ag_milestone', {
                    p_ag_id: agId,
                    p_milestone_key: jalonType,
                    p_done: true,
                });

                if (error) {
                    console.error('[useAGDelais] Error saving milestone:', error);
                }
            } catch (error) {
                console.error('[useAGDelais] Error saving milestone:', error);
            }
        }
    }, [agId, isValidUUID]);

    const dismissAlerte = useCallback((alerteId: string) => {
        setAlertesDismissed(prev => {
            const newSet = new Set(prev);
            newSet.add(alerteId);
            return newSet;
        });
    }, []);

    const rafraichir = useCallback(() => {
        setNow(new Date());
    }, []);

    return {
        // État
        jalons,
        jalonsAVenir,
        jalonsUrgents,
        jalonsDepasses,
        alertes,
        prochainJalon,

        // Validations
        validationDateAG,
        validationEnvoi,
        datesMinimales,

        // Flags
        peutConvoquer,
        aDesAlertesCritiques,
        estEnRetard,
        joursAvantAG,

        // Actions
        marquerJalonComplete,
        dismissAlerte,
        rafraichir,
    };
}

export default useAGDelais;
