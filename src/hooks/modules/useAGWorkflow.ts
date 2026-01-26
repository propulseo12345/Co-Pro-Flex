/**
 * Hook de gestion du workflow AG
 *
 * Gère le mode (Guidé/Expert), la navigation, et le suivi de progression
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
    canAccessStep,
    hasStepData,
    getNextAvailableStep,
    getPreviousStep,
    calculateProgressPercentage,
    calculateRemainingTime,
} from '@/lib/constants/ag-workflow';

// Clé localStorage pour la préférence de mode
const WORKFLOW_MODE_KEY = 'ag-workflow-mode-preference';

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

    // Actions
    setMode: (mode: WorkflowMode) => void;
    goToStep: (stepId: string) => boolean;
    nextStep: () => void;
    prevStep: () => void;
    completeStep: (stepId: string) => void;
    skipStep: (stepId: string) => boolean;
    resetWorkflow: () => void;

    // Utilitaires
    canNavigateTo: (stepId: string) => boolean;
    isStepAccessible: (stepId: string) => boolean;
    getStepStatus: (stepId: string) => StepStatus;
}

/**
 * Hook pour gérer le workflow AG
 *
 * @param agId - ID de l'AG (optionnel, pour la persistance)
 * @param initialStepNumber - Numéro d'étape initial (1-7)
 */
export function useAGWorkflow(
    agId?: string,
    initialStepNumber: number = 1
): UseAGWorkflowReturn {
    // Mode de workflow (guidé ou expert)
    const [mode, setModeState] = useState<WorkflowMode>('guided');

    // Étape courante (par ID)
    const [currentStepId, setCurrentStepId] = useState<string>(() => {
        const step = getStepByNumber(initialStepNumber);
        return step?.id || 'planification';
    });

    // Étapes complétées
    const [completedSteps, setCompletedSteps] = useState<string[]>([]);

    // Étapes ignorées (optionnelles)
    const [skippedSteps, setSkippedSteps] = useState<string[]>([]);

    // Timestamp de dernière sauvegarde
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

    // Charger la préférence de mode depuis localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedMode = localStorage.getItem(WORKFLOW_MODE_KEY);
            if (savedMode === 'guided' || savedMode === 'expert') {
                setModeState(savedMode);
            }
        }
    }, []);

    // Charger l'état du workflow depuis localStorage si agId fourni
    useEffect(() => {
        if (!agId || typeof window === 'undefined') return;

        const savedState = localStorage.getItem(`ag-workflow-state-${agId}`);
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                if (Array.isArray(parsed.completedSteps)) {
                    setCompletedSteps(parsed.completedSteps);
                }
                if (Array.isArray(parsed.skippedSteps)) {
                    setSkippedSteps(parsed.skippedSteps);
                }
                if (parsed.lastSavedAt) {
                    setLastSavedAt(parsed.lastSavedAt);
                }
            } catch (error) {
                console.error('Erreur lors du chargement de l\'état du workflow:', error);
            }
        }
    }, [agId]);

    // Sauvegarder l'état du workflow dans localStorage
    useEffect(() => {
        if (!agId || typeof window === 'undefined') return;
        if (completedSteps.length === 0 && skippedSteps.length === 0) return;

        const state = {
            completedSteps,
            skippedSteps,
            lastSavedAt: new Date().toISOString(),
        };

        localStorage.setItem(`ag-workflow-state-${agId}`, JSON.stringify(state));
        setLastSavedAt(state.lastSavedAt);
    }, [agId, completedSteps, skippedSteps]);

    // Mettre à jour currentStepId quand initialStepNumber change
    useEffect(() => {
        const step = getStepByNumber(initialStepNumber);
        if (step) {
            setCurrentStepId(step.id);
        }
    }, [initialStepNumber]);

    // Calculer le statut de chaque étape
    const getStepStatus = useCallback((stepId: string): StepStatus => {
        if (completedSteps.includes(stepId)) {
            return 'completed';
        }
        if (skippedSteps.includes(stepId)) {
            return 'skipped';
        }
        // Permettre l'accès si l'étape a des données sauvegardées (navigation libre)
        const hasData = agId && typeof window !== 'undefined' && hasStepData(stepId, agId);
        if (!hasData && !canAccessStep(stepId, completedSteps)) {
            return 'locked';
        }
        if (stepId === currentStepId) {
            return 'in_progress';
        }
        return 'available';
    }, [completedSteps, skippedSteps, currentStepId, agId]);

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
        return canAccessStep(stepId, completedSteps);
    }, [completedSteps]);

    // Changer de mode
    const setMode = useCallback((newMode: WorkflowMode) => {
        setModeState(newMode);
        if (typeof window !== 'undefined') {
            localStorage.setItem(WORKFLOW_MODE_KEY, newMode);
        }
    }, []);

    // Naviguer vers une étape
    const goToStep = useCallback((stepId: string): boolean => {
        if (!canNavigateTo(stepId)) {
            return false;
        }
        setCurrentStepId(stepId);
        return true;
    }, [canNavigateTo]);

    // Aller à l'étape suivante
    const nextStep = useCallback(() => {
        const next = getNextAvailableStep(currentStepId, completedSteps);
        if (next) {
            setCurrentStepId(next.id);
        }
    }, [currentStepId, completedSteps]);

    // Aller à l'étape précédente
    const prevStep = useCallback(() => {
        const prev = getPreviousStep(currentStepId);
        if (prev) {
            setCurrentStepId(prev.id);
        }
    }, [currentStepId]);

    // Marquer une étape comme complétée
    const completeStep = useCallback((stepId: string) => {
        setCompletedSteps(prev => {
            if (prev.includes(stepId)) return prev;
            return [...prev, stepId];
        });

        // Retirer des étapes ignorées si présent
        setSkippedSteps(prev => prev.filter(id => id !== stepId));
    }, []);

    // Ignorer une étape optionnelle
    const skipStep = useCallback((stepId: string): boolean => {
        const step = getStepById(stepId);
        if (!step || step.obligatoire) {
            return false;
        }

        setSkippedSteps(prev => {
            if (prev.includes(stepId)) return prev;
            return [...prev, stepId];
        });

        // Aller à l'étape suivante
        nextStep();
        return true;
    }, [nextStep]);

    // Réinitialiser le workflow
    const resetWorkflow = useCallback(() => {
        setCompletedSteps([]);
        setSkippedSteps([]);
        setCurrentStepId('planification');

        if (agId && typeof window !== 'undefined') {
            localStorage.removeItem(`ag-workflow-state-${agId}`);
        }
    }, [agId]);

    return {
        // État
        mode,
        currentStepId,
        currentStep,
        steps,
        expertGroups,
        progress,
        lastSavedAt,
        completedSteps,
        skippedSteps,

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
