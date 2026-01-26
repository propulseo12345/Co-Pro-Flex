'use client';

import { useMemo } from 'react';
import { CheckCircle, Clock, AlertTriangle, Circle, Calendar } from 'lucide-react';
import type { AppelFonds, CalendrierAppel as CalendrierAppelType } from './types';
import { DELAIS_OPTIMAUX } from './types';
import { genererCalendrierOptimal, calculerJoursEntre, formatDate } from './utils';
import styles from './appels-fonds.module.css';

interface CalendrierAppelProps {
  appel: AppelFonds;
  showLegende?: boolean;
}

type StepStatus = 'done' | 'current' | 'late' | 'pending';

interface TimelineStep {
  id: string;
  label: string;
  date: string;
  status: StepStatus;
  dateFaite?: string;
}

export function CalendrierAppel({ appel, showLegende = true }: CalendrierAppelProps) {
  const calendrier = useMemo(() => genererCalendrierOptimal(appel), [appel]);
  const aujourdhui = new Date().toISOString().split('T')[0];

  const steps = useMemo((): TimelineStep[] => {
    const getStepStatus = (
      dateOptimale: string,
      fait: boolean,
      dateFaite?: string
    ): StepStatus => {
      if (fait) return 'done';
      if (aujourdhui > dateOptimale) return 'late';
      if (calculerJoursEntre(aujourdhui, dateOptimale) <= 5) return 'current';
      return 'pending';
    };

    return [
      {
        id: 'generation',
        label: 'Génération',
        date: calendrier.dates.generationOptimale,
        status: getStepStatus(
          calendrier.dates.generationOptimale,
          calendrier.statuts.generationFaite,
          calendrier.statuts.dateGeneration
        ),
        dateFaite: calendrier.statuts.dateGeneration,
      },
      {
        id: 'envoi',
        label: 'Envoi',
        date: calendrier.dates.envoiOptimal,
        status: getStepStatus(
          calendrier.dates.envoiOptimal,
          calendrier.statuts.envoiFait,
          calendrier.statuts.dateEnvoi
        ),
        dateFaite: calendrier.statuts.dateEnvoi,
      },
      {
        id: 'relance1',
        label: 'Relance 1',
        date: calendrier.dates.relance1,
        status: getStepStatus(
          calendrier.dates.relance1,
          calendrier.statuts.relance1Faite,
          calendrier.statuts.dateRelance1
        ),
        dateFaite: calendrier.statuts.dateRelance1,
      },
      {
        id: 'relance2',
        label: 'Relance 2',
        date: calendrier.dates.relance2,
        status: getStepStatus(
          calendrier.dates.relance2,
          calendrier.statuts.relance2Faite,
          calendrier.statuts.dateRelance2
        ),
        dateFaite: calendrier.statuts.dateRelance2,
      },
      {
        id: 'echeance',
        label: 'Échéance',
        date: calendrier.dateEcheance,
        status: aujourdhui > calendrier.dateEcheance ? 'late' : 'pending',
      },
    ];
  }, [calendrier, aujourdhui]);

  const progressPercent = useMemo(() => {
    const totalSteps = steps.length;
    const doneSteps = steps.filter(s => s.status === 'done').length;
    return (doneSteps / totalSteps) * 100;
  }, [steps]);

  const getStepClass = (status: StepStatus) => {
    switch (status) {
      case 'done':
        return styles.calendrierTimelineStepDone;
      case 'current':
        return styles.calendrierTimelineStepCurrent;
      case 'late':
        return styles.calendrierTimelineStepLate;
      case 'pending':
        return styles.calendrierTimelineStepPending;
    }
  };

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'done':
        return <CheckCircle size={16} />;
      case 'current':
        return <Clock size={16} />;
      case 'late':
        return <AlertTriangle size={16} />;
      case 'pending':
        return <Circle size={16} />;
    }
  };

  const joursRestants = calculerJoursEntre(aujourdhui, calendrier.dateEcheance);

  return (
    <div className={styles.calendrierAppel}>
      <div className={styles.calendrierAppelHeader}>
        <h3 className={styles.calendrierAppelTitle}>
          <Calendar size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Calendrier prévisionnel
        </h3>
        <span className={styles.calendrierAppelEcheance}>
          Échéance : {formatDate(calendrier.dateEcheance)}
          {joursRestants > 0 && ` (J-${joursRestants})`}
          {joursRestants === 0 && " (Aujourd'hui)"}
          {joursRestants < 0 && ` (Dépassée de ${Math.abs(joursRestants)} j)`}
        </span>
      </div>

      <div className={styles.calendrierTimeline}>
        <div className={styles.calendrierTimelineBar}>
          <div
            className={styles.calendrierTimelineProgress}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={styles.calendrierTimelineSteps}>
          {steps.map((step) => (
            <div
              key={step.id}
              className={`${styles.calendrierTimelineStep} ${getStepClass(step.status)}`}
            >
              <div className={styles.calendrierTimelineStepDot}>
                {getStepIcon(step.status)}
              </div>
              <div className={styles.calendrierTimelineStepLabel}>
                <span className={styles.calendrierTimelineStepLabelTitle}>
                  {step.label}
                </span>
                <span className={styles.calendrierTimelineStepLabelDate}>
                  {step.status === 'done' && step.dateFaite
                    ? formatDate(step.dateFaite)
                    : `J-${DELAIS_OPTIMAUX[step.id === 'generation' ? 'GENERATION' : step.id === 'envoi' ? 'ENVOI' : step.id === 'relance1' ? 'RELANCE_1' : step.id === 'relance2' ? 'RELANCE_2' : 'GENERATION'] || 0}`}
                  {step.id === 'echeance' && formatDate(step.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showLegende && (
        <div className={styles.calendrierLegende}>
          <div className={styles.calendrierLegendeItem}>
            <span className={`${styles.calendrierLegendeItemDot} ${styles.calendrierLegendeItemDotDone}`} />
            Fait
          </div>
          <div className={styles.calendrierLegendeItem}>
            <span className={`${styles.calendrierLegendeItemDot} ${styles.calendrierLegendeItemDotCurrent}`} />
            À faire bientôt
          </div>
          <div className={styles.calendrierLegendeItem}>
            <span className={`${styles.calendrierLegendeItemDot} ${styles.calendrierLegendeItemDotLate}`} />
            En retard
          </div>
          <div className={styles.calendrierLegendeItem}>
            <span className={`${styles.calendrierLegendeItemDot} ${styles.calendrierLegendeItemDotPending}`} />
            À venir
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Composant pour afficher une alerte dans le formulaire de création/modification
 * si la date d'échéance sélectionnée ne laisse pas assez de temps
 */
interface FormAlerteDelaiProps {
  dateEcheance: string;
  dateEmission?: string;
}

export function FormAlerteDelai({ dateEcheance, dateEmission }: FormAlerteDelaiProps) {
  const aujourdhui = new Date().toISOString().split('T')[0];
  const dateRef = dateEmission || aujourdhui;

  if (!dateEcheance) return null;

  const joursRestants = calculerJoursEntre(dateRef, dateEcheance);
  const delaiOptimal = DELAIS_OPTIMAUX.DELAI_MINIMUM;
  const delaiCritique = DELAIS_OPTIMAUX.DELAI_CRITIQUE;

  if (joursRestants >= delaiOptimal) return null;

  const isCritical = joursRestants < delaiCritique;

  return (
    <div className={`${styles.formAlerteDelai} ${isCritical ? styles.formAlerteDelaiCritical : ''}`}>
      <div className={styles.formAlerteDelaiIcon}>
        <AlertTriangle size={18} />
      </div>
      <div className={styles.formAlerteDelaiContent}>
        <h4 className={styles.formAlerteDelaiTitle}>
          {isCritical ? 'Délai critique' : 'Délai insuffisant'}
        </h4>
        <p className={styles.formAlerteDelaiMessage}>
          {joursRestants <= 0
            ? `La date d'échéance est déjà dépassée ou aujourd'hui.`
            : `Les copropriétaires n'auront que ${joursRestants} jour${joursRestants > 1 ? 's' : ''} pour payer.
               Le délai recommandé est de ${delaiOptimal} jours minimum pour tenir compte des délais postaux (3-5 jours)
               et laisser suffisamment de temps aux copropriétaires.`}
        </p>
        {joursRestants > 0 && (
          <p className={styles.formAlerteDelaiMessage} style={{ marginTop: '8px', fontWeight: 500 }}>
            Calendrier optimal suggéré : Génération J-45, Envoi J-40, Relance 1 J-15, Relance 2 J-5
          </p>
        )}
      </div>
    </div>
  );
}
