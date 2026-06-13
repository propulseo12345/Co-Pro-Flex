'use client';

/**
 * Hook pour gérer les variables pré-remplies d'une résolution
 *
 * Fonctionnalités:
 * - Détection automatique des variables dans le texte
 * - Pré-remplissage depuis les données globales (syndic, finance, etc.)
 * - Suivi du statut (auto/manuel/manquant)
 * - Validation des valeurs
 * - Historique des valeurs utilisées
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    parseVariables,
    applyVariables,
    validateVariable,
    saveResolutionVariablesToHistory,
    getVariableHistory,
    formatDateFR,
    formatMontant,
    type VariableStatus,
    type VariableInfo,
    type VariableValidation
} from '@/lib/utils/resolution-variables';
import type { ResolutionTemplate } from '@/lib/constants/resolutions';

// ========================================
// TYPES
// ========================================

export interface ResolutionVariablesState {
    /** Map des valeurs de variables */
    values: Record<string, string>;
    /** Source de chaque variable (auto/manual/missing) */
    sources: Record<string, VariableStatus>;
    /** Valeurs initiales suggérées (pour le reset) */
    suggestions: Record<string, string>;
}

export interface UseResolutionVariablesOptions {
    /** Texte de la résolution */
    text: string;
    /** Template de résolution (optionnel, pour les types de variables) */
    template?: ResolutionTemplate;
    /** Valeurs initiales (si résolution existante) */
    initialValues?: Record<string, string>;
    /** ID de la copropriété (pour l'historique) */
    coproprieteId?: string;
    /** Exercice comptable */
    exercice?: string | number;
    /** Données financières */
    financeData?: {
        solde?: number;
        budgetPrevisionnel?: number;
        fondsTravaux?: number;
    };
    /** Infos syndic pour pré-remplissage */
    syndicInfo?: {
        nom?: string;
        adresse?: string;
        telephone?: string;
        email?: string;
    };
    /** Nom de la copropriété */
    nomCopropriete?: string;
    /** Adresse de la copropriété */
    adresseCopropriete?: string;
}

export interface UseResolutionVariablesReturn {
    /** Liste des variables détectées avec leurs infos */
    variables: VariableInfo[];
    /** Map des valeurs actuelles */
    values: Record<string, string>;
    /** Texte rendu avec les variables remplacées */
    renderedText: string;
    /** Nombre de variables manquantes */
    missingCount: number;
    /** Nombre de variables auto-remplies */
    autoCount: number;
    /** Est-ce que toutes les variables sont remplies ? */
    isComplete: boolean;
    /** Est-ce qu'il y a des erreurs de validation ? */
    hasValidationErrors: boolean;
    /** Met à jour une variable */
    updateVariable: (name: string, value: string) => void;
    /** Réinitialise toutes les variables aux suggestions */
    resetToSuggestions: () => void;
    /** Réinitialise une variable à sa suggestion */
    resetVariable: (name: string) => void;
    /** Sauvegarde les valeurs dans l'historique */
    saveToHistory: () => void;
    /** Récupère l'historique d'une variable */
    getHistory: (name: string) => string[];
    /** Valide une variable */
    validate: (name: string) => VariableValidation;
}

// ========================================
// SUGGESTIONS GLOBALES
// ========================================

/**
 * Génère les suggestions de valeurs depuis les données globales
 */
function generateSuggestions(
    variableNames: string[],
    options: UseResolutionVariablesOptions
): Record<string, string> {
    const suggestions: Record<string, string> = {};
    const exercice = options.exercice || (new Date().getFullYear() + 1);

    for (const name of variableNames) {
        const suggestion = getSuggestionForVariable(name, exercice, options.financeData, options.syndicInfo, options.nomCopropriete, options.adresseCopropriete);
        if (suggestion) {
            suggestions[name] = suggestion;
        }
    }

    return suggestions;
}

/**
 * Obtient la suggestion pour une variable spécifique
 */
function getSuggestionForVariable(
    name: string,
    exercice: string | number,
    financeData?: UseResolutionVariablesOptions['financeData'],
    syndicInfo?: UseResolutionVariablesOptions['syndicInfo'],
    nomCopropriete?: string,
    adresseCopropriete?: string
): string | null {
    const lowerName = name.toLowerCase();

    // === DATES ===
    if (lowerName === 'date' || lowerName === 'date_du_jour') {
        return formatDateFR(new Date());
    }
    if (lowerName === 'date_debut' || lowerName === 'exercice_debut') {
        return `01/01/${exercice}`;
    }
    if (lowerName === 'date_fin' || lowerName === 'exercice_fin' || lowerName === 'date_cloture') {
        return `31/12/${exercice}`;
    }
    if (lowerName === 'annee' || lowerName === 'exercice' || lowerName === 'annee_exercice') {
        return String(exercice);
    }

    // === SYNDIC ===
    if (lowerName === 'nom_syndic' || lowerName === 'syndic') {
        return syndicInfo?.nom || '';
    }
    if (lowerName === 'adresse_syndic') {
        return syndicInfo?.adresse || '';
    }
    if (lowerName === 'telephone_syndic' || lowerName === 'tel_syndic') {
        return syndicInfo?.telephone || '';
    }
    if (lowerName === 'email_syndic') {
        return syndicInfo?.email || '';
    }

    // === COPROPRIÉTÉ ===
    if (lowerName === 'nom_copropriete' || lowerName === 'copropriete') {
        return nomCopropriete || '';
    }
    if (lowerName === 'adresse_copropriete' || lowerName === 'adresse') {
        return adresseCopropriete || '';
    }

    // === FINANCE ===
    if (financeData) {
        if (lowerName === 'solde' || lowerName === 'solde_compte') {
            if (financeData.solde !== undefined) {
                return formatMontant(financeData.solde);
            }
        }
        if (lowerName === 'budget' || lowerName === 'montant_budget' || lowerName === 'budget_previsionnel') {
            if (financeData.budgetPrevisionnel !== undefined) {
                return formatMontant(financeData.budgetPrevisionnel);
            }
        }
        if (lowerName === 'fonds_travaux' || lowerName === 'montant_fonds_travaux') {
            if (financeData.fondsTravaux !== undefined) {
                return formatMontant(financeData.fondsTravaux);
            }
        }
    }

    return null;
}

// ========================================
// HOOK
// ========================================

export function useResolutionVariables(
    options: UseResolutionVariablesOptions
): UseResolutionVariablesReturn {
    const { text, initialValues = {}, coproprieteId } = options;

    // Extraire les variables du texte
    const parsedVariables = useMemo(() => parseVariables(text), [text]);
    const variableNames = useMemo(() => parsedVariables.map(v => v.name), [parsedVariables]);

    // Générer les suggestions
    const suggestions = useMemo(
        () => generateSuggestions(variableNames, options),
        [variableNames, options]
    );

    // État des variables
    const [state, setState] = useState<ResolutionVariablesState>(() => {
        const values: Record<string, string> = {};
        const sources: Record<string, VariableStatus> = {};

        for (const name of variableNames) {
            if (initialValues[name]) {
                // Valeur initiale fournie = manuel
                values[name] = initialValues[name];
                sources[name] = 'manual';
            } else if (suggestions[name]) {
                // Suggestion disponible = auto
                values[name] = suggestions[name];
                sources[name] = 'auto';
            } else {
                // Pas de valeur = manquant
                values[name] = '';
                sources[name] = 'missing';
            }
        }

        return { values, sources, suggestions };
    });

    // Recalculer si les variables changent
    useEffect(() => {
        setState(prev => {
            const values: Record<string, string> = {};
            const sources: Record<string, VariableStatus> = {};

            for (const name of variableNames) {
                if (prev.values[name] !== undefined && prev.values[name] !== '') {
                    // Garder la valeur existante
                    values[name] = prev.values[name];
                    sources[name] = prev.sources[name] || 'manual';
                } else if (initialValues[name]) {
                    values[name] = initialValues[name];
                    sources[name] = 'manual';
                } else if (suggestions[name]) {
                    values[name] = suggestions[name];
                    sources[name] = 'auto';
                } else {
                    values[name] = '';
                    sources[name] = 'missing';
                }
            }

            return { values, sources, suggestions };
        });
    }, [variableNames, initialValues, suggestions]);

    // Construire les infos de variables
    const variables = useMemo((): VariableInfo[] => {
        return parsedVariables.map(({ name }) => {
            const value = state.values[name] || '';
            const status = state.sources[name] || 'missing';
            const validation = validateVariable(name, value);

            // Déterminer la source
            let source: string | undefined;
            if (status === 'auto') {
                if (name.includes('syndic')) source = 'Contrat syndic';
                else if (name.includes('copropriete') || name.includes('adresse')) source = 'Paramètres';
                else if (name.includes('solde') || name.includes('budget')) source = 'Finance';
                else if (name.includes('date') || name.includes('exercice')) source = 'Calendrier';
            }

            return {
                name,
                value,
                status: value ? status : 'missing',
                validation,
                source
            };
        });
    }, [parsedVariables, state.values, state.sources]);

    // Texte rendu
    const renderedText = useMemo(
        () => applyVariables(text, state.values, { showBracketsForEmpty: true }),
        [text, state.values]
    );

    // Statistiques
    const missingCount = useMemo(
        () => variables.filter(v => v.status === 'missing').length,
        [variables]
    );

    const autoCount = useMemo(
        () => variables.filter(v => v.status === 'auto').length,
        [variables]
    );

    const isComplete = missingCount === 0;

    const hasValidationErrors = useMemo(
        () => variables.some(v => v.value && !v.validation.isValid),
        [variables]
    );

    // Actions
    const updateVariable = useCallback((name: string, value: string) => {
        setState(prev => ({
            ...prev,
            values: { ...prev.values, [name]: value },
            sources: { ...prev.sources, [name]: value ? 'manual' : 'missing' }
        }));
    }, []);

    const resetToSuggestions = useCallback(() => {
        setState(prev => {
            const values: Record<string, string> = {};
            const sources: Record<string, VariableStatus> = {};

            for (const name of variableNames) {
                if (prev.suggestions[name]) {
                    values[name] = prev.suggestions[name];
                    sources[name] = 'auto';
                } else {
                    values[name] = '';
                    sources[name] = 'missing';
                }
            }

            return { ...prev, values, sources };
        });
    }, [variableNames]);

    const resetVariable = useCallback((name: string) => {
        setState(prev => {
            const suggestion = prev.suggestions[name];
            return {
                ...prev,
                values: { ...prev.values, [name]: suggestion || '' },
                sources: { ...prev.sources, [name]: suggestion ? 'auto' : 'missing' }
            };
        });
    }, []);

    const saveToHistory = useCallback(() => {
        saveResolutionVariablesToHistory(state.values, coproprieteId);
    }, [state.values, coproprieteId]);

    const getHistory = useCallback((name: string): string[] => {
        return getVariableHistory(name, coproprieteId);
    }, [coproprieteId]);

    const validate = useCallback((name: string): VariableValidation => {
        return validateVariable(name, state.values[name] || '');
    }, [state.values]);

    return {
        variables,
        values: state.values,
        renderedText,
        missingCount,
        autoCount,
        isComplete,
        hasValidationErrors,
        updateVariable,
        resetToSuggestions,
        resetVariable,
        saveToHistory,
        getHistory,
        validate
    };
}

export default useResolutionVariables;
