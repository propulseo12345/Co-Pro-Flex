/**
 * Catalogue des variables disponibles pour les templates de PV
 *
 * Chaque variable est documentée avec:
 * - key: Clé unique utilisée dans le template
 * - label: Label affiché dans l'éditeur
 * - description: Description détaillée pour l'utilisateur
 * - category: Catégorie pour le groupement dans l'UI
 * - type: Type de la valeur pour le formatage
 * - example: Exemple de valeur
 * - required: Si la variable doit toujours avoir une valeur
 * - iterationContext: Si la variable n'est disponible que dans une boucle
 */

import type { IPVVariableDefinition, PVVariableCategory } from '@/types/models/pv-template';

// ═══════════════════════════════════════════════════════════════
// CATALOGUE DES VARIABLES
// ═══════════════════════════════════════════════════════════════

export const PV_VARIABLES_CATALOG: IPVVariableDefinition[] = [
    // ───────────────────────────────────────────────────────────
    // COPROPRIÉTÉ
    // ───────────────────────────────────────────────────────────
    {
        key: 'copro.nom',
        label: 'Nom de la copropriété',
        description: 'Nom officiel de la copropriété',
        category: 'copropriete',
        type: 'string',
        example: 'Résidence Les Jardins de Provence',
        required: true,
    },
    {
        key: 'copro.adresse',
        label: 'Adresse complète',
        description: 'Adresse complète de la copropriété',
        category: 'copropriete',
        type: 'string',
        example: '12 rue des Lilas, 75020 Paris',
        required: true,
    },
    {
        key: 'copro.adresse_rue',
        label: 'Rue',
        description: 'Numéro et nom de la rue',
        category: 'copropriete',
        type: 'string',
        example: '12 rue des Lilas',
        required: true,
    },
    {
        key: 'copro.code_postal',
        label: 'Code postal',
        description: 'Code postal de la copropriété',
        category: 'copropriete',
        type: 'string',
        example: '75020',
        required: true,
    },
    {
        key: 'copro.ville',
        label: 'Ville',
        description: 'Ville de la copropriété',
        category: 'copropriete',
        type: 'string',
        example: 'Paris',
        required: true,
    },
    {
        key: 'copro.siret',
        label: 'SIRET',
        description: 'Numéro SIRET du syndicat des copropriétaires',
        category: 'copropriete',
        type: 'string',
        example: '123 456 789 00012',
        required: false,
    },
    {
        key: 'copro.nombre_lots',
        label: 'Nombre de lots',
        description: 'Nombre total de lots dans la copropriété',
        category: 'copropriete',
        type: 'number',
        example: '42',
        required: true,
    },
    {
        key: 'copro.total_tantiemes',
        label: 'Total des tantièmes',
        description: 'Total des tantièmes de la copropriété',
        category: 'copropriete',
        type: 'number',
        example: '10000',
        required: true,
    },

    // ───────────────────────────────────────────────────────────
    // AG - INFORMATIONS GÉNÉRALES
    // ───────────────────────────────────────────────────────────
    {
        key: 'ag.type',
        label: 'Type d\'AG',
        description: 'Type de l\'assemblée générale (Ordinaire, Extraordinaire, Mixte)',
        category: 'ag',
        type: 'string',
        example: 'Ordinaire',
        required: true,
    },
    {
        key: 'ag.date',
        label: 'Date de l\'AG',
        description: 'Date de tenue de l\'assemblée générale',
        category: 'ag',
        type: 'date',
        example: '15 mars 2025',
        required: true,
    },
    {
        key: 'ag.date_courte',
        label: 'Date courte',
        description: 'Date au format court (JJ/MM/AAAA)',
        category: 'ag',
        type: 'date',
        example: '15/03/2025',
        required: true,
    },
    {
        key: 'ag.heure_debut',
        label: 'Heure de début',
        description: 'Heure de début de l\'AG',
        category: 'ag',
        type: 'string',
        example: '18h30',
        required: true,
    },
    {
        key: 'ag.heure_fin',
        label: 'Heure de fin',
        description: 'Heure de clôture de l\'AG',
        category: 'ag',
        type: 'string',
        example: '21h15',
        required: false,
    },
    {
        key: 'ag.lieu',
        label: 'Lieu',
        description: 'Lieu de tenue de l\'AG',
        category: 'ag',
        type: 'string',
        example: 'Salle des fêtes, 5 avenue du Général',
        required: true,
    },
    {
        key: 'ag.exercice',
        label: 'Exercice comptable',
        description: 'Exercice comptable concerné',
        category: 'ag',
        type: 'string',
        example: '2024',
        required: false,
    },

    // ───────────────────────────────────────────────────────────
    // STATISTIQUES
    // ───────────────────────────────────────────────────────────
    {
        key: 'stats.total_coproprietaires',
        label: 'Total copropriétaires',
        description: 'Nombre total de copropriétaires',
        category: 'stats',
        type: 'number',
        example: '28',
        required: true,
    },
    {
        key: 'stats.presents_count',
        label: 'Nombre de présents',
        description: 'Nombre de copropriétaires présents',
        category: 'stats',
        type: 'number',
        example: '15',
        required: true,
    },
    {
        key: 'stats.representes_count',
        label: 'Nombre de représentés',
        description: 'Nombre de copropriétaires représentés (pouvoir)',
        category: 'stats',
        type: 'number',
        example: '8',
        required: true,
    },
    {
        key: 'stats.absents_count',
        label: 'Nombre d\'absents',
        description: 'Nombre de copropriétaires absents',
        category: 'stats',
        type: 'number',
        example: '5',
        required: true,
    },
    {
        key: 'stats.tantiemes_presents',
        label: 'Tantièmes présents',
        description: 'Total des tantièmes des copropriétaires présents',
        category: 'stats',
        type: 'number',
        example: '4500',
        required: true,
    },
    {
        key: 'stats.tantiemes_representes',
        label: 'Tantièmes représentés',
        description: 'Total des tantièmes des copropriétaires représentés',
        category: 'stats',
        type: 'number',
        example: '2800',
        required: true,
    },
    {
        key: 'stats.tantiemes_total_presents',
        label: 'Tantièmes totaux (présents + représentés)',
        description: 'Total des tantièmes présents et représentés',
        category: 'stats',
        type: 'number',
        example: '7300',
        required: true,
    },
    {
        key: 'stats.quorum_pourcentage',
        label: 'Quorum (%)',
        description: 'Pourcentage de quorum atteint',
        category: 'stats',
        type: 'percentage',
        example: '73%',
        required: true,
    },
    {
        key: 'stats.quorum_atteint',
        label: 'Quorum atteint',
        description: 'Indique si le quorum est atteint (Oui/Non)',
        category: 'stats',
        type: 'boolean',
        example: 'Oui',
        required: true,
    },

    // ───────────────────────────────────────────────────────────
    // BUREAU
    // ───────────────────────────────────────────────────────────
    {
        key: 'bureau.president_nom',
        label: 'Nom du président',
        description: 'Nom du président de séance',
        category: 'bureau',
        type: 'string',
        example: 'M. Jean DUPONT',
        required: false,
    },
    {
        key: 'bureau.president_qualite',
        label: 'Qualité du président',
        description: 'Qualité du président (copropriétaire, syndic...)',
        category: 'bureau',
        type: 'string',
        example: 'Copropriétaire',
        required: false,
    },
    {
        key: 'bureau.secretaire_nom',
        label: 'Nom du secrétaire',
        description: 'Nom du secrétaire de séance',
        category: 'bureau',
        type: 'string',
        example: 'Mme Marie MARTIN',
        required: false,
    },
    {
        key: 'bureau.secretaire_qualite',
        label: 'Qualité du secrétaire',
        description: 'Qualité du secrétaire',
        category: 'bureau',
        type: 'string',
        example: 'Représentant du syndic',
        required: false,
    },
    {
        key: 'bureau.scrutateurs',
        label: 'Liste des scrutateurs',
        description: 'Liste des scrutateurs désignés',
        category: 'bureau',
        type: 'list',
        example: 'M. Pierre DURAND, Mme Sophie LEFEBVRE',
        required: false,
    },

    // ───────────────────────────────────────────────────────────
    // SYNDIC
    // ───────────────────────────────────────────────────────────
    {
        key: 'syndic.nom',
        label: 'Nom du syndic',
        description: 'Nom ou raison sociale du syndic',
        category: 'syndic',
        type: 'string',
        example: 'Cabinet Immobilier Parisien',
        required: false,
    },
    {
        key: 'syndic.adresse',
        label: 'Adresse du syndic',
        description: 'Adresse du cabinet de syndic',
        category: 'syndic',
        type: 'string',
        example: '25 boulevard Haussmann, 75009 Paris',
        required: false,
    },
    {
        key: 'syndic.representant',
        label: 'Représentant du syndic',
        description: 'Nom du représentant du syndic présent',
        category: 'syndic',
        type: 'string',
        example: 'M. François BERNARD',
        required: false,
    },

    // ───────────────────────────────────────────────────────────
    // DATES FORMATÉES
    // ───────────────────────────────────────────────────────────
    {
        key: 'date.aujourdhui',
        label: 'Date du jour',
        description: 'Date de génération du PV',
        category: 'date',
        type: 'date',
        example: '20 mars 2025',
        required: true,
    },
    {
        key: 'date.aujourdhui_courte',
        label: 'Date du jour (courte)',
        description: 'Date de génération au format court',
        category: 'date',
        type: 'date',
        example: '20/03/2025',
        required: true,
    },

    // ───────────────────────────────────────────────────────────
    // VARIABLES DE RÉSOLUTION (dans boucle {{#resolutions}})
    // ───────────────────────────────────────────────────────────
    {
        key: 'resolution.numero',
        label: 'Numéro de résolution',
        description: 'Numéro de la résolution en cours',
        category: 'resolution',
        type: 'number',
        example: '1',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'resolution.titre',
        label: 'Titre de la résolution',
        description: 'Titre complet de la résolution',
        category: 'resolution',
        type: 'string',
        example: 'Approbation des comptes de l\'exercice 2024',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'resolution.description',
        label: 'Description de la résolution',
        description: 'Description détaillée de la résolution',
        category: 'resolution',
        type: 'string',
        example: 'L\'assemblée générale est appelée à approuver...',
        required: false,
        iterationContext: 'resolutions',
    },
    {
        key: 'resolution.majorite',
        label: 'Majorité requise',
        description: 'Type de majorité requise pour cette résolution',
        category: 'resolution',
        type: 'string',
        example: 'Article 24',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'resolution.seuil_requis',
        label: 'Seuil requis',
        description: 'Nombre de tantièmes requis pour adoption',
        category: 'resolution',
        type: 'number',
        example: '5001',
        required: true,
        iterationContext: 'resolutions',
    },

    // ───────────────────────────────────────────────────────────
    // VARIABLES DE VOTE (dans boucle {{#resolutions}})
    // ───────────────────────────────────────────────────────────
    {
        key: 'vote.pour',
        label: 'Tantièmes POUR',
        description: 'Total des tantièmes votant POUR',
        category: 'vote',
        type: 'number',
        example: '6200',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'vote.contre',
        label: 'Tantièmes CONTRE',
        description: 'Total des tantièmes votant CONTRE',
        category: 'vote',
        type: 'number',
        example: '800',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'vote.abstention',
        label: 'Tantièmes ABSTENTION',
        description: 'Total des tantièmes s\'abstenant',
        category: 'vote',
        type: 'number',
        example: '300',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'vote.pourcentage_pour',
        label: 'Pourcentage POUR',
        description: 'Pourcentage de votes favorables',
        category: 'vote',
        type: 'percentage',
        example: '84,93%',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'vote.resultat',
        label: 'Résultat du vote',
        description: 'Résultat: ADOPTÉE, REJETÉE ou AJOURNÉE',
        category: 'vote',
        type: 'string',
        example: 'ADOPTÉE',
        required: true,
        iterationContext: 'resolutions',
    },
    {
        key: 'vote.passerelle',
        label: 'Passerelle utilisée',
        description: 'Indique si la passerelle a été utilisée',
        category: 'vote',
        type: 'boolean',
        example: 'Non',
        required: false,
        iterationContext: 'resolutions',
    },
    {
        key: 'vote.commentaires',
        label: 'Commentaires',
        description: 'Commentaires éventuels sur le vote',
        category: 'vote',
        type: 'string',
        example: '',
        required: false,
        iterationContext: 'resolutions',
    },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Récupère les variables par catégorie
 */
export function getVariablesByCategory(category: PVVariableCategory): IPVVariableDefinition[] {
    return PV_VARIABLES_CATALOG.filter(v => v.category === category);
}

/**
 * Récupère une variable par sa clé
 */
export function getVariableByKey(key: string): IPVVariableDefinition | undefined {
    return PV_VARIABLES_CATALOG.find(v => v.key === key);
}

/**
 * Récupère toutes les catégories avec leurs labels
 */
export const PV_VARIABLE_CATEGORIES: Record<PVVariableCategory, string> = {
    copropriete: 'Copropriété',
    ag: 'Assemblée Générale',
    stats: 'Statistiques',
    resolution: 'Résolution (dans boucle)',
    vote: 'Vote (dans boucle)',
    bureau: 'Bureau',
    syndic: 'Syndic',
    date: 'Dates',
    custom: 'Personnalisées',
};

/**
 * Récupère les variables globales (hors boucle)
 */
export function getGlobalVariables(): IPVVariableDefinition[] {
    return PV_VARIABLES_CATALOG.filter(v => !v.iterationContext);
}

/**
 * Récupère les variables de boucle
 */
export function getIterationVariables(context: string): IPVVariableDefinition[] {
    return PV_VARIABLES_CATALOG.filter(v => v.iterationContext === context);
}

/**
 * Valide qu'une variable existe dans le catalogue
 */
export function isValidVariable(key: string): boolean {
    return PV_VARIABLES_CATALOG.some(v => v.key === key);
}

/**
 * Extrait les variables utilisées dans un texte
 * Format supporté: {{variable.key}} ou {variable.key}
 */
export function extractVariablesFromText(text: string): string[] {
    const regex = /\{\{?([a-z_]+\.[a-z_]+)\}?\}/gi;
    const matches = text.matchAll(regex);
    const variables = new Set<string>();

    for (const match of matches) {
        variables.add(match[1]);
    }

    return Array.from(variables);
}

/**
 * Valide un template et retourne les erreurs
 */
export function validateTemplateVariables(text: string): {
    valid: boolean;
    errors: Array<{ variable: string; message: string }>;
    warnings: Array<{ variable: string; message: string }>;
} {
    const usedVariables = extractVariablesFromText(text);
    const errors: Array<{ variable: string; message: string }> = [];
    const warnings: Array<{ variable: string; message: string }> = [];

    for (const varKey of usedVariables) {
        const definition = getVariableByKey(varKey);

        if (!definition) {
            errors.push({
                variable: varKey,
                message: `Variable inconnue: ${varKey}`,
            });
        } else if (definition.iterationContext) {
            // Vérifier que la variable est utilisée dans le bon contexte
            // (Cette vérification serait plus complète avec analyse du contexte)
            warnings.push({
                variable: varKey,
                message: `Variable "${varKey}" doit être utilisée dans une boucle {{#${definition.iterationContext}}}`,
            });
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}
