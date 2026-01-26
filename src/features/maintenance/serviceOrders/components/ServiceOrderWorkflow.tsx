'use client';

import { OrdreService } from '@/types';
import { getStatutLabel } from '@/lib/utils/service-order';
import { ORDRE_SERVICE_WORKFLOW_STEPS, ORDRE_SERVICE_STATUT_DESCRIPTIONS } from '@/types/enums/statuts';
import { RefreshCw, CheckCircle2, History } from 'lucide-react';
import clsx from 'clsx';
import ModificationHistory from '../../../../app/(dashboard)/maintenance/service-orders/components/ModificationHistory';
import styles from './ServiceOrderWorkflow.module.css';

interface WorkflowProgressProps {
    currentData: OrdreService;
}

export function ServiceOrderWorkflowProgress({ currentData }: WorkflowProgressProps) {
    const currentIndex = ORDRE_SERVICE_WORKFLOW_STEPS.indexOf(currentData.statut);

    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <RefreshCw size={18} aria-hidden="true" />
                Progression du workflow
            </h2>
            <div className={styles.workflowProgressContainer}>
                <div className={styles.workflowSteps}>
                    {ORDRE_SERVICE_WORKFLOW_STEPS.map((step, index) => {
                        const isCompleted = index < currentIndex;
                        const isActive = step === currentData.statut;
                        const isPending = index > currentIndex;

                        return (
                            <div key={step} className={styles.workflowStepContainer}>
                                <div className={clsx(
                                    styles.workflowStepItem,
                                    isCompleted && styles.workflowStepCompleted,
                                    isActive && styles.workflowStepActive,
                                    isPending && styles.workflowStepPending
                                )}>
                                    <div className={styles.workflowStepNumber}>
                                        {isCompleted ? (
                                            <CheckCircle2 size={16} aria-hidden="true" />
                                        ) : (
                                            <span>{index + 1}</span>
                                        )}
                                    </div>
                                    <div className={styles.workflowStepInfo}>
                                        <span className={styles.workflowStepLabel}>
                                            {getStatutLabel(step)}
                                        </span>
                                        {isActive && ORDRE_SERVICE_STATUT_DESCRIPTIONS[step] && (
                                            <span className={styles.workflowStepDescription}>
                                                {ORDRE_SERVICE_STATUT_DESCRIPTIONS[step]}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {index < ORDRE_SERVICE_WORKFLOW_STEPS.length - 1 && (
                                    <div className={clsx(
                                        styles.workflowConnector,
                                        isCompleted && styles.workflowConnectorCompleted
                                    )} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

interface HistoryCardProps {
    currentData: OrdreService;
}

export function ServiceOrderHistoryCard({ currentData }: HistoryCardProps) {
    return (
        <div className={styles.card}>
            <h2 className={styles.cardTitle}>
                <History size={18} aria-hidden="true" />
                Historique des modifications
            </h2>
            <ModificationHistory historique={currentData.historique} />
        </div>
    );
}
