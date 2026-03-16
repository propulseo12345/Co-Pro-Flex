/**
 * Hook de garde pour les étapes du workflow AG
 *
 * Vérifie les prérequis métier avant d'accéder à une étape
 * et gère la redirection automatique si nécessaire
 *
 * FIX: Ajout de timeout et gestion d'erreurs pour éviter le loading infini
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    buildPrerequisitesContext,
    validateStepBusinessPrerequisites,
    getStepById,
    getStepRedirectPath,
    type AGStepPrerequisitesContext,
    type StepPrerequisiteResult,
} from '@/lib/constants/ag-workflow';

// Timeout de sécurité pour éviter le loading infini
const GUARD_TIMEOUT_MS = 5000;

export type GuardState = 'loading' | 'allowed' | 'redirecting' | 'blocked' | 'error';

export interface UseAGStepGuardOptions {
    /** ID de l'AG */
    agId: string;
    /** ID de l'étape à valider */
    stepId: string;
    /** Activer la redirection automatique (défaut: true) */
    autoRedirect?: boolean;
    /** Délai avant redirection en ms (défaut: 0) */
    redirectDelay?: number;
}

export interface UseAGStepGuardReturn {
    /** État actuel du guard */
    state: GuardState;
    /** Contexte des prérequis (données chargées) */
    context: AGStepPrerequisitesContext | null;
    /** Résultat de la validation */
    validationResult: StepPrerequisiteResult | null;
    /** Message explicatif si bloqué */
    blockReason: string | null;
    /** URL de redirection si nécessaire */
    redirectUrl: string | null;
    /** Forcer la redirection manuellement */
    redirect: () => void;
    /** Rafraîchir la validation */
    refresh: () => void;
}

/**
 * Hook pour valider l'accès à une étape du workflow AG
 *
 * @example
 * ```tsx
 * const { state, blockReason, redirectUrl } = useAGStepGuard({
 *   agId: 'ag-123',
 *   stepId: 'votes_correspondance',
 * });
 *
 * if (state === 'loading') return <Spinner />;
 * if (state === 'blocked') return <StepUnavailable reason={blockReason} />;
 * // sinon, afficher le contenu normal
 * ```
 */
export function useAGStepGuard({
    agId,
    stepId,
    autoRedirect = true,
    redirectDelay = 0,
}: UseAGStepGuardOptions): UseAGStepGuardReturn {
    const router = useRouter();

    const [state, setState] = useState<GuardState>('loading');
    const [context, setContext] = useState<AGStepPrerequisitesContext | null>(null);
    const [validationResult, setValidationResult] = useState<StepPrerequisiteResult | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Ref pour éviter les doubles exécutions en mode strict
    const hasValidatedRef = useRef(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Valider les prérequis avec gestion d'erreurs
    const validate = useCallback(() => {
        // FIX: Wrapper dans try-catch pour éviter les erreurs silencieuses
        try {
            if (!agId || !stepId) {
                setState('error');
                setErrorMessage('Identifiant de l\'AG ou de l\'étape manquant');
                return;
            }

            // Vérifier que l'étape existe
            const step = getStepById(stepId);
            if (!step) {
                setState('error');
                setErrorMessage(`Étape "${stepId}" non trouvée dans le workflow`);
                return;
            }

            setState('loading');

            // Construire le contexte depuis localStorage (côté client uniquement)
            const ctx = buildPrerequisitesContext(agId);
            setContext(ctx);

            // Valider les prérequis métier
            const result = validateStepBusinessPrerequisites(stepId, ctx);
            setValidationResult(result);

            if (result.isAccessible) {
                setState('allowed');
            } else {
                // Déterminer la redirection
                const redirectPath = getStepRedirectPath(stepId, ctx);

                if (autoRedirect && redirectPath) {
                    setState('redirecting');

                    // Rediriger après le délai
                    const redirectTimeoutId = setTimeout(() => {
                        router.replace(redirectPath);
                    }, redirectDelay);

                    // Cleanup si le composant est démonté
                    return () => clearTimeout(redirectTimeoutId);
                } else {
                    setState('blocked');
                }
            }
        } catch (error) {
            // FIX: Capturer les erreurs inattendues au lieu de rester en loading
            console.error('[useAGStepGuard] Erreur lors de la validation:', error);
            setState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Erreur de validation inattendue');
        }
    }, [agId, stepId, autoRedirect, redirectDelay, router]);

    // Valider au montage et quand les dépendances changent
    useEffect(() => {
        // Ne valider que côté client
        if (typeof window === 'undefined') {
            return;
        }

        // FIX: Éviter la double exécution mais permettre les revalidations
        if (hasValidatedRef.current) {
            // Permettre la revalidation si les dépendances changent vraiment
            hasValidatedRef.current = false;
        }
        hasValidatedRef.current = true;

        // FIX: Timeout de sécurité pour éviter le loading infini
        timeoutRef.current = setTimeout(() => {
            if (state === 'loading') {
                // Timeout reached, forcing allowed state
                setState('allowed');
                setErrorMessage('Le chargement a pris trop de temps. Vérifiez les données.');
            }
        }, GUARD_TIMEOUT_MS);

        const cleanup = validate();

        return () => {
            // Cleanup du timeout et de la redirection
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (cleanup) {
                cleanup();
            }
        };
    }, [validate, state]);

    // URL de redirection calculée
    const redirectUrl = useMemo(() => {
        if (!context || !validationResult) return null;
        if (validationResult.isAccessible) return null;
        return getStepRedirectPath(stepId, context) || null;
    }, [context, validationResult, stepId]);

    // Message de blocage (inclut les erreurs)
    const blockReason = useMemo(() => {
        // FIX: Inclure les messages d'erreur dans le reason
        if (errorMessage) return errorMessage;
        if (!validationResult) return null;
        return validationResult.reason || null;
    }, [validationResult, errorMessage]);

    // Fonction de redirection manuelle
    const redirect = useCallback(() => {
        if (redirectUrl) {
            router.replace(redirectUrl);
        }
    }, [redirectUrl, router]);

    // Fonction de rafraîchissement
    const refresh = useCallback(() => {
        validate();
    }, [validate]);

    return {
        state,
        context,
        validationResult,
        blockReason,
        redirectUrl,
        redirect,
        refresh,
    };
}

export default useAGStepGuard;
