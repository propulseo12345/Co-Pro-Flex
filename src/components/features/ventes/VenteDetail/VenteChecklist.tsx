'use client';

import { Check, Circle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { Vente, VenteDocument } from './types';
import type { VenteStepValidationResult } from '@/types/models/vente-workflow';
import { WORKFLOW_STEPS_V2 } from './constants';
import { validateFullWorkflow, getStepIndex } from '@/lib/services/vente-workflow-validation.service';
import styles from './VenteDetail.module.css';

interface VenteChecklistProps {
  vente: Vente;
  documents: VenteDocument[];
  onAdvanceWorkflow?: (stepId: string) => void;
}

export function VenteChecklist({ vente, documents, onAdvanceWorkflow }: VenteChecklistProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Valider le workflow complet
  const validation = validateFullWorkflow(vente, documents);
  const currentStepIndex = getStepIndex(vente.etapeWorkflow);

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepStatus = (stepId: string, stepIndex: number): 'completed' | 'current' | 'pending' => {
    // Vérifier si l'étape a une date de complétion
    if (vente.datesEtapes?.[stepId as keyof typeof vente.datesEtapes]) {
      return 'completed';
    }
    // Sinon comparer avec l'index actuel
    if (stepIndex < currentStepIndex) {
      return 'completed';
    }
    if (stepIndex === currentStepIndex) {
      return 'current';
    }
    return 'pending';
  };

  const getStepValidation = (stepId: string): VenteStepValidationResult | undefined => {
    return validation.etapesManquantes.find(e => e.stepId === stepId) ||
           validation.etapesCompletes.find(e => e.stepId === stepId);
  };

  return (
    <div className={styles.checklistContainer}>
      <div className={styles.checklistHeader}>
        <h3 className={styles.checklistTitle}>Checklist de la vente</h3>
        <span className={styles.checklistProgress}>
          {validation.nombreEtapesCompletes}/{validation.nombreEtapesTotal} étapes
        </span>
      </div>

      <div className={styles.checklistProgressBar}>
        <div
          className={styles.checklistProgressFill}
          style={{ width: `${(validation.nombreEtapesCompletes / validation.nombreEtapesTotal) * 100}%` }}
        />
      </div>

      <div className={styles.checklistSteps}>
        {WORKFLOW_STEPS_V2.map((step, index) => {
          const status = getStepStatus(step.id, index);
          const stepValidation = getStepValidation(step.id);
          const isExpanded = expandedSteps.has(step.id);
          const Icon = step.icon;

          return (
            <div key={step.id} className={styles.checklistStep}>
              <button
                type="button"
                className={`${styles.checklistStepHeader} ${styles[`checklistStep${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}
                onClick={() => toggleStep(step.id)}
                aria-expanded={isExpanded}
              >
                <div className={styles.checklistStepIcon}>
                  {status === 'completed' ? (
                    <Check size={16} aria-hidden="true" />
                  ) : status === 'current' ? (
                    <Icon size={16} aria-hidden="true" />
                  ) : (
                    <Circle size={16} aria-hidden="true" />
                  )}
                </div>

                <div className={styles.checklistStepInfo}>
                  <span className={styles.checklistStepLabel}>{step.label}</span>
                  {stepValidation && !stepValidation.isComplete && (
                    <span className={styles.checklistStepWarning}>
                      <AlertCircle size={12} aria-hidden="true" />
                      {stepValidation.validations.filter(v => v.status !== 'valide').length} élément(s) manquant(s)
                    </span>
                  )}
                </div>

                <div className={styles.checklistStepToggle}>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {isExpanded && stepValidation && (
                <div className={styles.checklistStepDetails}>
                  {stepValidation.validations.map((v) => (
                    <div
                      key={v.ruleId}
                      className={`${styles.checklistValidation} ${styles[`validation${v.status.charAt(0).toUpperCase() + v.status.slice(1)}`]}`}
                    >
                      <span className={styles.checklistValidationIcon}>
                        {v.status === 'valide' ? (
                          <Check size={14} aria-hidden="true" />
                        ) : v.status === 'en_attente' ? (
                          <Circle size={14} aria-hidden="true" />
                        ) : (
                          <AlertCircle size={14} aria-hidden="true" />
                        )}
                      </span>
                      <span className={styles.checklistValidationLabel}>{v.label}</span>
                      {v.message && (
                        <span className={styles.checklistValidationMessage}>{v.message}</span>
                      )}
                    </div>
                  ))}

                  {status === 'current' && stepValidation.isComplete && onAdvanceWorkflow && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const nextStep = WORKFLOW_STEPS_V2[index + 1];
                        if (nextStep) {
                          onAdvanceWorkflow(nextStep.id);
                        }
                      }}
                      style={{ marginTop: '0.75rem' }}
                    >
                      <Check size={14} style={{ marginRight: '0.375rem' }} aria-hidden="true" />
                      Valider cette étape
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!validation.peutTerminer && validation.alertesBloquantes.length > 0 && (
        <div className={styles.checklistWarning}>
          <AlertCircle size={16} aria-hidden="true" />
          <div>
            <strong>Éléments requis pour finaliser :</strong>
            <ul>
              {validation.alertesBloquantes.slice(0, 3).map((alerte, idx) => (
                // Liste d'affichage (3 alertes max, sans état local) : index acceptable
                // eslint-disable-next-line react/no-array-index-key
                <li key={idx}>{alerte}</li>
              ))}
              {validation.alertesBloquantes.length > 3 && (
                <li>+ {validation.alertesBloquantes.length - 3} autre(s)...</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
