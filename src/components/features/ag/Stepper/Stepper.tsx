'use client';

import { useRouter } from 'next/navigation';
import { Check, SkipForward, HelpCircle, Zap, Clock, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAGWorkflow, type StepWithStatus, type ExpertGroupWithStatus } from '@/hooks/modules/useAGWorkflow';
import {
    AG_WORKFLOW_STEPS,
    EXPERT_GROUPS_ORDER,
    EXPERT_GROUPS,
    buildPrerequisitesContext,
    getStepBlockedReason,
} from '@/lib/constants/ag-workflow';
import styles from './Stepper.module.css';

interface StepperProps {
    currentStep: number;
    agId?: string;
}

export default function Stepper({ currentStep, agId }: StepperProps) {
    const router = useRouter();
    const {
        mode,
        setMode,
        steps,
        expertGroups,
        progress,
        goToStep,
        completeStep,
        completedSteps,
    } = useAGWorkflow(agId, currentStep);

    // État pour afficher/masquer les groupes expert en mobile
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    // Construire le contexte pour obtenir les raisons de blocage
    const prerequisitesContext = useMemo(() => {
        if (!agId) return null;
        return buildPrerequisitesContext(agId);
    }, [agId]);

    // Obtenir la raison de blocage d'une étape
    const getBlockedReasonForStep = (stepId: string): string | undefined => {
        if (!prerequisitesContext) return undefined;
        return getStepBlockedReason(stepId, prerequisitesContext);
    };

    // Navigation vers une étape
    const handleStepClick = (stepId: string, path: string) => {
        if (!agId) return;

        const step = steps.find(s => s.id === stepId);
        if (!step) return;

        // Permettre la navigation vers toutes les étapes sauf celles verrouillées
        // Une étape est verrouillée uniquement si elle n'a pas de données ET que ses prérequis ne sont pas remplis
        if (step.status === 'locked') return;

        // Pour l'étape 1 (planification), utiliser une route d'édition
        if (step.numero === 1) {
            router.push(`/ag/${agId}/edit`);
            return;
        }

        // Permettre la navigation vers toutes les étapes accessibles (completed, available, in_progress)
        router.push(`/ag/${agId}/${path}`);
    };

    // Rendre une étape en mode guidé
    const renderGuidedStep = (step: StepWithStatus) => {
        const Icon = step.icon;
        // Permettre de cliquer sur toutes les étapes accessibles (pas seulement celles après l'étape 1)
        const isClickable = agId && step.status !== 'locked';
        const isLocked = step.status === 'locked';
        const blockedReason = isLocked ? getBlockedReasonForStep(step.id) : undefined;

        return (
            <div
                key={step.id}
                className={`${styles.stepItem} ${styles[`step${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]} ${isClickable ? styles.stepClickable : ''}`}
                onClick={() => isClickable && handleStepClick(step.id, step.path)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                    if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleStepClick(step.id, step.path);
                    }
                }}
                title={blockedReason}
            >
                <div className={styles.stepCircle}>
                    {step.status === 'completed' ? (
                        <Check size={16} strokeWidth={3} aria-hidden="true" />
                    ) : step.status === 'skipped' ? (
                        <SkipForward size={14} aria-hidden="true" />
                    ) : isLocked ? (
                        <Lock size={14} aria-hidden="true" />
                    ) : (
                        <Icon size={18} aria-hidden="true" />
                    )}
                </div>
                <div className={styles.stepContent}>
                    <span className={styles.stepNumber}>Étape {step.numero}</span>
                    <span className={styles.stepLabel}>{step.titre}</span>
                    <span className={styles.stepLabelShort}>{step.titre_court}</span>
                    {isLocked && blockedReason && (
                        <span className={styles.lockedBadge}>Prérequis manquant</span>
                    )}
                    {!step.obligatoire && step.status !== 'completed' && step.status !== 'skipped' && !isLocked && (
                        <span className={styles.optionalBadge}>Optionnel</span>
                    )}
                </div>
            </div>
        );
    };

    // Rendre un groupe en mode expert
    const renderExpertGroup = (group: ExpertGroupWithStatus) => {
        const Icon = group.icon;
        const isExpanded = expandedGroup === group.id;
        const firstAvailableStep = group.steps.find(s =>
            s.status !== 'locked' && s.status !== 'completed' && s.status !== 'skipped'
        );
        const isClickable = agId && group.status !== 'locked' && firstAvailableStep;

        const handleGroupClick = () => {
            if (isClickable && firstAvailableStep) {
                handleStepClick(firstAvailableStep.id, firstAvailableStep.path);
            }
        };

        return (
            <div
                key={group.id}
                className={`${styles.expertGroup} ${styles[`group${group.status.charAt(0).toUpperCase() + group.status.slice(1)}`]}`}
            >
                <div
                    className={`${styles.expertGroupHeader} ${isClickable ? styles.groupClickable : ''}`}
                    onClick={handleGroupClick}
                    role={isClickable ? 'button' : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                >
                    <div className={styles.expertGroupIcon}>
                        {group.status === 'completed' ? (
                            <Check size={20} strokeWidth={3} aria-hidden="true" />
                        ) : (
                            <Icon size={20} aria-hidden="true" />
                        )}
                    </div>
                    <div className={styles.expertGroupInfo}>
                        <span className={styles.expertGroupTitle}>{group.titre}</span>
                        <span className={styles.expertGroupDesc}>{group.description}</span>
                    </div>
                    <div className={styles.expertGroupProgress}>
                        <span className={styles.expertGroupCount}>
                            {group.completedCount}/{group.totalCount}
                        </span>
                        <div className={styles.expertGroupProgressBar}>
                            <div
                                className={styles.expertGroupProgressFill}
                                style={{ width: `${(group.completedCount / group.totalCount) * 100}%` }}
                            />
                        </div>
                    </div>
                    <button
                        className={styles.expertGroupExpand}
                        onClick={(e) => {
                            e.stopPropagation();
                            setExpandedGroup(isExpanded ? null : group.id);
                        }}
                        aria-label={isExpanded ? 'Réduire' : 'Développer'}
                    >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {isExpanded && (
                    <div className={styles.expertGroupSteps}>
                        {group.steps.map(step => {
                            const StepIcon = step.icon;
                            // Permettre de cliquer sur toutes les étapes accessibles
                            const stepClickable = agId && step.status !== 'locked';
                            const stepLocked = step.status === 'locked';
                            const stepBlockedReason = stepLocked ? getBlockedReasonForStep(step.id) : undefined;

                            return (
                                <div
                                    key={step.id}
                                    className={`${styles.expertStep} ${styles[`step${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]} ${stepClickable ? styles.stepClickable : ''}`}
                                    onClick={() => stepClickable && handleStepClick(step.id, step.path)}
                                    title={stepBlockedReason}
                                >
                                    <div className={styles.expertStepIcon}>
                                        {step.status === 'completed' ? (
                                            <Check size={14} strokeWidth={3} />
                                        ) : step.status === 'skipped' ? (
                                            <SkipForward size={12} />
                                        ) : stepLocked ? (
                                            <Lock size={12} />
                                        ) : (
                                            <StepIcon size={14} />
                                        )}
                                    </div>
                                    <span className={styles.expertStepTitle}>{step.titre_court}</span>
                                    {stepLocked && (
                                        <span className={styles.lockedBadgeSmall}>Bloqué</span>
                                    )}
                                    {!step.obligatoire && !stepLocked && (
                                        <span className={styles.optionalBadgeSmall}>Opt.</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Séparer les étapes pour le mode guidé
    const preparationSteps = steps.filter(s => s.numero <= 4);
    const deroulementSteps = steps.filter(s => s.numero >= 5);

    // Calcul du progrès pour chaque module (mode guidé)
    const prepProgress = currentStep <= 4
        ? ((currentStep - 1) / 3) * 100
        : 100;
    const deroulProgress = currentStep <= 4
        ? 0
        : ((currentStep - 5) / 2) * 100;

    // Données pour l'affichage mobile
    const currentStepData = steps[currentStep - 1];
    const currentModule = currentStep <= 4 ? 'Préparation AG' : 'Déroulement + PV';

    return (
        <div className={styles.stepperContainer}>
            {/* Header avec mode switcher et progression */}
            <div className={styles.stepperHeader}>
                <div className={styles.progressInfo}>
                    <span className={styles.progressText}>
                        {progress.percentage}% complété
                    </span>
                    <span className={styles.timeEstimate}>
                        <Clock size={12} aria-hidden="true" />
                        ~{progress.remainingTime} min restantes
                    </span>
                </div>

                <div className={styles.modeSwitcher}>
                    <button
                        className={`${styles.modeButton} ${mode === 'guided' ? styles.modeButtonActive : ''}`}
                        onClick={() => setMode('guided')}
                        title="Mode guidé : affiche les 7 étapes"
                    >
                        <HelpCircle size={14} aria-hidden="true" />
                        <span>Guidé</span>
                    </button>
                    <button
                        className={`${styles.modeButton} ${mode === 'expert' ? styles.modeButtonActive : ''}`}
                        onClick={() => setMode('expert')}
                        title="Mode expert : affiche 4 groupes condensés"
                    >
                        <Zap size={14} aria-hidden="true" />
                        <span>Expert</span>
                    </button>
                </div>
            </div>

            {/* Contenu selon le mode */}
            {mode === 'guided' ? (
                // Mode Guidé : 7 étapes en 2 modules
                <div className={styles.stepperWrapper}>
                    {/* Module 1: Préparation AG */}
                    <div className={styles.moduleSection}>
                        <div className={styles.moduleHeader}>
                            <span className={styles.moduleTitle}>Préparation AG</span>
                        </div>
                        <div className={styles.moduleContent}>
                            <div className={styles.progressTrack}>
                                <div
                                    className={styles.progressFill}
                                    style={{ width: `${prepProgress}%` }}
                                />
                            </div>
                            <div className={styles.stepsRow}>
                                {preparationSteps.map(renderGuidedStep)}
                            </div>
                        </div>
                    </div>

                    {/* Séparateur */}
                    <div className={styles.moduleDivider}>
                        <div className={styles.dividerLine} />
                    </div>

                    {/* Module 2: Déroulement + PV */}
                    <div className={styles.moduleSection}>
                        <div className={styles.moduleHeader}>
                            <span className={styles.moduleTitle}>Déroulement + PV</span>
                        </div>
                        <div className={styles.moduleContent}>
                            <div className={styles.progressTrack}>
                                <div
                                    className={`${styles.progressFill} ${currentStep <= 4 ? styles.progressInactive : ''}`}
                                    style={{ width: `${deroulProgress}%` }}
                                />
                            </div>
                            <div className={styles.stepsRow}>
                                {deroulementSteps.map(renderGuidedStep)}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Mode Expert : 4 groupes condensés
                <div className={styles.expertWrapper}>
                    {expertGroups.map(renderExpertGroup)}
                </div>
            )}

            {/* Mobile compact view */}
            <div className={styles.mobileProgress}>
                <div className={styles.mobileModuleBadge}>
                    {currentModule}
                </div>
                <div className={styles.mobileProgressInfo}>
                    <span className={styles.mobileStepCurrent}>Étape {currentStep}/7</span>
                    <span className={styles.mobileStepLabel}>{currentStepData?.titre}</span>
                </div>
                <div className={styles.mobileProgressBar}>
                    <div
                        className={styles.mobileProgressFill}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>
                {/* Mini-navigation mobile */}
                <div className={styles.mobileStepsNav}>
                    {steps.map((step) => {
                        // Permettre de cliquer sur toutes les étapes accessibles
                        const isClickable = agId && step.status !== 'locked';

                        return (
                            <button
                                key={step.numero}
                                className={`${styles.mobileStepDot} ${styles[`mobileStepDot${step.status.charAt(0).toUpperCase() + step.status.slice(1)}`]}`}
                                onClick={() => isClickable && handleStepClick(step.id, step.path)}
                                disabled={!isClickable}
                                title={step.titre}
                            >
                                {step.status === 'completed' ? (
                                    <Check size={10} strokeWidth={3} />
                                ) : (
                                    step.numero
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
