/**
 * Utilitaires pour la gestion des variables de résolutions AG
 *
 * Ce module gère :
 * 1. Les namespaces uniques par résolution (évite les collisions)
 * 2. Les données partagées entre résolutions (dates d'exercice, budget, etc.)
 */

// Types pour les données partagées
export interface DonneesPartagees {
    // Dates d'exercice
    exercice: {
        annee: string;
        dateDebut: string;
        dateFin: string;
    };
    // Budget prévisionnel
    budget: {
        montantTotal: string;
        fondsALUR: string;
        pourcentageALUR: string;
    };
    // Syndic
    syndic: {
        nom: string;
        honoraires: string;
        dureeMandat: string;
    };
}

// Données partagées par défaut
export const DEFAULT_DONNEES_PARTAGEES: DonneesPartagees = {
    exercice: {
        annee: (new Date().getFullYear() + 1).toString(),
        dateDebut: '',
        dateFin: ''
    },
    budget: {
        montantTotal: '',
        fondsALUR: '',
        pourcentageALUR: '5'
    },
    syndic: {
        nom: '',
        honoraires: '',
        dureeMandat: '1'
    }
};

/**
 * Génère une clé unique pour une variable dans une résolution donnée
 * Format: {nomVariable}_{resolutionId}
 *
 * @param variableName - Nom de la variable (ex: "montant", "date_debut")
 * @param resolutionId - ID unique de la résolution (ex: "res-123", "fin-05")
 * @returns Clé unique (ex: "montant_res-123")
 */
export function getVariableKey(variableName: string, resolutionId: string): string {
    return `${variableName}_${resolutionId}`;
}

/**
 * Extrait le nom de variable original depuis une clé unique
 *
 * @param variableKey - Clé unique (ex: "montant_res-123")
 * @param resolutionId - ID de la résolution
 * @returns Nom de variable original (ex: "montant")
 */
export function extractVariableName(variableKey: string, resolutionId: string): string {
    const suffix = `_${resolutionId}`;
    if (variableKey.endsWith(suffix)) {
        return variableKey.slice(0, -suffix.length);
    }
    return variableKey;
}

/**
 * Vérifie si une variable est une donnée partagée (et non spécifique à une résolution)
 * Les données partagées incluent: dates d'exercice, montant budget, fonds ALUR, etc.
 */
export function isSharedVariable(variableName: string): boolean {
    const sharedVariables = [
        'date_debut_exercice',
        'date_fin_exercice',
        'annee_exercice',
        'montant_budget_total',
        'montant_fonds_alur',
        'pourcentage_alur',
        'nom_syndic_actuel',
        'honoraires_syndic'
    ];
    return sharedVariables.includes(variableName.toLowerCase());
}

/**
 * Sauvegarde les données partagées dans localStorage
 */
export function saveDonneesPartagees(agId: string, donnees: DonneesPartagees): void {
    localStorage.setItem(`ag-donnees-partagees-${agId}`, JSON.stringify(donnees));
}

/**
 * Charge les données partagées depuis localStorage
 */
export function loadDonneesPartagees(agId: string): DonneesPartagees {
    const saved = localStorage.getItem(`ag-donnees-partagees-${agId}`);
    if (saved) {
        try {
            return { ...DEFAULT_DONNEES_PARTAGEES, ...JSON.parse(saved) };
        } catch {
            return DEFAULT_DONNEES_PARTAGEES;
        }
    }
    return DEFAULT_DONNEES_PARTAGEES;
}

/**
 * Initialise les données partagées depuis les données de l'AG (budget, etc.)
 */
export function initDonneesPartageesFromAG(
    agId: string,
    agData: {
        budgetMontant?: string;
        budgetExercice?: string;
    }
): DonneesPartagees {
    const existing = loadDonneesPartagees(agId);
    const annee = agData.budgetExercice || existing.exercice.annee;

    const updated: DonneesPartagees = {
        ...existing,
        exercice: {
            annee,
            dateDebut: existing.exercice.dateDebut || `01/01/${annee}`,
            dateFin: existing.exercice.dateFin || `31/12/${annee}`
        },
        budget: {
            montantTotal: agData.budgetMontant || existing.budget.montantTotal,
            fondsALUR: existing.budget.fondsALUR || (agData.budgetMontant
                ? Math.round(parseFloat(agData.budgetMontant) * 0.05).toString()
                : ''),
            pourcentageALUR: existing.budget.pourcentageALUR || '5'
        }
    };

    saveDonneesPartagees(agId, updated);
    return updated;
}

/**
 * Migre les anciennes variables (globales) vers le nouveau système avec namespace
 * Utilisé pour la rétrocompatibilité
 */
export function migrateVariablesToNamespace(
    resolutions: Array<{ id: string; variables?: Record<string, string> }>,
    oldVariables: Record<string, string>
): Record<string, Record<string, string>> {
    const newVariables: Record<string, Record<string, string>> = {};

    resolutions.forEach(resolution => {
        if (resolution.variables) {
            newVariables[resolution.id] = {};
            Object.keys(resolution.variables).forEach(varName => {
                // Chercher d'abord dans l'ancienne structure globale
                const value = resolution.variables?.[varName] || oldVariables[varName] || '';
                newVariables[resolution.id][varName] = value;
            });
        }
    });

    return newVariables;
}

/**
 * Vérifie si une résolution est de type Information (sans vote)
 */
export function isResolutionInformation(resolution: {
    majorite?: string;
    isInformation?: boolean;
}): boolean {
    return resolution.isInformation === true || resolution.majorite === 'INFORMATION';
}

/**
 * Génère le texte d'une résolution avec les variables remplacées
 * Utilise les variables spécifiques à la résolution (namespace)
 */
export function replaceResolutionVariables(
    texte: string,
    variables: Record<string, string>
): string {
    let result = texte;
    Object.entries(variables).forEach(([key, value]) => {
        if (value) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
    });
    return result;
}
