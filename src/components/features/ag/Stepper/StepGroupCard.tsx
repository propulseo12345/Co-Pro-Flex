'use client';

import { Check } from 'lucide-react';
import { StepItem } from './StepItem';
import type { StepGroupModel } from './types';
import styles from './Stepper.module.css';

interface StepGroupCardProps {
    group: StepGroupModel;
    maxStepReached: number;
}

export function StepGroupCard({ group, maxStepReached: _maxStepReached }: StepGroupCardProps) {
    const { titre, icon: Icon, steps, completedCount, totalCount, isActive, isCompleted } = group;

    const moduleStateClass = isActive
        ? styles.stepGroupActive
        : isCompleted
            ? styles.stepGroupCompleted
            : styles.stepGroupDefault;

    return (
        <div className={`${styles.stepGroup} ${moduleStateClass}`}>
            <div className={styles.stepGroupHeader}>
                <div className={styles.stepGroupIcon}>
                    {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                </div>
                <span className={styles.stepGroupTitle}>{titre}</span>
                <span className={styles.stepGroupCount}>{completedCount}/{totalCount}</span>
            </div>

            <div className={styles.stepGroupSteps}>
                {steps.map((step) => (
                    <StepItem key={step.id} step={step} />
                ))}
            </div>
        </div>
    );
}
