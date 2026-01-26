'use client';

import {
  User,
  Building2,
  Calendar,
  Clock,
  Euro,
  History,
  Eye,
  Send,
  CheckCircle2,
  SquareCheck,
  Square,
} from 'lucide-react';
import clsx from 'clsx';
import type { Impaye } from '../domain/types';
import { WORKFLOW_STEPS, STATUT_CONFIG } from '../domain/constants';
import { getNextStep, getWorkflowIndex, calculateJoursRetard } from '../domain/utils';
import styles from '../../../../../app/(dashboard)/ventes-impayes/impayes/impayes.module.css';

interface ImpayeCardProps {
  impaye: Impaye;
  isSelected: boolean;
  onToggleSelection: (id: number) => void;
  onOpenDetail: (impaye: Impaye) => void;
  onOpenRelance: (impaye: Impaye) => void;
  onOpenRegle: (impaye: Impaye) => void;
}

export function ImpayeCard({
  impaye,
  isSelected,
  onToggleSelection,
  onOpenDetail,
  onOpenRelance,
  onOpenRegle,
}: ImpayeCardProps) {
  const statutConfig = STATUT_CONFIG[impaye.statut];
  const joursRetard = calculateJoursRetard(impaye.dateEcheance);
  const workflowIndex = getWorkflowIndex(impaye.statut);
  const nextStep = getNextStep(impaye.statut);
  const isCloture = impaye.statut === 'regle';

  return (
    <div className={clsx(styles.impayeCard, isSelected && styles.impayeCardSelected, isCloture && styles.impayeCardCloture)}>
      {/* Header */}
      <div className={styles.impayeHeader}>
        {!isCloture && (
          <button
            className={styles.selectionCheckbox}
            onClick={() => onToggleSelection(impaye.id)}
            aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
          >
            {isSelected ? (
              <SquareCheck size={20} className={styles.checkboxChecked} aria-hidden="true" />
            ) : (
              <Square size={20} aria-hidden="true" />
            )}
          </button>
        )}
        <div className={styles.impayeTitle}>
          <div className={styles.avatarIcon}>
            <User size={20} aria-hidden="true" />
          </div>
          <div>
            <h3>{impaye.coproprietaire.nom}</h3>
            <span className={styles.lotInfo}>
              <Building2 size={12} aria-hidden="true" />
              {impaye.lot} - {impaye.batiment}
            </span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={clsx(styles.montantBadge, isCloture && styles.montantRegle)}>
            {isCloture ? 'Réglé' : `${impaye.montant.toLocaleString('fr-FR')} €`}
          </span>
          <span className={styles.statutBadge} style={{ background: statutConfig.bg, color: statutConfig.color }}>
            {statutConfig.label}
          </span>
        </div>
      </div>

      {/* Workflow Progress */}
      <div className={styles.workflowProgress}>
        {WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = index < workflowIndex;
          const isCurrent = index === workflowIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={clsx(styles.workflowStep, isCompleted && styles.completed, isCurrent && styles.current)}
            >
              <div
                className={styles.stepIcon}
                style={{
                  background: isCompleted || isCurrent ? step.color : undefined,
                  borderColor: step.color,
                }}
              >
                {isCompleted ? <CheckCircle2 size={14} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
              {index < WORKFLOW_STEPS.length - 1 && (
                <div className={styles.stepConnector} style={{ background: isCompleted ? step.color : undefined }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className={styles.impayeContent}>
        <div className={styles.impayeDetails}>
          <div className={styles.detailRow}>
            <Calendar size={14} aria-hidden="true" />
            <span>
              <strong>Période :</strong> {impaye.periode} - {impaye.type}
            </span>
          </div>
          <div className={styles.detailRow}>
            <Clock size={14} aria-hidden="true" />
            <span>
              <strong>Échéance :</strong> {new Date(impaye.dateEcheance).toLocaleDateString('fr-FR')}
            </span>
            <span className={styles.retardBadge}>{joursRetard} jours de retard</span>
          </div>
          {impaye.montant !== impaye.montantInitial && (
            <div className={styles.detailRow}>
              <Euro size={14} aria-hidden="true" />
              <span>
                <strong>Montant initial :</strong> {impaye.montantInitial.toLocaleString('fr-FR')} €
              </span>
              <span className={styles.paiementPartiel}>({impaye.montantInitial - impaye.montant} € déjà réglé)</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <History size={14} aria-hidden="true" />
            <span>
              <strong>Dernière action :</strong> {impaye.historique[impaye.historique.length - 1]?.description}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className={styles.impayeActions}>
          <button className={styles.actionBtn} onClick={() => onOpenDetail(impaye)}>
            <Eye size={16} aria-hidden="true" />
            Détails & Historique
          </button>

          {!isCloture && nextStep && (
            <button className={clsx(styles.actionBtn, styles.primaryAction)} onClick={() => onOpenRelance(impaye)}>
              <Send size={16} aria-hidden="true" />
              {nextStep === 'relance_amiable_1' && 'Envoyer relance 1'}
              {nextStep === 'relance_amiable_2' && 'Envoyer relance 2'}
              {nextStep === 'mise_en_demeure' && 'Mise en demeure'}
              {nextStep === 'contentieux' && 'Passer en contentieux'}
            </button>
          )}

          {!isCloture && (
            <button className={clsx(styles.actionBtn, styles.successAction)} onClick={() => onOpenRegle(impaye)}>
              <CheckCircle2 size={16} aria-hidden="true" />
              Marquer réglé
            </button>
          )}

          {isCloture && (
            <span className={styles.clotureInfo}>
              <CheckCircle2 size={16} aria-hidden="true" />
              Dossier clôturé
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
