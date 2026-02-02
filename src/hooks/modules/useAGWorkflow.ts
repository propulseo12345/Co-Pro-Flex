/**
 * Hook de gestion du workflow AG
 *
 * ARCHITECTURE PRODUCTION:
 * - Source unique de vérité : Supabase (via useAgWizardState)
 * - AUCUN localStorage pour les données métier
 * - Persistance automatique de l'état du wizard
 *
 * Gère le mode (Guidé/Expert), la navigation, et le suivi de progression
 */

'use client';

import { useMemo, useCallback } from 'react';
import {
    AG_WORKFLOW_STEPS,
    EXPERT_GROUPS,
    EXPERT_GROUPS_ORDER,
    type WorkflowMode,
    type StepStatus,
    type WorkflowStep,
    type ExpertGroupId,
    getStepById,
    getStepByNumber,
    getNextAvailableStep,
    getPreviousStep,
    calculateProgressPercentage,
    calculateRemainingTime,
} from '@/lib/constants/ag-workflow';
import { useAgWizardState } from './useAgWizardState';

export interface StepWithStatus extends WorkflowStep {
    status: StepStatus;
}

export interface ExpertGroupWithStatus {
    id: ExpertGroupId;
    titre: string;
    description: string;
    steps: StepWithStatus[];
    icon: typeof EXPERT_GROUPS[ExpertGroupId]['icon'];
    status: StepStatus;
    completedCount: number;
    totalCount: number;
}

export interface WorkflowProgress {
    total: number;
    completed: number;
    percentage: number;
    remainingTime: number;
}

export interface UseAGWorkflowReturn {
    // État
    mode: WorkflowMode;
    currentStepId: string;
    currentStep: StepWithStatus | undefined;
    steps: StepWithStatus[];
    expertGroups: ExpertGroupWithStatus[];
    progress: WorkflowProgress;
    lastSavedAt: string | null;
    completedSteps: string[];
    skippedSteps: string[];
    isLoading: boolean;

    // Actions
    setMode: (mode: WorkflowMode) => Promise<void>;
    goToStep: (stepId: string) => boolean;
    nextStep: () => void;
    prevStep: () => void;
    completeStep: (stepId: string) => Promise<void>;
    skipStep: (stepId: string) => Promise<boolean>;
    resetWorkflow: () => Promise<void>;

    // Utilitaires
    canNavigateTo: (stepId: string) => boolean;
    isStepAccessible: (stepId: string) => boolean;
    getStepStatus: (stepId: string) => StepStatus;
}

// Mapping numéro d'étape -> ID d'étape
const STEP_NUMBER_TO_ID: Record<number, string> = {
    1: 'planification',
    2: 'ordre_du_jour',
    3: 'convocation',
    4: 'envoi',
    5: 'votes_correspondance',
    6: 'session_ag',
    7: 'proces_verbal',
};

const STEP_ID_TO_NUMBER: Record<string, number> = {
    'planification': 1,
    'ordre_du_jour': 2,
    'convocation': 3,
    'envoi': 4,
    'votes_correspondance': 5,
    'session_ag': 6,
    'proces_verbal': 7,
};

/**
 * Hook pour gérer le workflow AG
 * Source de vérité : Supabase uniquement
 *
 * @param agId - ID de l'AG (obligatoire pour la persistance)
 * @param initialStepNumber - Numéro d'étape initial (1-7), ignoré si agId fourni (on utilise current_step de la DB)
 */
export function useAGWorkflow(
    agId?: string,
    initialStepNumber: number = 1
): UseAGWorkflowReturn {
    // Hook central pour l'état du wizard (Supabase)
    const wizard = useAgWizardState(agId || null);

    // Déterminer l'étape courante (depuis Supabase ou initialStepNumber)
    const currentStepNumber = useMemo(() => {
        if (agId && wizard.state) {
            return wizard.currentStep;
        }
        return initialStepNumber;
    }, [agId, wizard.state, wizard.currentStep, initialStepNumber]);

    // ID de l'étape courante
    const currentStepId = useMemo(() => {
        return STEP_NUMBER_TO_ID[currentStepNumber] || 'planification';
    }, [currentStepNumber]);

    // Extraire les étapes complétées depuis step_data
    const completedSteps = useMemo((): string[] => {
        if (!wizard.stepData) return [];
        return Object.entries(wizard.stepData)
            .filter(([, info]) => info.status === 'completed')
            .map(([stepNum]) => STEP_NUMBER_TO_ID[parseInt(stepNum)])
            .filter(Boolean);
    }, [wizard.stepData]);

    // Extraire les étapes ignorées depuis step_data
    const skippedSteps = useMemo((): string[] => {
        if (!wizard.stepData) return [];
        return Object.entries(wizard.stepData)
            .filter(([, info]) => info.status === 'skipped')
            .map(([stepNum]) => STEP_NUMBER_TO_ID[parseInt(stepNum)])
            .filter(Boolean);
    }, [wizard.stepData]);

    // Calculer le statut de chaque étape
    const getStepStatus = useCallback((stepId: string): StepStatus => {
        const stepNumber = STEP_ID_TO_NUMBER[stepId];
        if (!stepNumber) return 'locked';

        // Vérifier dans step_data
        const stepInfo = wizard.stepData[stepNumber.toString()];
        if (stepInfo?.status === 'completed') return 'completed';
        if (stepInfo?.status === 'skipped') return 'skipped';

        // Étape courante = in_progress
        if (stepId === currentStepId) return 'in_progress';

        // Vérifier l'accessibilité basée sur les données
        if (!wizard.state) return stepNumber === 1 ? 'available' : 'locked';

        const stats = wizard.stats;
        if (!stats) return stepNumber === 1 ? 'available' : 'locked';

        // Logique d'accessibilité basée sur les données existantes (8 étapes)
        switch (stepNumber) {
            case 1: return 'available';
            case 2: return 'available'; // Toujours accessible après étape 1
            case 3: return stats.resolutions_count > 0 ? 'available' : 'locked';
            case 4: return stats.resolutions_count > 0 ? 'available' : 'locked';
            case 5: return stats.resolutions_count > 0 ? 'available' : 'locked';
            case 6: return stats.resolutions_count > 0 ? 'available' : 'locked';
            case 7: return stats.resolutions_count > 0 ? 'available' : 'locked';
            case 8:
                const step7Info = wizard.stepData['7'];
                return step7Info?.status === 'completed' ? 'available' : 'locked';
            default: return 'locked';
        }
    }, [wizard.stepData, wizard.state, wizard.stats, currentStepId]);

    // Liste des étapes avec leur statut
    const steps = useMemo((): StepWithStatus[] => {
        return AG_WORKFLOW_STEPS.map(step => ({
            ...step,
            status: getStepStatus(step.id),
        }));
    }, [getStepStatus]);

    // Groupes experts avec statut
    const expertGroups = useMemo((): ExpertGroupWithStatus[] => {
        return EXPERT_GROUPS_ORDER.map(groupId => {
            const group = EXPERT_GROUPS[groupId];
            const groupSteps = steps.filter(s => group.steps.includes(s.id));

            const completedCount = groupSteps.filter(s =>
                s.status === 'completed' || s.status === 'skipped'
            ).length;

            const allCompleted = groupSteps.every(s =>
                s.status === 'completed' || s.status === 'skipped'
            );
            const anyInProgress = groupSteps.some(s => s.status === 'in_progress');
            const allLocked = groupSteps.every(s => s.status === 'locked');

            let status: StepStatus;
            if (allCompleted) {
                status = 'completed';
            } else if (anyInProgress) {
                status = 'in_progress';
            } else if (allLocked) {
                status = 'locked';
            } else {
                status = 'available';
            }

            return {
                id: groupId,
                titre: group.titre,
                description: group.description,
                steps: groupSteps,
                icon: group.icon,
                status,
                completedCount,
                totalCount: groupSteps.length,
            };
        });
    }, [steps]);

    // Progression
    const progress = useMemo((): WorkflowProgress => {
        return {
            total: AG_WORKFLOW_STEPS.length,
            completed: completedSteps.length,
            percentage: calculateProgressPercentage(completedSteps),
            remainingTime: calculateRemainingTime(completedSteps),
        };
    }, [completedSteps]);

    // Étape courante avec statut
    const currentStep = useMemo(() => {
        return steps.find(s => s.id === currentStepId);
    }, [steps, currentStepId]);

    // Vérifier si on peut naviguer vers une étape
    const canNavigateTo = useCallback((stepId: string): boolean => {
        const status = getStepStatus(stepId);
        return status !== 'locked';
    }, [getStepStatus]);

    // Vérifier si une étape est accessible
    const isStepAccessible = useCallback((stepId: string): boolean => {
        const status = getStepStatus(stepId);
        return status !== 'locked';
    }, [getStepStatus]);

    // Changer de mode (persiste dans Supabase)
    const setMode = useCallback(async (newMode: WorkflowMode) => {
        if (agId) {
            await wizard.setWizardMode(newMode);
        }
    }, [agId, wizard]);

    // Naviguer vers une étape (persiste dans Supabase)
    const goToStep = useCallback((stepId: string): boolean => {
        if (!canNavigateTo(stepId)) {
            return false;
        }

        const stepNumber = STEP_ID_TO_NUMBER[stepId];
        if (stepNumber && agId) {
            wizard.goToStep(stepNumber);
        }

        return true;
    }, [canNavigateTo, agId, wizard]);

    // Aller à l'étape suivante
    const nextStep = useCallback(() => {
        const next = getNextAvailableStep(currentStepId, completedSteps);
        if (next) {
            goToStep(next.id);
        }
    }, [currentStepId, completedSteps, goToStep]);

    // Aller à l'étape précédente
    const prevStep = useCallback(() => {
        const prev = getPreviousStep(currentStepId);
        if (prev) {
            goToStep(prev.id);
        }
    }, [currentStepId, goToStep]);

    // Marquer une étape comme complétée (persiste dans Supabase)
    const completeStep = useCallback(async (stepId: string) => {
        const stepNumber = STEP_ID_TO_NUMBER[stepId];
        if (stepNumber && agId) {
            await wizard.completeStep(stepNumber);
        }
    }, [agId, wizard]);

    // Ignorer une étape optionnelle (persiste dans Supabase)
    const skipStep = useCallback(async (stepId: string): Promise<boolean> => {
        const step = getStepById(stepId);
        if (!step || step.obligatoire) {
            return false;
        }

        const stepNumber = STEP_ID_TO_NUMBER[stepId];
        if (stepNumber && agId) {
            await wizard.skipStep(stepNumber);
        }

        return true;
    }, [agId, wizard]);

    // Réinitialiser le workflow
    const resetWorkflow = useCallback(async () => {
        if (agId) {
            // Reset dans Supabase en mettant step_data à vide et current_step à 1
            await wizard.goToStep(1);
        }
    }, [agId, wizard]);

    return {
        // État
        mode: wizard.wizardMode,
        currentStepId,
        currentStep,
        steps,
        expertGroups,
        progress,
        lastSavedAt: wizard.state?.updated_at || null,
        completedSteps,
        skippedSteps,
        isLoading: wizard.isLoading,

        // Actions
        setMode,
        goToStep,
        nextStep,
        prevStep,
        completeStep,
        skipStep,
        resetWorkflow,

        // Utilitaires
        canNavigateTo,
        isStepAccessible,
        getStepStatus,
    };
}

export default useAGWorkflow;
