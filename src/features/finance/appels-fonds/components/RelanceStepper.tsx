'use client';

import { Check, Circle } from 'lucide-react';
import clsx from 'clsx';
import type { PhaseStatus } from '../hooks/useRelance';
import styles from '../styles/RelanceModal.module.css';

interface RelanceStepperProps {
  phases: PhaseStatus[];
  onPreview: (phase: number) => void;
}

function channelLabel(channel: string): string {
  switch (channel) {
    case 'email': return 'email';
    case 'courrier': return 'courrier';
    case 'both': return 'email + courrier';
    default: return channel;
  }
}

export function RelanceStepper({ phases, onPreview }: RelanceStepperProps) {
  return (
    <div className={styles.stepper}>
      {phases.map((phase, i) => {
        const isLast = i === phases.length - 1;
        return (
          <div key={phase.phase} className={styles.step}>
            <div className={styles.stepIndicator}>
              <div className={clsx(
                styles.stepDot,
                phase.status === 'sent' && styles.stepDotSent,
                phase.status === 'active' && styles.stepDotActive,
              )}>
                {phase.status === 'sent' ? <Check size={14} /> : <Circle size={10} />}
              </div>
              {!isLast && (
                <div className={clsx(
                  styles.stepLine,
                  phase.status === 'sent' ? styles.stepLineSolid : styles.stepLineDashed,
                )} />
              )}
            </div>

            <div className={styles.stepContent}>
              <div className={clsx(styles.stepLabel, phase.status === 'locked' && styles.stepLabelLocked)}>
                {phase.label}
              </div>
              <div className={styles.stepDelay}>J+{phase.delayDays} apres echeance</div>

              {phase.status === 'sent' && phase.sentAt && (
                <div className={styles.stepSentInfo}>
                  Envoyee le {new Date(phase.sentAt).toLocaleDateString('fr-FR')}
                  {phase.sentChannel && ` par ${channelLabel(phase.sentChannel)}`}
                </div>
              )}

              {phase.status === 'active' && (
                <button className={styles.stepActionBtn} onClick={() => onPreview(phase.phase)}>
                  Apercu et envoi
                </button>
              )}

              {phase.status === 'locked' && (
                <div className={styles.stepLockedInfo}>
                  Disponible apres la phase precedente
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
