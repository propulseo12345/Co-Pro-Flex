'use client';

import { ChevronRight } from 'lucide-react';
import { WORKFLOW_STEPS } from '../domain/constants';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

export function WorkflowLegend() {
  return (
    <div className={styles.workflowLegend}>
      <span className={styles.legendTitle}>Workflow de recouvrement :</span>
      <div className={styles.legendSteps}>
        {WORKFLOW_STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className={styles.legendStep}>
              <div className={styles.legendIcon} style={{ background: `${step.color}20`, color: step.color }}>
                <Icon size={14} aria-hidden="true" />
              </div>
              <span>{step.label}</span>
              {index < WORKFLOW_STEPS.length - 1 && <ChevronRight size={14} className={styles.legendArrow} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
