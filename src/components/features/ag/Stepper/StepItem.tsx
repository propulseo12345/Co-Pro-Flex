'use client';

import { Check } from 'lucide-react';
import type { StepItemModel } from './types';
import styles from './Stepper.module.css';

interface StepItemProps {
    step: StepItemModel;
}

export function StepItem({ step }: StepItemProps) {
    const { numero, titre, status, isClickable, onClick } = step;

    const statusClass = styles[`stepItem${status.charAt(0).toUpperCase() + status.slice(1)}`];

    const handleClick = () => {
        if (isClickable && onClick) {
            onClick();
        }
    };

    return (
        <button
            type="button"
            className={`${styles.stepItem} ${statusClass} ${isClickable ? styles.stepItemClickable : ''}`}
            onClick={handleClick}
            disabled={!isClickable}
            aria-disabled={!isClickable}
            title={titre}
        >
            <span className={styles.stepItemDot}>
                {status === 'completed' ? (
                    <Check size={10} strokeWidth={3} />
                ) : (
                    <span className={styles.stepItemNum}>{numero}</span>
                )}
            </span>
            <span className={styles.stepItemTitle}>
                {titre}
            </span>
        </button>
    );
}
