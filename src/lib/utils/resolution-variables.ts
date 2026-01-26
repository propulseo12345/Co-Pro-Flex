/**
 * Utilitaires pour la gestion des variables dans les résolutions d'AG
 *
 * - parseVariables: extrait les variables uniques d'un texte
 * - applyVariables: remplace les variables par leurs valeurs
 * - validateVariable: valide une valeur selon le type de variable
 */

import { isValid, parse, parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ========================================
// TYPES
// ========================================

export type VariableStatus = 'auto' | 'manual' | 'missing';

export interface ParsedVariable {
    name: string;
    occurrences: number;
}

export interface VariableValidation {
    isValid: boolean;
    error?: string;
}

export interface VariableInfo {
    name: string;
    value: string;
    status: VariableStatus;
    validation: VariableValidation;
    source?: string;
}

export interface VariablesHistory {
    [variableName: string]: {
        values: string[];
        lastUsed: string;
    };
}

// ========================================
// PARSING
// ========================================

/**
 * Extrait les variables uniques d'un texte
 * Les variables sont au format {nom_variable}
 * @param text - Le texte à analyser
 * @returns Liste des noms de variables uniques avec leur nombre d'occurrences
 */
export function parseVariables(text: string): ParsedVariable[] {
    if (!text) return [];

    const regex = /\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;
    const variableMap = new Map<string, number>();

    let match;
    while ((match = regex.exec(text)) !== null) {
        const varName = match[1];
        variableMap.set(varName, (variableMap.get(varName) || 0) + 1);
    }

    return Array.from(variableMap.entries()).map(([name, occurrences]) => ({
        name,
        occurrences
    }));
}

/**
 * Extrait les noms de variables uniques (version simplifiée)
 * @param text - Le texte à analyser
 * @returns Liste des noms de variables uniques
 */
export function extractVariableNames(text: string): string[] {
    return parseVariables(text).map(v => v.name);
}

/**
 * Compte le nombre total de variables (avec répétitions)
 */
export function countTotalVariables(text: string): number {
    if (!text) return 0;
    const matches = text.match(/\{[a-zA-Z_][a-zA-Z0-9_]*\}/g);
    return matches ? matches.length : 0;
}

// ========================================
// APPLICATION DES VARIABLES
// ========================================

/**
 * Remplace les variables dans un texte par leurs valeurs
 * Gestion sûre des caractères spéciaux
 * @param text - Le texte avec les placeholders {variable}
 * @param variables - Map des valeurs de variables
 * @param options - Options de remplacement
 * @returns Le texte avec les variables remplacées
 */
export function applyVariables(
    text: string,
    variables: Record<string, string>,
    options: {
        showBracketsForEmpty?: boolean;
        highlightMissing?: boolean;
    } = {}
): string {
    if (!text) return '';

    const { showBracketsForEmpty = true, highlightMissing = false } = options;

    // Remplacer chaque variable
    let result = text;

    // Extraire toutes les variables du texte
    const varNames = extractVariableNames(text);

    // Remplacer chaque variable
    for (const varName of varNames) {
        const value = variables[varName];
        const placeholder = `{${varName}}`;

        if (value !== undefined && value !== null && value !== '') {
            // Échapper les caractères spéciaux dans la valeur pour éviter les problèmes de regex
            const safeValue = escapeRegexReplacement(value);
            result = result.split(placeholder).join(safeValue);
        } else if (showBracketsForEmpty) {
            // Montrer le placeholder comme [variable] si pas de valeur
            const displayPlaceholder = highlightMissing
                ? `⚠️[${varName}]`
                : `[${varName}]`;
            result = result.split(placeholder).join(displayPlaceholder);
        }
        // Si showBracketsForEmpty = false et pas de valeur, on garde {variable}
    }

    return result;
}

/**
 * Échappe les caractères spéciaux pour le remplacement de chaîne
 */
function escapeRegexReplacement(str: string): string {
    return str.replace(/\$/g, '$$$$');
}

/**
 * Vérifie si un texte contient des variables non résolues
 */
export function hasUnresolvedVariables(text: string): boolean {
    return /\{[a-zA-Z_][a-zA-Z0-9_]*\}/.test(text);
}

/**
 * Liste les variables non résolues dans un texte
 */
export function getUnresolvedVariables(
    text: string,
    variables: Record<string, string>
): string[] {
    const varNames = extractVariableNames(text);
    return varNames.filter(name => !variables[name] || variables[name].trim() === '');
}

// ========================================
// VALIDATION
// ========================================

/**
 * Valide une valeur de variable selon son type
 * @param name - Nom de la variable (pour déduire le type)
 * @param value - Valeur à valider
 * @param type - Type explicite (optionnel)
 * @returns Résultat de validation
 */
export function validateVariable(
    name: string,
    value: string,
    type?: string
): VariableValidation {
    // Valeur vide
    if (!value || value.trim() === '') {
        return { isValid: false, error: 'Valeur requise' };
    }

    // Déduire le type depuis le nom si non fourni
    const inferredType = type || inferVariableType(name);

    switch (inferredType) {
        case 'date':
            return validateDate(value);
        case 'montant':
            return validateMontant(value);
        case 'pourcentage':
            return validatePourcentage(value);
        case 'numero':
            return validateNumero(value);
        case 'email':
            return validateEmail(value);
        case 'telephone':
            return validateTelephone(value);
        default:
            // Pour le texte, juste vérifier non vide
            return { isValid: true };
    }
}

/**
 * Déduit le type de variable depuis son nom
 */
function inferVariableType(name: string): string {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('date') || lowerName.includes('debut') || lowerName.includes('fin')) {
        return 'date';
    }
    if (lowerName.includes('montant') || lowerName.includes('solde') || lowerName.includes('budget')) {
        return 'montant';
    }
    if (lowerName.includes('pourcentage') || lowerName.includes('taux')) {
        return 'pourcentage';
    }
    if (lowerName.includes('numero') || lowerName.includes('nombre')) {
        return 'numero';
    }
    if (lowerName.includes('email')) {
        return 'email';
    }
    if (lowerName.includes('telephone') || lowerName.includes('tel')) {
        return 'telephone';
    }

    return 'text';
}

/**
 * Valide une date (accepte dd/mm/yyyy et ISO)
 */
function validateDate(value: string): VariableValidation {
    // Essayer ISO d'abord
    let date = parseISO(value);
    if (isValid(date)) {
        return { isValid: true };
    }

    // Essayer format français dd/mm/yyyy
    date = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(date)) {
        return { isValid: true };
    }

    // Essayer format français d/M/yyyy
    date = parse(value, 'd/M/yyyy', new Date());
    if (isValid(date)) {
        return { isValid: true };
    }

    return { isValid: false, error: 'Format de date invalide (attendu: jj/mm/aaaa)' };
}

/**
 * Valide un montant
 */
function validateMontant(value: string): VariableValidation {
    // Nettoyer la valeur (espaces, symbole euro, etc.)
    const cleaned = value
        .replace(/\s/g, '')
        .replace(/€/g, '')
        .replace(/,/g, '.')
        .trim();

    const num = parseFloat(cleaned);
    if (isNaN(num)) {
        return { isValid: false, error: 'Montant invalide' };
    }

    return { isValid: true };
}

/**
 * Valide un pourcentage
 */
function validatePourcentage(value: string): VariableValidation {
    const cleaned = value.replace(/%/g, '').trim();
    const num = parseFloat(cleaned);

    if (isNaN(num)) {
        return { isValid: false, error: 'Pourcentage invalide' };
    }

    if (num < 0 || num > 100) {
        return { isValid: false, error: 'Le pourcentage doit être entre 0 et 100' };
    }

    return { isValid: true };
}

/**
 * Valide un numéro entier
 */
function validateNumero(value: string): VariableValidation {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
        return { isValid: false, error: 'Nombre entier attendu' };
    }
    return { isValid: true };
}

/**
 * Valide une adresse email
 */
function validateEmail(value: string): VariableValidation {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        return { isValid: false, error: 'Adresse email invalide' };
    }
    return { isValid: true };
}

/**
 * Valide un numéro de téléphone
 */
function validateTelephone(value: string): VariableValidation {
    // Format français simplifié
    const cleaned = value.replace(/[\s.\-]/g, '');
    if (!/^(\+33|0)[1-9][0-9]{8}$/.test(cleaned)) {
        return { isValid: false, error: 'Numéro de téléphone invalide' };
    }
    return { isValid: true };
}

// ========================================
// FORMATAGE
// ========================================

/**
 * Formate une date en format français (jj/mm/aaaa)
 */
export function formatDateFR(date: Date | string): string {
    if (!date) return '';

    let d: Date;
    if (typeof date === 'string') {
        d = parseISO(date);
        if (!isValid(d)) {
            d = parse(date, 'dd/MM/yyyy', new Date());
        }
    } else {
        d = date;
    }

    if (!isValid(d)) return String(date);

    return format(d, 'dd/MM/yyyy', { locale: fr });
}

/**
 * Formate une date en format long français
 */
export function formatDateLongFR(date: Date | string): string {
    if (!date) return '';

    let d: Date;
    if (typeof date === 'string') {
        d = parseISO(date);
        if (!isValid(d)) {
            d = parse(date, 'dd/MM/yyyy', new Date());
        }
    } else {
        d = date;
    }

    if (!isValid(d)) return String(date);

    return format(d, "d MMMM yyyy", { locale: fr });
}

/**
 * Parse une date flexible (plusieurs formats acceptés)
 */
export function parseDateFlexible(value: string): Date | null {
    if (!value) return null;

    // Essayer ISO d'abord
    let date = parseISO(value);
    if (isValid(date)) return date;

    // Essayer format français dd/mm/yyyy
    date = parse(value, 'dd/MM/yyyy', new Date());
    if (isValid(date)) return date;

    // Essayer format d/M/yyyy
    date = parse(value, 'd/M/yyyy', new Date());
    if (isValid(date)) return date;

    return null;
}

/**
 * Formate un montant en euros
 */
export function formatCurrency(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '').replace(/,/g, '.')) : value;
    if (isNaN(num)) return String(value);

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

/**
 * Formate un montant sans symbole euro (pour affichage dans les champs)
 */
export function formatMontant(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value.replace(/\s/g, '').replace(/,/g, '.')) : value;
    if (isNaN(num)) return String(value);

    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}

// ========================================
// HISTORIQUE LOCAL
// ========================================

const HISTORY_STORAGE_KEY = 'resolution-variables-history';
const MAX_HISTORY_ENTRIES = 10;

/**
 * Charge l'historique des valeurs de variables depuis le localStorage
 */
export function loadVariablesHistory(coproprieteId?: string): VariablesHistory {
    if (typeof window === 'undefined') return {};

    try {
        const key = coproprieteId ? `${HISTORY_STORAGE_KEY}-${coproprieteId}` : HISTORY_STORAGE_KEY;
        const stored = localStorage.getItem(key);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore errors
    }
    return {};
}

/**
 * Sauvegarde une valeur de variable dans l'historique
 */
export function saveToVariablesHistory(
    variableName: string,
    value: string,
    coproprieteId?: string
): void {
    if (typeof window === 'undefined' || !value) return;

    try {
        const history = loadVariablesHistory(coproprieteId);
        const existing = history[variableName] || { values: [], lastUsed: '' };

        // Ajouter la nouvelle valeur en premier (sans doublons)
        const values = [value, ...existing.values.filter(v => v !== value)].slice(0, MAX_HISTORY_ENTRIES);

        history[variableName] = {
            values,
            lastUsed: new Date().toISOString()
        };

        const key = coproprieteId ? `${HISTORY_STORAGE_KEY}-${coproprieteId}` : HISTORY_STORAGE_KEY;
        localStorage.setItem(key, JSON.stringify(history));
    } catch {
        // Ignore errors
    }
}

/**
 * Récupère les dernières valeurs utilisées pour une variable
 */
export function getVariableHistory(variableName: string, coproprieteId?: string): string[] {
    const history = loadVariablesHistory(coproprieteId);
    return history[variableName]?.values || [];
}

/**
 * Sauvegarde toutes les variables d'une résolution dans l'historique
 */
export function saveResolutionVariablesToHistory(
    variables: Record<string, string>,
    coproprieteId?: string
): void {
    Object.entries(variables).forEach(([name, value]) => {
        if (value && value.trim()) {
            saveToVariablesHistory(name, value, coproprieteId);
        }
    });
}
