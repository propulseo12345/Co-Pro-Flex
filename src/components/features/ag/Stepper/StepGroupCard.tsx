'use client';

import { Check } from 'lucide-react';
import { StepItem } from './StepItem';
import type { StepGroupModel } from './types';
import styles from './Stepper.module.css';

interface StepGroupCardProps {
    group: StepGroupModel;
    maxStepReached: number;
}

/**
 * Composant unifié pour afficher un groupe d'étapes (carte)
 * Utilisé pour Préparation AG (1-4) et Déroulement + PV (5-8)
 * Même style, même structure, mêmes règles visuelles
 */
export function StepGroupCard({ group, maxStepReached }: StepGroupCardProps) {
    const { titre, subtitle, icon: Icon, steps, completedCount, totalCount, isActive, isCompleted } = group;

    // Calcul de la progression
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Classe du module basée sur l'état
    const moduleStateClass = isActive
        ? styles.stepGroupActive
        : isCompleted
            ? styles.stepGroupCompleted
            : styles.stepGroupDefault;

    return (
        <div className={`${styles.stepGroup} ${moduleStateClass}`}>
            {/* Header du groupe */}
            <div className={styles.stepGroupHeader}>
                <div className={styles.stepGroupIcon}>
                    {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                </div>
                <div className={styles.stepGroupInfo}>
                    <span className={styles.stepGroupTitle}>{titre}</span>
                    <span className={styles.stepGroupSubtitle}>{subtitle}</span>
                </div>
                <div className={styles.stepGroupProgress}>
                    <div className={styles.stepGroupProgressBar}>
                        <div
                            className={styles.stepGroupProgressFill}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className={styles.stepGroupProgressText}>
                        {completedCount}/{totalCount}
                    </span>
                </div>
            </div>

            {/* Liste des étapes */}
            <div className={styles.stepGroupSteps}>
                {steps.map((step, index) => (
                    <StepItem
                        key={step.id}
                        step={step}
                        showConnector={index > 0}
                        connectorActive={step.numero <= maxStepReached}
                    />
                ))}
            </div>
        </div>
    );
}
