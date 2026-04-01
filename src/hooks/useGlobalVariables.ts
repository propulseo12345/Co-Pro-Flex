'use client';

/**
 * Hook pour charger et pré-remplir les variables globales (syndic, modalité de paiement, etc.)
 * dans le contexte d'une AG.
 *
 * RÉSOUT:
 * - {nom_syndic} : Retourne le nom du syndic/cabinet (pas la liste des copropriétaires)
 * - {modalite_paiement_fonds} : Retourne le libellé correct ("Trimestriel", "Semestriel", etc.)
 */

import { useMemo, useCallback } from 'react';
import type { ContratSyndic } from '@/types';
import {
    resolveGlobalVariables,
    resolveResolutionTextWithGlobals,
    type GlobalVariablesContext
} from '@/lib/utils/variable-resolution';

interface UseGlobalVariablesOptions {
    /** ID de l'AG pour charger les données spécifiques */
    agId?: string;
    /** Contrat syndic (optionnel) */
    contratSyndic?: ContratSyndic;
    /** Nom de la copropriété */
    nomCopropriete?: string;
    /** Adresse de la copropriété */
    adresseCopropriete?: string;
    /** Exercice comptable (année) */
    exercice?: number | string;
    /** Variables spécifiques saisies par l'utilisateur */
    userVariables?: Record<string, string>;
}

interface UseGlobalVariablesReturn {
    /** Contexte global complet pour la résolution des variables */
    globalContext: GlobalVariablesContext;

    /** Variables pré-remplies (syndic, modalités, dates, etc.) */
    prefillVariables: Record<string, string>;

    /** Résout le texte avec variables globales + variables utilisateur */
    resolveText: (texte: string, resolutionVariables?: Record<string, string>) => string;

    /** Fusionne les variables utilisateur avec les variables globales pré-remplies */
    mergeVariables: (userVars: Record<string, string>) => Record<string, string>;

    /** Nom du syndic formaté */
    nomSyndic: string;

    /** Modalité de paiement du fonds (libellé) */
    modalitePaiementFonds: string;

    /** Modalité de paiement du budget (libellé) */
    modalitePaiementBudget: string;
}

/**
 * Hook pour gérer les variables globales d'une AG
 */
export function useGlobalVariables(options: UseGlobalVariablesOptions = {}): UseGlobalVariablesReturn {
    const {
        contratSyndic,
        nomCopropriete = '',
        adresseCopropriete = '',
        exercice = new Date().getFullYear() + 1,
        userVariables = {}
    } = options;

    // Construire le contexte global
    const globalContext = useMemo<GlobalVariablesContext>(() => ({
        contratSyndic: contratSyndic || { id: '', nomSyndic: '', cabinetNom: '' } as ContratSyndic,
        nomCopropriete,
        adresseCopropriete,
        modalitePaiementBudget: userVariables['modalites_paiement_budget'] || 'trimestriel',
        modalitePaiementFonds: userVariables['modalites_paiement_fonds'] || 'trimestriel',
        exercice
    }), [contratSyndic, nomCopropriete, adresseCopropriete, exercice, userVariables]);

    // Variables pré-remplies depuis le contexte global
    const prefillVariables = useMemo(() => {
        return resolveGlobalVariables(globalContext);
    }, [globalContext]);

    // Nom du syndic formaté (raison sociale ou nom complet)
    const nomSyndic = useMemo(() => {
        if (contratSyndic?.cabinetNom) {
            return contratSyndic.cabinetNom;
        }
        return contratSyndic?.nomSyndic || '';
    }, [contratSyndic]);

    // Modalités formatées
    const modalitePaiementFonds = useMemo(() => {
        return prefillVariables['modalite_paiement_fonds'] || prefillVariables['modalites_paiement_fonds'] || '';
    }, [prefillVariables]);

    const modalitePaiementBudget = useMemo(() => {
        return prefillVariables['modalites_paiement_budget'] || '';
    }, [prefillVariables]);

    // Résoudre un texte avec les variables globales + utilisateur
    const resolveText = useCallback((
        texte: string,
        resolutionVariables?: Record<string, string>
    ): string => {
        return resolveResolutionTextWithGlobals(
            texte,
            { ...userVariables, ...resolutionVariables },
            globalContext,
            true // Afficher [variable] pour les non résolues
        );
    }, [globalContext, userVariables]);

    // Fusionner les variables utilisateur avec les pré-remplies
    // Les variables utilisateur ont la priorité
    const mergeVariables = useCallback((userVars: Record<string, string>): Record<string, string> => {
        return {
            ...prefillVariables,
            ...userVars
        };
    }, [prefillVariables]);

    return {
        globalContext,
        prefillVariables,
        resolveText,
        mergeVariables,
        nomSyndic,
        modalitePaiementFonds,
        modalitePaiementBudget
    };
}

/**
 * Fonction standalone pour obtenir les variables pré-remplies
 * Utile pour l'initialisation côté serveur ou hors composant
 */
export function getPrefillVariables(
    contratSyndic?: ContratSyndic,
    exercice: number | string = new Date().getFullYear() + 1,
    nomCopropriete = '',
    adresseCopropriete = ''
): Record<string, string> {
    const context: GlobalVariablesContext = {
        contratSyndic: contratSyndic || { id: '', nomSyndic: '', cabinetNom: '' } as ContratSyndic,
        nomCopropriete,
        adresseCopropriete,
        exercice
    };

    return resolveGlobalVariables(context);
}

/**
 * Obtient le nom du syndic correctement formaté
 */
export function getSyndicName(contratSyndic?: ContratSyndic): string {
    if (!contratSyndic) return '';
    return contratSyndic.cabinetNom || contratSyndic.nomSyndic || '';
}

export default useGlobalVariables;
