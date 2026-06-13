'use client';

import { CheckCircle2, Clock, Check, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import type { Vente, VenteDocument } from './types';
import { WORKFLOW_STEPS } from './constants';
import { getWorkflowStepIndex, canAdvanceWorkflow } from './utils';
import styles from './VenteDetail.module.css';

interface VenteWorkflowProps {
  vente: Vente;
  documents: VenteDocument[];
  onAdvanceWorkflow: (nextStep: string) => void;
}

export function VenteWorkflow({ vente, documents, onAdvanceWorkflow }: VenteWorkflowProps) {
  const currentStepIndex = getWorkflowStepIndex(vente.etapeWorkflow);

  return (
    <div className="card">
      <div className={styles.workflowContainer}>
        {WORKFLOW_STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = step.id === vente.etapeWorkflow;
          const isNext = index > currentStepIndex;
          const validation = canAdvanceWorkflow(step.id, vente, documents);

          return (
            <div key={step.id} className={styles.workflowStepCard}>
              <div className={clsx(
                styles.stepIndicator,
                isCompleted && styles.stepCompleted,
                isCurrent && styles.stepCurrent,
                isNext && styles.stepNext
              )}>
                {isCompleted ? (
                  <CheckCircle2 size={24} aria-hidden="true" />
                ) : (
                  <Icon size={24} aria-hidden="true" />
                )}
              </div>

              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>{step.label}</h3>
                <p className={styles.stepDescription}>{step.description}</p>

                {isCompleted && (
                  <div className={styles.stepDetails}>
                    <CheckCircle2 size={14} style={{ color: 'var(--success)' }} aria-hidden="true" />
                    <span>Étape complétée</span>
                  </div>
                )}

                {isCurrent && (
                  <div className={styles.stepActions}>
                    {validation.canAdvance ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onAdvanceWorkflow(WORKFLOW_STEPS[index + 1]?.id || 'notification')}
                        disabled={index >= WORKFLOW_STEPS.length - 1 && vente.statut === 'finalise'}
                      >
                        {index < WORKFLOW_STEPS.length - 1 ? (
                          <>
                            <Check size={14} style={{ marginRight: 6 }} aria-hidden="true" />
                            Valider et passer à l&apos;étape suivante
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} style={{ marginRight: 6 }} aria-hidden="true" />
                            Finaliser la vente
                          </>
                        )}
                      </button>
                    ) : (
                      <div className={styles.stepWarning}>
                        <AlertTriangle size={14} aria-hidden="true" />
                        <span>{validation.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {isNext && (
                  <div className={styles.stepDetails}>
                    <Clock size={14} style={{ color: 'var(--text-tertiary)' }} aria-hidden="true" />
                    <span>En attente</span>
                  </div>
                )}
              </div>

              {index < WORKFLOW_STEPS.length - 1 && (
                <div className={clsx(
                  styles.stepConnector,
                  isCompleted && styles.connectorCompleted
                )}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
