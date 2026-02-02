'use client';

import { useRouter } from 'next/navigation';
import { Check, Lock, Calendar, ListChecks, Mail, Send, Vote, Users, FileText, ClipboardCheck } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './Stepper.module.css';

interface StepperProps {
    currentStep: number;
    agId?: string;
}

// Configuration des étapes
// Préparation AG: 1-4, Déroulement + PV: 5-8
const STEPS = [
    { id: 'planification', numero: 1, titre: 'Planification', path: 'edit', icon: Calendar },
    { id: 'ordre-jour', numero: 2, titre: 'Ordre du jour', path: 'agenda', icon: ListChecks },
    { id: 'preparation-convoc', numero: 3, titre: 'Préparation convocations', path: 'convocation', icon: Mail },
    { id: 'envoi-convoc', numero: 4, titre: 'Envoi convocations', path: 'envoi', icon: Send },
    { id: 'votes-corresp', numero: 5, titre: 'Votes par correspondance', path: 'votes-correspondance', icon: Vote, optional: true },
    { id: 'feuille-presence', numero: 6, titre: 'Feuille de présence', path: 'feuille-presence', icon: ClipboardCheck },
    { id: 'tenue-ag', numero: 7, titre: 'Tenue de l\'AG', path: 'session', icon: Users },
    { id: 'pv', numero: 8, titre: 'Procès-verbal', path: 'pv', icon: FileText },
];

export default function Stepper({ currentStep, agId }: StepperProps) {
    const router = useRouter();

    // DB-FIRST: maxStepReached vient UNIQUEMENT de Supabase, pas de la prop
    const [maxStepReached, setMaxStepReached] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch max_step_reached from database - SOURCE DE VÉRITÉ UNIQUE
    useEffect(() => {
        if (!agId) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const fetchMaxStep = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('ag_meetings')
                    .select('max_step_reached, current_step')
                    .eq('id', agId)
                    .single();

                if (!isMounted) return;

                if (!error && data) {
                    // DB est la source de vérité - on prend le max entre les valeurs DB
                    // currentStep prop est ignoré pour le calcul du max (c'est juste la route active)
                    const dbMax = Math.max(
                        data.max_step_reached || 1,
                        data.current_step || 1
                    );
                    setMaxStepReached(dbMax);
                } else {
                    // Fallback si erreur DB
                    setMaxStepReached(currentStep);
                }
            } catch (err) {
                console.warn('[Stepper] Failed to fetch max step:', err);
                if (isMounted) {
                    setMaxStepReached(currentStep);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchMaxStep();

        return () => {
            isMounted = false;
        };
    }, [agId, currentStep]);

    // effectiveMaxStep = valeur DB (ou currentStep en fallback si pas encore chargé)
    const effectiveMaxStep = maxStepReached ?? currentStep;

    // Déterminer le module actif (1-4 = Préparation, 5-8 = Déroulement)
    const isPreparationModule = currentStep <= 4;

    // Calculer la progression de chaque module - basée sur effectiveMaxStep, pas currentStep
    const { prepProgress, deroulProgress } = useMemo(() => {
        // Module Préparation: étapes 1-4
        const prepCompleted = Math.min(effectiveMaxStep - 1, 4);
        const prepTotal = 4;
        const prepPercent = Math.max(0, (prepCompleted / prepTotal) * 100);

        // Module Déroulement: étapes 5-8
        const deroulCompleted = effectiveMaxStep > 4 ? Math.min(effectiveMaxStep - 4, 4) : 0;
        const deroulTotal = 4;
        const deroulPercent = (deroulCompleted / deroulTotal) * 100;

        return { prepProgress: prepPercent, deroulProgress: deroulPercent };
    }, [effectiveMaxStep]);

    // Navigation - allow access to any step up to effectiveMaxStep
    const handleStepClick = (step: typeof STEPS[0]) => {
        if (!agId) return;

        // Permettre navigation vers étapes jusqu'à l'étape max atteinte (DB)
        if (step.numero <= effectiveMaxStep) {
            if (step.numero === 1) {
                router.push(`/ag/${agId}/edit`);
            } else {
                router.push(`/ag/${agId}/${step.path}`);
            }
        }
    };

    // DB-FIRST: Le statut dépend de effectiveMaxStep (DB), pas de currentStep (route)
    // currentStep ne sert qu'à highlighter l'étape active visuellement
    const getStepStatus = (stepNum: number): 'completed' | 'current' | 'pending' => {
        // L'étape courante (route active) est marquée "current"
        if (stepNum === currentStep) return 'current';

        // Toutes les étapes <= effectiveMaxStep (DB) sont "completed"
        // SAUF l'étape courante qui est "current"
        if (stepNum <= effectiveMaxStep) return 'completed';

        // Les étapes au-delà de effectiveMaxStep sont "pending"
        return 'pending';
    };

    const preparationSteps = STEPS.filter(s => s.numero <= 4);
    const deroulementSteps = STEPS.filter(s => s.numero >= 5);

    // Progression globale basée sur effectiveMaxStep (DB), pas currentStep
    const globalProgress = Math.round(((effectiveMaxStep - 1) / 8) * 100);

    // Loading state pendant le fetch DB
    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.globalProgress}>
                        <span className={styles.progressLabel}>Chargement...</span>
                        <div className={styles.progressBar}>
                            <div className={styles.progressFill} style={{ width: '0%' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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
                            {effectiveMaxStep > 4 ? <Check size={16} /> : <Calendar size={16} />}
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
                                {Math.min(effectiveMaxStep - 1, 4)}/4
                            </span>
                        </div>
                    </div>

                    <div className={styles.steps}>
                        {preparationSteps.map((step, index) => {
                            const status = getStepStatus(step.numero);
                            const Icon = step.icon;
                            const isClickable = agId && step.numero <= effectiveMaxStep;

                            return (
                                <div key={step.id} className={styles.stepWrapper}>
                                    {/* Connecteur entre les étapes */}
                                    {index > 0 && (
                                        <div className={`${styles.connector} ${step.numero <= effectiveMaxStep ? styles.connectorActive : ''}`} />
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
                <div className={`${styles.module} ${!isPreparationModule ? styles.moduleActive : effectiveMaxStep > 4 ? styles.moduleCompleted : styles.modulePending}`}>
                    <div className={styles.moduleHeader}>
                        <div className={styles.moduleIcon}>
                            {effectiveMaxStep > 8 ? <Check size={16} /> : <Users size={16} />}
                        </div>
                        <div className={styles.moduleInfo}>
                            <span className={styles.moduleTitle}>Déroulement + PV</span>
                            <span className={styles.moduleSubtitle}>Étapes 5-8</span>
                        </div>
                        <div className={styles.moduleProgress}>
                            <div className={`${styles.moduleProgressBar} ${effectiveMaxStep <= 4 ? styles.moduleProgressBarInactive : ''}`}>
                                <div
                                    className={styles.moduleProgressFill}
                                    style={{ width: `${deroulProgress}%` }}
                                />
                            </div>
                            <span className={styles.moduleProgressText}>
                                {effectiveMaxStep > 4 ? Math.min(effectiveMaxStep - 4, 4) : 0}/4
                            </span>
                        </div>
                    </div>

                    <div className={styles.steps}>
                        {deroulementSteps.map((step, index) => {
                            const status = getStepStatus(step.numero);
                            const Icon = step.icon;
                            const isClickable = agId && step.numero <= effectiveMaxStep;
                            const isLocked = step.numero > effectiveMaxStep;

                            return (
                                <div key={step.id} className={styles.stepWrapper}>
                                    {/* Connecteur entre les étapes */}
                                    {index > 0 && (
                                        <div className={`${styles.connector} ${step.numero <= effectiveMaxStep ? styles.connectorActive : ''}`} />
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
                        Étape {currentStep}/8
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
                                onClick={() => step.numero <= effectiveMaxStep && agId && handleStepClick(step)}
                                disabled={step.numero > effectiveMaxStep}
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
