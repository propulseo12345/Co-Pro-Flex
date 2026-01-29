/**
 * Configuration du workflow AG avec support des modes Guidé et Expert
 *
 * Le mode Guidé affiche les 7 étapes séquentiellement
 * Le mode Expert regroupe les étapes en 4 groupes pour une navigation plus rapide
 */

import {
    Calendar,
    FileText,
    Send,
    ClipboardList,
    Users,
    FileCheck,
    Settings,
    CheckCircle,
    type LucideIcon
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES POUR LES PRÉREQUIS MÉTIER
// ═══════════════════════════════════════════════════════════════

export interface AGStepPrerequisitesContext {
    agId: string;
    agExists: boolean;
    hasResolutions: boolean;
    resolutionsCount: number;
    hasSentConvocations: boolean;
    hasPresences: boolean;
    sessionStarted: boolean;
    sessionCompleted: boolean;
}

export interface StepPrerequisiteResult {
    isAccessible: boolean;
    reason?: string;
    redirectTo?: string;
    redirectStepId?: string;
}

export type StepPrerequisiteValidator = (ctx: AGStepPrerequisitesContext) => StepPrerequisiteResult;

// Types pour le workflow
export type WorkflowMode = 'guided' | 'expert';

export type StepStatus =
    | 'locked'        // Non accessible (prérequis non remplis)
    | 'available'     // Accessible mais non commencée
    | 'in_progress'   // En cours
    | 'completed'     // Terminée
    | 'skipped';      // Ignorée (optionnelle)

export type ExpertGroupId = 'preparation' | 'convocation' | 'session' | 'cloture';

export interface WorkflowStep {
    id: string;
    numero: number;
    titre: string;
    titre_court: string;
    description: string;
    icon: LucideIcon;
    path: string;

    // Configuration
    obligatoire: boolean;
    prerequis: string[];
    temps_estime_minutes: number;

    // Mode expert: groupe parent
    groupe_expert: ExpertGroupId;
}

export interface ExpertGroup {
    id: ExpertGroupId;
    titre: string;
    description: string;
    steps: string[];
    icon: LucideIcon;
}

/**
 * Définition des 7 étapes du workflow AG
 */
export const AG_WORKFLOW_STEPS: WorkflowStep[] = [
    // ═══════════════════════════════════════════════════════════════
    // GROUPE 1 : PRÉPARATION
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'planification',
        numero: 1,
        titre: 'Planification de l\'AG',
        titre_court: 'Planifier',
        description: 'Définir la date, le lieu et le type d\'AG',
        icon: Calendar,
        path: 'preparation',
        obligatoire: true,
        prerequis: [],
        temps_estime_minutes: 5,
        groupe_expert: 'preparation',
    },
    {
        id: 'ordre_du_jour',
        numero: 2,
        titre: 'Ordre du jour',
        titre_court: 'Résolutions',
        description: 'Définir les résolutions à voter',
        icon: FileText,
        path: 'agenda',
        obligatoire: true,
        prerequis: ['planification'],
        temps_estime_minutes: 15,
        groupe_expert: 'preparation',
    },

    // ═══════════════════════════════════════════════════════════════
    // GROUPE 2 : CONVOCATION
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'convocation',
        numero: 3,
        titre: 'Préparation des convocations',
        titre_court: 'Convocation',
        description: 'Générer les documents de convocation',
        icon: ClipboardList,
        path: 'convocation',
        obligatoire: true,
        prerequis: ['ordre_du_jour'],
        temps_estime_minutes: 10,
        groupe_expert: 'convocation',
    },
    {
        id: 'envoi',
        numero: 4,
        titre: 'Envoi des convocations',
        titre_court: 'Envoi',
        description: 'Envoyer les convocations aux copropriétaires',
        icon: Send,
        path: 'envoi',
        obligatoire: true,
        prerequis: ['convocation'],
        temps_estime_minutes: 5,
        groupe_expert: 'convocation',
    },

    // ═══════════════════════════════════════════════════════════════
    // GROUPE 3 : SESSION
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'votes_correspondance',
        numero: 5,
        titre: 'Votes par correspondance',
        titre_court: 'Votes',
        description: 'Enregistrer les votes reçus avant l\'AG',
        icon: ClipboardList,
        path: 'preparation',
        obligatoire: false, // Optionnel
        prerequis: ['envoi'],
        temps_estime_minutes: 10,
        groupe_expert: 'session',
    },
    {
        id: 'session_ag',
        numero: 6,
        titre: 'Tenue de l\'AG',
        titre_court: 'Session',
        description: 'Gérer la session le jour J',
        icon: Users,
        path: 'session',
        obligatoire: true,
        prerequis: ['envoi'],
        temps_estime_minutes: 60,
        groupe_expert: 'session',
    },

    // ═══════════════════════════════════════════════════════════════
    // GROUPE 4 : CLÔTURE
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'proces_verbal',
        numero: 7,
        titre: 'Procès-verbal',
        titre_court: 'PV',
        description: 'Rédiger et diffuser le PV',
        icon: FileCheck,
        path: 'pv',
        obligatoire: true,
        prerequis: ['session_ag'],
        temps_estime_minutes: 20,
        groupe_expert: 'cloture',
    },
];

/**
 * Groupes pour le mode expert
 */
export const EXPERT_GROUPS: Record<ExpertGroupId, ExpertGroup> = {
    preparation: {
        id: 'preparation',
        titre: 'Préparation',
        description: 'Planification et ordre du jour',
        steps: ['planification', 'ordre_du_jour'],
        icon: Settings,
    },
    convocation: {
        id: 'convocation',
        titre: 'Convocation',
        description: 'Génération et envoi',
        steps: ['convocation', 'envoi'],
        icon: Send,
    },
    session: {
        id: 'session',
        titre: 'Session',
        description: 'Votes et tenue de l\'AG',
        steps: ['votes_correspondance', 'session_ag'],
        icon: Users,
    },
    cloture: {
        id: 'cloture',
        titre: 'Clôture',
        description: 'Procès-verbal',
        steps: ['proces_verbal'],
        icon: CheckCircle,
    },
};

/**
 * Ordre des groupes experts
 */
export const EXPERT_GROUPS_ORDER: ExpertGroupId[] = ['preparation', 'convocation', 'session', 'cloture'];

/**
 * Obtenir une étape par son ID
 */
export function getStepById(stepId: string): WorkflowStep | undefined {
    return AG_WORKFLOW_STEPS.find(s => s.id === stepId);
}

/**
 * Obtenir une étape par son numéro
 */
export function getStepByNumber(numero: number): WorkflowStep | undefined {
    return AG_WORKFLOW_STEPS.find(s => s.numero === numero);
}

/**
 * Obtenir l'ID d'étape à partir d'un chemin de route
 */
export function getStepIdFromPath(path: string): string | undefined {
    const step = AG_WORKFLOW_STEPS.find(s => s.path === path);
    return step?.id;
}

/**
 * Calculer le temps total estimé pour toutes les étapes
 */
export function calculateTotalTime(): number {
    return AG_WORKFLOW_STEPS.reduce((acc, step) => acc + step.temps_estime_minutes, 0);
}

/**
 * Calculer le temps restant basé sur les étapes non complétées
 */
export function calculateRemainingTime(completedStepIds: string[]): number {
    return AG_WORKFLOW_STEPS
        .filter(s => !completedStepIds.includes(s.id))
        .reduce((acc, step) => acc + step.temps_estime_minutes, 0);
}

/**
 * Obtenir les étapes obligatoires
 */
export function getRequiredSteps(): WorkflowStep[] {
    return AG_WORKFLOW_STEPS.filter(s => s.obligatoire);
}

/**
 * Obtenir les étapes optionnelles
 */
export function getOptionalSteps(): WorkflowStep[] {
    return AG_WORKFLOW_STEPS.filter(s => !s.obligatoire);
}

/**
 * Vérifier si une étape peut être accédée
 * basé sur les étapes complétées ou les données existantes
 */
export function canAccessStep(stepId: string, completedStepIds: string[]): boolean {
    const step = getStepById(stepId);
    if (!step) return false;

    // Pas de prérequis = toujours accessible
    if (step.prerequis.length === 0) return true;

    // Vérifier que tous les prérequis sont complétés
    return step.prerequis.every(prereqId => completedStepIds.includes(prereqId));
}

/**
 * Vérifier si une étape a des données sauvegardées (pour navigation libre)
 * Vérifie aussi les prérequis métier pour éviter l'accès à des étapes
 * dont les dépendances ne sont pas satisfaites
 */
export function hasStepData(stepId: string, agId: string): boolean {
    if (typeof window === 'undefined' || !agId) return false;

    const step = getStepById(stepId);
    if (!step) return false;

    // Construire le contexte des prérequis
    const context = buildPrerequisitesContext(agId);

    // Vérifier les prérequis métier (bloque l'accès si non satisfaits)
    const validation = validateStepBusinessPrerequisites(stepId, context);
    if (!validation.isAccessible) {
        return false;
    }

    // Si l'AG n'existe pas, pas d'accès (sauf planification)
    if (!context.agExists && stepId !== 'planification') {
        return false;
    }

    // Vérifier si des données spécifiques existent pour cette étape
    switch (stepId) {
        case 'planification':
            return true; // Toujours accessible
        case 'ordre_du_jour':
            // Accessible si l'AG existe (les résolutions peuvent être vides au début)
            return context.agExists;
        case 'convocation':
            // Accessible si les résolutions existent (validé par le prérequis métier)
            return context.hasResolutions;
        case 'envoi':
            // Accessible si les résolutions existent
            return context.hasResolutions;
        case 'votes_correspondance':
            // Accessible si les résolutions existent (optionnel mais nécessite des résolutions)
            return context.hasResolutions;
        case 'session_ag':
            // Accessible si les résolutions existent
            return context.hasResolutions;
        case 'proces_verbal':
            // Accessible si les résolutions existent
            return context.hasResolutions;
        default:
            return context.agExists;
    }
}

/**
 * Obtenir la prochaine étape disponible après une étape donnée
 */
export function getNextAvailableStep(currentStepId: string, completedStepIds: string[]): WorkflowStep | undefined {
    const currentStep = getStepById(currentStepId);
    if (!currentStep) return undefined;

    // Chercher la prochaine étape accessible
    return AG_WORKFLOW_STEPS
        .filter(s => s.numero > currentStep.numero)
        .find(s => canAccessStep(s.id, completedStepIds));
}

/**
 * Obtenir l'étape précédente
 */
export function getPreviousStep(currentStepId: string): WorkflowStep | undefined {
    const currentStep = getStepById(currentStepId);
    if (!currentStep || currentStep.numero === 1) return undefined;

    return getStepByNumber(currentStep.numero - 1);
}

/**
 * Calculer le pourcentage de progression
 * Ne compte que les étapes obligatoires
 */
export function calculateProgressPercentage(completedStepIds: string[]): number {
    const requiredSteps = getRequiredSteps();
    const completedRequiredSteps = requiredSteps.filter(s =>
        completedStepIds.includes(s.id)
    );

    if (requiredSteps.length === 0) return 100;
    return Math.round((completedRequiredSteps.length / requiredSteps.length) * 100);
}

/**
 * Constantes utiles
 */
export const TOTAL_STEPS = AG_WORKFLOW_STEPS.length;
export const TOTAL_REQUIRED_STEPS = getRequiredSteps().length;
export const TOTAL_OPTIONAL_STEPS = getOptionalSteps().length;
export const TOTAL_ESTIMATED_TIME = calculateTotalTime();

// ═══════════════════════════════════════════════════════════════
// VALIDATEURS DE PRÉREQUIS MÉTIER
// ═══════════════════════════════════════════════════════════════

/**
 * Validateurs métier pour chaque étape
 * Ces validateurs vérifient les conditions métier (pas juste séquentielles)
 */
export const STEP_BUSINESS_VALIDATORS: Record<string, StepPrerequisiteValidator> = {
    planification: () => ({
        isAccessible: true,
    }),

    ordre_du_jour: (ctx) => {
        if (!ctx.agExists) {
            return {
                isAccessible: false,
                reason: 'Vous devez d\'abord créer l\'AG.',
                redirectTo: '/ag/new',
            };
        }
        return { isAccessible: true };
    },

    convocation: (ctx) => {
        if (!ctx.agExists) {
            return {
                isAccessible: false,
                reason: 'Vous devez d\'abord créer l\'AG.',
                redirectTo: '/ag/new',
            };
        }
        if (!ctx.hasResolutions) {
            return {
                isAccessible: false,
                reason: 'Vous devez définir au moins une résolution à l\'ordre du jour.',
                redirectStepId: 'ordre_du_jour',
            };
        }
        return { isAccessible: true };
    },

    envoi: (ctx) => {
        if (!ctx.agExists) {
            return {
                isAccessible: false,
                reason: 'Vous devez d\'abord créer l\'AG.',
                redirectTo: '/ag/new',
            };
        }
        if (!ctx.hasResolutions) {
            return {
                isAccessible: false,
                reason: 'Vous devez définir au moins une résolution à l\'ordre du jour.',
                redirectStepId: 'ordre_du_jour',
            };
        }
        return { isAccessible: true };
    },

    votes_correspondance: (ctx) => {
        if (!ctx.agExists) {
            return {
                isAccessible: false,
                reason: 'Vous devez d\'abord créer l\'AG.',
                redirectTo: '/ag/new',
            };
        }
        if (!ctx.hasResolutions) {
            return {
                isAccessible: false,
                reason: 'Vous devez définir au moins une résolution avant d\'accéder aux votes par correspondance.',
                redirectStepId: 'ordre_du_jour',
            };
        }
        return { isAccessible: true };
    },

    session_ag: (ctx) => {
        if (!ctx.agExists) {
            return {
                isAccessible: false,
                reason: 'Vous devez d\'abord créer l\'AG.',
                redirectTo: '/ag/new',
            };
        }
        if (!ctx.hasResolutions) {
            return {
                isAccessible: false,
                reason: 'Vous devez définir au moins une résolution à l\'ordre du jour.',
                redirectStepId: 'ordre_du_jour',
            };
        }
        return { isAccessible: true };
    },

    proces_verbal: (ctx) => {
        if (!ctx.agExists) {
            return {
                isAccessible: false,
                reason: 'Vous devez d\'abord créer l\'AG.',
                redirectTo: '/ag/new',
            };
        }
        if (!ctx.hasResolutions) {
            return {
                isAccessible: false,
                reason: 'Vous devez définir au moins une résolution à l\'ordre du jour.',
                redirectStepId: 'ordre_du_jour',
            };
        }
        return { isAccessible: true };
    },
};

/**
 * Valider l'accès à une étape selon les prérequis métier
 */
export function validateStepBusinessPrerequisites(
    stepId: string,
    context: AGStepPrerequisitesContext
): StepPrerequisiteResult {
    const validator = STEP_BUSINESS_VALIDATORS[stepId];
    if (!validator) {
        return { isAccessible: true };
    }
    return validator(context);
}

/**
 * Vérifie si un ID est un UUID valide (format Supabase)
 */
function isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

/**
 * Construire le contexte des prérequis
 *
 * NOTE: Cette fonction est utilisée pour la validation côté client.
 * Pour les AG Supabase (UUID valide), on assume que l'AG existe.
 * Les données réelles sont chargées depuis Supabase via useAgWizardState.
 *
 * IMPORTANT: Cette fonction ne devrait plus être utilisée directement.
 * Préférer useAgWizardState qui charge les données depuis Supabase.
 */
export function buildPrerequisitesContext(agId: string): AGStepPrerequisitesContext {
    // Pour les AG Supabase (UUID valide), on retourne un contexte permissif
    // car les vraies vérifications se font via useAgWizardState
    if (isValidUUID(agId)) {
        return {
            agId,
            agExists: true,
            hasResolutions: true, // Sera vérifié par useAgWizardState
            resolutionsCount: 0,
            hasSentConvocations: false,
            hasPresences: false,
            sessionStarted: false,
            sessionCompleted: false,
        };
    }

    // Pour les anciennes AG (non-UUID), retourner un contexte vide
    // Ces AG ne devraient plus exister en production
    return {
        agId,
        agExists: false,
        hasResolutions: false,
        resolutionsCount: 0,
        hasSentConvocations: false,
        hasPresences: false,
        sessionStarted: false,
        sessionCompleted: false,
    };
}

/**
 * Obtenir le message explicatif pour une étape bloquée
 */
export function getStepBlockedReason(
    stepId: string,
    context: AGStepPrerequisitesContext
): string | undefined {
    const result = validateStepBusinessPrerequisites(stepId, context);
    return result.isAccessible ? undefined : result.reason;
}

/**
 * Obtenir la route de redirection pour une étape bloquée
 */
export function getStepRedirectPath(
    stepId: string,
    context: AGStepPrerequisitesContext
): string | undefined {
    const result = validateStepBusinessPrerequisites(stepId, context);
    if (result.isAccessible) return undefined;

    if (result.redirectTo) {
        return result.redirectTo;
    }

    if (result.redirectStepId) {
        const redirectStep = getStepById(result.redirectStepId);
        if (redirectStep) {
            return `/ag/${context.agId}/${redirectStep.path}`;
        }
    }

    return undefined;
}
