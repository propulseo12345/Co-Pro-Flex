'use client';

import { useRouter } from 'next/navigation';
import { Check, Lock, Calendar, ListChecks, Mail, Send, Vote, Users, FileText } from 'lucide-react';
import { useMemo } from 'react';
import styles from './Stepper.module.css';

interface StepperProps {
    currentStep: number;
    agId?: string;
}

// Configuration des étapes
const STEPS = [
    { id: 'planification', numero: 1, titre: 'Planification', path: 'edit', icon: Calendar },
    { id: 'ordre-jour', numero: 2, titre: 'Ordre du jour', path: 'agenda', icon: ListChecks },
    { id: 'preparation-convoc', numero: 3, titre: 'Préparation convocations', path: 'convocation', icon: Mail },
    { id: 'envoi-convoc', numero: 4, titre: 'Envoi convocations', path: 'envoi', icon: Send },
    { id: 'votes-corresp', numero: 5, titre: 'Votes par correspondance', path: 'votes-correspondance', icon: Vote, optional: true },
    { id: 'tenue-ag', numero: 6, titre: 'Tenue de l\'AG', path: 'session', icon: Users },
    { id: 'pv', numero: 7, titre: 'Procès-verbal', path: 'pv', icon: FileText },
];

export default function Stepper({ currentStep, agId }: StepperProps) {
    const router = useRouter();

    // Déterminer le module actif (1-4 = Préparation, 5-7 = Déroulement)
    const isPreparationModule = currentStep <= 4;

    // Calculer la progression de chaque module
    const { prepProgress, deroulProgress } = useMemo(() => {
        // Module Préparation: étapes 1-4
        const prepCompleted = Math.min(currentStep - 1, 4);
        const prepTotal = 4;
        const prepPercent = (prepCompleted / prepTotal) * 100;

        // Module Déroulement: étapes 5-7
        const deroulCompleted = currentStep > 4 ? Math.min(currentStep - 4 - 1, 3) : 0;
        const deroulTotal = 3;
        const deroulPercent = currentStep > 4 ? (deroulCompleted / deroulTotal) * 100 : 0;

        return { prepProgress: prepPercent, deroulProgress: deroulPercent };
    }, [currentStep]);

    // Navigation
    const handleStepClick = (step: typeof STEPS[0]) => {
        if (!agId) return;

        // Permettre navigation vers étapes complétées ou étape actuelle
        if (step.numero <= currentStep) {
            if (step.numero === 1) {
                router.push(`/ag/${agId}/edit`);
            } else {
                router.push(`/ag/${agId}/${step.path}`);
            }
        }
    };

    const getStepStatus = (stepNum: number) => {
        if (stepNum < currentStep) return 'completed';
        if (stepNum === currentStep) return 'current';
        return 'pending';
    };

    const preparationSteps = STEPS.filter(s => s.numero <= 4);
    const deroulementSteps = STEPS.filter(s => s.numero >= 5);

    // Progression globale
    const globalProgress = Math.round(((currentStep - 1) / 7) * 100);

    return (
        <div className={styles.container}>
            {/* Header avec progression globale */}
            <div className={styles.header}>
                <div className={styles.globalProgress}>
                    <span className={styles.progressLabel}>Progression</span>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{ width: `${globalProgress}%` }}
                        />
                    </div>
                    <span className={styles.progressValue}>{globalProgress}%</span>
                </div>
            </div>

            {/* Modules */}
            <div className={styles.modules}>
                {/* Module 1: Préparation AG */}
                <div className={`${styles.module} ${isPreparationModule ? styles.moduleActive : styles.moduleCompleted}`}>
                    <div className={styles.moduleHeader}>
                        <div className={styles.moduleIcon}>
                            {!isPreparationModule ? <Check size={16} /> : <Calendar size={16} />}
                        </div>
                        <div className={styles.moduleInfo}>
                            <span className={styles.moduleTitle}>Préparation AG</span>
                            <span className={styles.moduleSubtitle}>Étapes 1-4</span>
                        </div>
                        <div className={styles.moduleProgress}>
                            <div className={styles.moduleProgressBar}>
                                <div
                                    className={styles.moduleProgressFill}
                                    style={{ width: `${prepProgress}%` }}
                                />
                            </div>
                            <span className={styles.moduleProgressText}>
                                {Math.min(currentStep - 1, 4)}/4
                            </span>
                        </div>
                    </div>

                    <div className={styles.steps}>
                        {preparationSteps.map((step, index) => {
                            const status = getStepStatus(step.numero);
                            const Icon = step.icon;
                            const isClickable = agId && step.numero <= currentStep;

                            return (
                                <div key={step.id} className={styles.stepWrapper}>
                                    {/* Connecteur entre les étapes */}
                                    {index > 0 && (
                                        <div className={`${styles.connector} ${status !== 'pending' || step.numero <= currentStep ? styles.connectorActive : ''}`} />
                                    )}

                                    <div
                                        className={`${styles.step} ${styles[`step${status.charAt(0).toUpperCase() + status.slice(1)}`]} ${isClickable ? styles.stepClickable : ''}`}
                                        onClick={() => isClickable && handleStepClick(step)}
                                        role={isClickable ? 'button' : undefined}
                                        tabIndex={isClickable ? 0 : undefined}
                                    >
                                        <div className={styles.stepCircle}>
                                            {status === 'completed' ? (
                                                <Check size={14} strokeWidth={3} />
                                            ) : (
                                                <Icon size={16} />
                                            )}
                                        </div>
                                        <div className={styles.stepContent}>
                                            <span className={styles.stepNumber}>Étape {step.numero}</span>
                                            <span className={styles.stepTitle}>{step.titre}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Séparateur */}
                <div className={styles.moduleSeparator}>
                    <div className={styles.separatorLine} />
                    <div className={styles.separatorIcon}>
                        <Send size={14} />
                    </div>
                    <div className={styles.separatorLine} />
                </div>

                {/* Module 2: Déroulement + PV */}
                <div className={`${styles.module} ${!isPreparationModule ? styles.moduleActive : currentStep > 4 ? styles.moduleCompleted : styles.modulePending}`}>
                    <div className={styles.moduleHeader}>
                        <div className={styles.moduleIcon}>
                            {currentStep > 7 ? <Check size={16} /> : <Users size={16} />}
                        </div>
                        <div className={styles.moduleInfo}>
                            <span className={styles.moduleTitle}>Déroulement + PV</span>
                            <span className={styles.moduleSubtitle}>Étapes 5-7</span>
                        </div>
                        <div className={styles.moduleProgress}>
                            <div className={`${styles.moduleProgressBar} ${currentStep <= 4 ? styles.moduleProgressBarInactive : ''}`}>
                                <div
                                    className={styles.moduleProgressFill}
                                    style={{ width: `${deroulProgress}%` }}
                                />
                            </div>
                            <span className={styles.moduleProgressText}>
                                {currentStep > 4 ? Math.min(currentStep - 5, 3) : 0}/3
                            </span>
                        </div>
                    </div>

                    <div className={styles.steps}>
                        {deroulementSteps.map((step, index) => {
                            const status = getStepStatus(step.numero);
                            const Icon = step.icon;
                            const isClickable = agId && step.numero <= currentStep;
                            const isLocked = currentStep < 5 && step.numero > currentStep;

                            return (
                                <div key={step.id} className={styles.stepWrapper}>
                                    {/* Connecteur entre les étapes */}
                                    {index > 0 && (
                                        <div className={`${styles.connector} ${status !== 'pending' || step.numero <= currentStep ? styles.connectorActive : ''}`} />
                                    )}

                                    <div
                                        className={`${styles.step} ${styles[`step${status.charAt(0).toUpperCase() + status.slice(1)}`]} ${isClickable ? styles.stepClickable : ''} ${isLocked ? styles.stepLocked : ''}`}
                                        onClick={() => isClickable && handleStepClick(step)}
                                        role={isClickable ? 'button' : undefined}
                                        tabIndex={isClickable ? 0 : undefined}
                                    >
                                        <div className={styles.stepCircle}>
                                            {status === 'completed' ? (
                                                <Check size={14} strokeWidth={3} />
                                            ) : isLocked ? (
                                                <Lock size={14} />
                                            ) : (
                                                <Icon size={16} />
                                            )}
                                        </div>
                                        <div className={styles.stepContent}>
                                            <span className={styles.stepNumber}>
                                                Étape {step.numero}
                                                {step.optional && <span className={styles.optionalTag}>Optionnel</span>}
                                            </span>
                                            <span className={styles.stepTitle}>{step.titre}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Vue mobile compacte */}
            <div className={styles.mobileView}>
                <div className={styles.mobileHeader}>
                    <span className={styles.mobileModule}>
                        {isPreparationModule ? 'Préparation AG' : 'Déroulement + PV'}
                    </span>
                    <span className={styles.mobileStep}>
                        Étape {currentStep}/7
                    </span>
                </div>
                <div className={styles.mobileTitle}>
                    {STEPS[currentStep - 1]?.titre}
                </div>
                <div className={styles.mobileProgressBar}>
                    <div
                        className={styles.mobileProgressFill}
                        style={{ width: `${globalProgress}%` }}
                    />
                </div>
                <div className={styles.mobileDots}>
                    {STEPS.map((step) => {
                        const status = getStepStatus(step.numero);
                        return (
                            <button
                                key={step.id}
                                className={`${styles.mobileDot} ${styles[`mobileDot${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}
                                onClick={() => step.numero <= currentStep && agId && handleStepClick(step)}
                                disabled={step.numero > currentStep}
                                title={step.titre}
                            >
                                {status === 'completed' ? (
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
