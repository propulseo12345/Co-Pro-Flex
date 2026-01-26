/**
 * Utilitaires pour la résolution des variables dans les résolutions d'AG
 * et l'extraction des signataires du procès-verbal
 *
 * CORRECTIONS PRINCIPALES (v2):
 * - {nom_syndic} : Retourne maintenant le nom du syndic (raison sociale ou nom/prénom)
 * - {modalite_paiement_fonds} : Retourne le libellé correct de la modalité
 */

import { replaceVariables as baseReplaceVariables } from '@/lib/constants/resolutions';
import type { Coproprietaire } from '@/data/mock';
import type { ContratSyndic } from '@/types';
import { LIBELLES_MODALITE_PAIEMENT, type ModalitePaiement } from '@/lib/documents/variables';

// Types
export interface UnfilledVariable {
    resolutionId: string;
    resolutionTitle: string;
    variableName: string;
}

export interface VariableValidationResult {
    isComplete: boolean;
    unfilledVariables: UnfilledVariable[];
    totalVariables: number;
    filledVariables: number;
}

export interface ResolutionWithVariables {
    id: string;
    titre: string;
    texte: string;
    variables?: Record<string, string>;
    templateId?: string;
}

export interface ExtractedSignataire {
    role: 'president' | 'secretaire' | 'scrutateur';
    roleLabel: string;
    name: string;
    coproprietaire: Coproprietaire | null;
}

/**
 * Valide les variables de toutes les résolutions et retourne les variables non remplies
 */
export function validateResolutionVariables(
    resolutions: ResolutionWithVariables[]
): VariableValidationResult {
    const unfilledVariables: UnfilledVariable[] = [];
    let totalVariables = 0;
    let filledVariables = 0;

    resolutions.forEach(resolution => {
        // Extraire les variables du texte
        const variablePattern = /\{([^}]+)\}/g;
        let match;
        const foundVars = new Set<string>();

        while ((match = variablePattern.exec(resolution.texte)) !== null) {
            foundVars.add(match[1]);
        }

        foundVars.forEach(varName => {
            totalVariables++;
            const value = resolution.variables?.[varName];

            if (value && value.trim() !== '') {
                filledVariables++;
            } else {
                unfilledVariables.push({
                    resolutionId: resolution.id,
                    resolutionTitle: resolution.titre,
                    variableName: varName
                });
            }
        });
    });

    return {
        isComplete: unfilledVariables.length === 0,
        unfilledVariables,
        totalVariables,
        filledVariables
    };
}

/**
 * Résout les variables dans le texte d'une résolution
 * @param texte - Le texte avec les placeholders {variable}
 * @param variables - Les valeurs des variables
 * @param showBracketsForEmpty - Si true, les variables non résolues s'affichent comme [variable]
 */
export function resolveResolutionText(
    texte: string,
    variables?: Record<string, string>,
    showBracketsForEmpty: boolean = true
): string {
    if (!texte) return '';
    if (!variables) {
        // Pas de variables fournies, remplacer tous les placeholders par des crochets
        if (showBracketsForEmpty) {
            return texte.replace(/\{([^}]+)\}/g, '[$1]');
        }
        return texte;
    }

    // Remplacer les variables avec leurs valeurs
    let result = baseReplaceVariables(texte, variables);

    // Remplacer les placeholders restants par des crochets
    if (showBracketsForEmpty) {
        result = result.replace(/\{([^}]+)\}/g, '[$1]');
    }

    return result;
}

/**
 * Normalise un nom pour la comparaison (supprime accents, met en minuscules, trim)
 */
export function normalizeName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
        .trim();
}

/**
 * Recherche un copropriétaire par son nom
 * Tente d'abord une correspondance exacte, puis partielle sur le nom de famille
 */
export function findCoproprietaireByName(
    name: string,
    coproprietaires: Coproprietaire[]
): Coproprietaire | null {
    if (!name || !coproprietaires.length) return null;

    const normalizedInput = normalizeName(name);

    // Correspondance exacte sur le nom complet
    const exactMatch = coproprietaires.find(
        c => normalizeName(c.nom) === normalizedInput
    );
    if (exactMatch) return exactMatch;

    // Correspondance partielle : vérifier si l'input contient le nom de famille
    const partialMatch = coproprietaires.find(c => {
        const parts = c.nom.split(' ');
        const lastName = parts[parts.length - 1]; // Dernier mot = nom de famille
        return normalizedInput.includes(normalizeName(lastName)) ||
               normalizeName(lastName).includes(normalizedInput);
    });

    return partialMatch || null;
}

/**
 * Parse un nom complet (format "Prénom NOM") en prénom et nom séparés
 */
export function parseFullName(fullName: string): { prenom: string; nom: string } {
    if (!fullName) return { prenom: '', nom: '' };

    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
        return { prenom: '', nom: parts[0] };
    }

    // Premier mot = prénom, reste = nom
    const prenom = parts[0];
    const nom = parts.slice(1).join(' ');

    return { prenom, nom };
}

/**
 * Extrait les signataires (président, secrétaire, scrutateur) depuis les résolutions de l'AG
 * Recherche dans les résolutions ag-01, ag-02, ag-03
 */
export function extractSignatairesFromResolutions(
    resolutions: ResolutionWithVariables[],
    coproprietaires: Coproprietaire[]
): ExtractedSignataire[] {
    const roleMap: Record<string, { role: ExtractedSignataire['role']; label: string; varKey: string }> = {
        'ag-01': { role: 'president', label: 'Président de séance', varKey: 'nom_president' },
        'ag-02': { role: 'secretaire', label: 'Secrétaire de séance', varKey: 'nom_secretaire' },
        'ag-03': { role: 'scrutateur', label: 'Scrutateur', varKey: 'nom_scrutateur' }
    };

    const signataires: ExtractedSignataire[] = [];

    // Pour chaque rôle, chercher la résolution correspondante
    Object.entries(roleMap).forEach(([templateId, config]) => {
        const resolution = resolutions.find(r => r.templateId === templateId);

        let name = '';
        let coproprietaire: Coproprietaire | null = null;

        if (resolution?.variables) {
            // Essayer de récupérer le nom depuis la variable spécifique
            name = resolution.variables[config.varKey] || '';

            // Si pas trouvé, essayer la variable générique 'nom'
            if (!name) {
                name = resolution.variables['nom'] || '';
            }
        }

        // Rechercher le copropriétaire correspondant
        if (name) {
            coproprietaire = findCoproprietaireByName(name, coproprietaires);
        }

        signataires.push({
            role: config.role,
            roleLabel: config.label,
            name,
            coproprietaire
        });
    });

    return signataires;
}

/**
 * Vérifie si un texte contient encore des placeholders non résolus
 */
export function hasUnresolvedPlaceholders(text: string): boolean {
    return /\{[^}]+\}/.test(text);
}

/**
 * Compte le nombre de placeholders non résolus dans un texte
 */
export function countUnresolvedPlaceholders(text: string): number {
    const matches = text.match(/\{[^}]+\}/g);
    return matches ? matches.length : 0;
}

// ========================================
// RÉSOLUTION DES VARIABLES GLOBALES
// ========================================

/**
 * Configuration des données globales pour la résolution des variables
 */
export interface GlobalVariablesContext {
    /** Contrat/informations du syndic */
    contratSyndic?: ContratSyndic;
    /** Nom de la copropriété */
    nomCopropriete?: string;
    /** Adresse de la copropriété */
    adresseCopropriete?: string;
    /** Modalité de paiement du budget */
    modalitePaiementBudget?: ModalitePaiement | string;
    /** Modalité de paiement du fonds travaux */
    modalitePaiementFonds?: ModalitePaiement | string;
    /** Exercice en cours (année) */
    exercice?: number | string;
}

/**
 * Résout les variables globales (syndic, copropriété, finance)
 * depuis le contexte et retourne un Record de valeurs
 *
 * CORRECTION PRINCIPALE:
 * - {nom_syndic} : Retourne nomSyndic ou cabinetNom du ContratSyndic
 * - {modalite_paiement_fonds} : Retourne le libellé de la modalité
 */
export function resolveGlobalVariables(context: GlobalVariablesContext): Record<string, string> {
    const resolved: Record<string, string> = {};

    // ========================================
    // SYNDIC - CORRECTION
    // ========================================
    if (context.contratSyndic) {
        const syndic = context.contratSyndic;

        // nom_syndic : raison sociale (cabinetNom ou nomSyndic)
        // NE PAS RETOURNER LA LISTE DES COPROPRIÉTAIRES
        resolved['nom_syndic'] = syndic.cabinetNom || syndic.nomSyndic || '';
        resolved['telephone_syndic'] = syndic.telephone || '';
        resolved['email_syndic'] = syndic.email || '';
        resolved['adresse_syndic'] = syndic.adresse || '';
    }

    // ========================================
    // COPROPRIÉTÉ
    // ========================================
    if (context.nomCopropriete) {
        resolved['nom_copropriete'] = context.nomCopropriete;
    }
    if (context.adresseCopropriete) {
        resolved['adresse_copropriete'] = context.adresseCopropriete;
    }

    // ========================================
    // MODALITÉS DE PAIEMENT - CORRECTION
    // ========================================
    if (context.modalitePaiementBudget) {
        resolved['modalites_paiement_budget'] = getModaliteLabel(context.modalitePaiementBudget);

        // Générer les dates d'échéance si exercice fourni
        if (context.exercice) {
            resolved['dates_echeances_budget'] = generateEcheancesForModalite(
                context.modalitePaiementBudget,
                context.exercice
            );
        }
    }

    if (context.modalitePaiementFonds) {
        resolved['modalites_paiement_fonds'] = getModaliteLabel(context.modalitePaiementFonds);
        resolved['modalite_paiement_fonds'] = getModaliteLabel(context.modalitePaiementFonds);

        // Générer les dates d'échéance si exercice fourni
        if (context.exercice) {
            resolved['dates_echeances_fonds'] = generateEcheancesForModalite(
                context.modalitePaiementFonds,
                context.exercice
            );
        }
    }

    // ========================================
    // DATES
    // ========================================
    resolved['date_du_jour'] = formatDateLong(new Date());
    resolved['annee_en_cours'] = new Date().getFullYear().toString();

    if (context.exercice) {
        const annee = typeof context.exercice === 'string'
            ? parseInt(context.exercice)
            : context.exercice;
        resolved['exercice_debut'] = `1er janvier ${annee}`;
        resolved['exercice_fin'] = `31 décembre ${annee}`;
    }

    return resolved;
}

/**
 * Résout le texte d'une résolution en utilisant à la fois les variables
 * spécifiques de la résolution ET les variables globales
 */
export function resolveResolutionTextWithGlobals(
    texte: string,
    resolutionVariables?: Record<string, string>,
    globalContext?: GlobalVariablesContext,
    showBracketsForEmpty: boolean = true
): string {
    if (!texte) return '';

    // Combiner les variables globales et les variables spécifiques
    const globalVars = globalContext ? resolveGlobalVariables(globalContext) : {};
    const allVariables = {
        ...globalVars,
        ...(resolutionVariables || {}) // Les variables spécifiques ont la priorité
    };

    if (Object.keys(allVariables).length === 0) {
        if (showBracketsForEmpty) {
            return texte.replace(/\{([^}]+)\}/g, '[$1]');
        }
        return texte;
    }

    // Remplacer les variables
    let result = baseReplaceVariables(texte, allVariables);

    // Remplacer les placeholders restants par des crochets
    if (showBracketsForEmpty) {
        result = result.replace(/\{([^}]+)\}/g, '[$1]');
    }

    return result;
}

// ========================================
// FONCTIONS UTILITAIRES
// ========================================

/**
 * Obtient le libellé d'une modalité de paiement
 */
function getModaliteLabel(modalite: ModalitePaiement | string): string {
    // Si c'est déjà une clé connue
    if (modalite in LIBELLES_MODALITE_PAIEMENT) {
        return LIBELLES_MODALITE_PAIEMENT[modalite as ModalitePaiement];
    }

    // Mapping pour les valeurs legacy (majuscules, etc.)
    const normalized = modalite.toLowerCase();
    const mapping: Record<string, string> = {
        'mensuel': 'Mensuel',
        'bimestriel': 'Bimestriel',
        'trimestriel': 'Trimestriel',
        'semestriel': 'Semestriel',
        'annuel': 'Annuel',
        'au_choix_syndic': 'Au choix du syndic',
        'personnalise': 'Personnalisé',
    };

    return mapping[normalized] || modalite;
}

/**
 * Génère les dates d'échéance selon la modalité
 */
function generateEcheancesForModalite(modalite: string, exercice: number | string): string {
    const annee = typeof exercice === 'string' ? parseInt(exercice) : exercice;
    const normalized = modalite.toLowerCase();

    switch (normalized) {
        case 'trimestriel':
            return `1er janvier ${annee}, 1er avril ${annee}, 1er juillet ${annee}, 1er octobre ${annee}`;
        case 'semestriel':
            return `1er janvier ${annee}, 1er juillet ${annee}`;
        case 'mensuel':
            return `Le 1er de chaque mois de janvier à décembre ${annee}`;
        case 'annuel':
            return `1er janvier ${annee}`;
        case 'au_choix_syndic':
            return 'Selon décision du syndic';
        default:
            return '';
    }
}

/**
 * Formate une date en format long français
 */
function formatDateLong(date: Date): string {
    try {
        return new Intl.DateTimeFormat('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }).format(date);
    } catch {
        return '';
    }
}
