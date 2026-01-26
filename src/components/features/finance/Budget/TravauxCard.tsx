'use client';

import Link from 'next/link';
import { Plus, History, ArrowRight } from 'lucide-react';
import { BudgetTravaux, getProgressColor, getProgressPercentage, getBudgetAppele, getRestantAAppeler } from './types';
import styles from './Budget.module.css';

interface TravauxCardProps {
  travaux: BudgetTravaux;
  onOpenDetail: (travaux: BudgetTravaux) => void;
  onNewAppelFonds?: (travaux: BudgetTravaux) => void;
}

export function TravauxCard({ travaux, onOpenDetail, onNewAppelFonds }: TravauxCardProps) {
  const percentage = getProgressPercentage(travaux.consomme, travaux.budgetVote);
  const color = getProgressColor(travaux.consomme, travaux.budgetVote);
  const devisVsBudget = ((travaux.devisAssocie / travaux.budgetVote) * 100).toFixed(0);

  // Nouveaux calculs pour les libellés corrects
  const budgetAppele = getBudgetAppele(travaux.appelsDeFonds);
  const restantAAppeler = getRestantAAppeler(travaux.budgetVote, travaux.appelsDeFonds);

  return (
    <div className={`${styles.travauxCardEnhanced} card`}>
      {/* Header avec statut */}
      <div className={styles.travauxCardHeader}>
        <div>
          <h3 className={styles.travauxTitle}>{travaux.titre}</h3>
          <p className={styles.travauxDescription}>{travaux.description}</p>
          <span className={styles.travauxDate}>
            Voté le {new Date(travaux.dateVote).toLocaleDateString('fr-FR')}
          </span>
        </div>
        <span
          className={`${styles.statutBadgeEnhanced} ${styles[`statut${travaux.statut}Enhanced`]}`}
        >
          {travaux.statut === 'A_VENIR'
            ? 'À venir'
            : travaux.statut === 'EN_COURS'
            ? 'En cours'
            : 'Terminé'}
        </span>
      </div>

      {/* Graphique circulaire + Stats */}
      <div className={styles.travauxVisual}>
        {/* Donut Chart */}
        <div className={styles.donutChartContainer}>
          <svg className={styles.donutChart} viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="var(--bg-secondary)"
              strokeWidth="12"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.51} 251`}
              transform="rotate(-90 50 50)"
              className={styles.donutProgress}
            />
          </svg>
          <div className={styles.donutCenter}>
            <span className={styles.donutPercentage} style={{ color }}>
              {percentage.toFixed(0)}%
            </span>
            <span className={styles.donutLabel}>consommé</span>
          </div>
        </div>

        {/* Stats détaillées */}
        <div className={styles.travauxStatsEnhanced}>
          <div className={styles.travauxStatItem}>
            <div className={styles.travauxStatHeader}>
              <span className={styles.travauxStatLabel}>Budget voté</span>
              <span className={styles.travauxStatBadge}>AG</span>
            </div>
            <span className={styles.travauxStatValue}>{travaux.budgetVote.toLocaleString()} €</span>
          </div>
          <div className={styles.travauxStatItem}>
            <div className={styles.travauxStatHeader}>
              <span className={styles.travauxStatLabel}>Budget appelé</span>
              <span
                className={`${styles.travauxStatBadge} ${
                  budgetAppele > 0
                    ? styles.travauxStatBadgeSuccess
                    : ''
                }`}
              >
                {((budgetAppele / travaux.budgetVote) * 100).toFixed(0)}%
              </span>
            </div>
            <span className={styles.travauxStatValue} style={{ color: 'var(--info)' }}>
              {budgetAppele.toLocaleString()} €
            </span>
          </div>
          <div className={styles.travauxStatItem}>
            <div className={styles.travauxStatHeader}>
              <span className={styles.travauxStatLabel}>Consommé</span>
              <span className={styles.travauxStatBadge}>Factures</span>
            </div>
            <span className={styles.travauxStatValue} style={{ color }}>
              {travaux.consomme.toLocaleString()} €
            </span>
          </div>
          <div className={styles.travauxStatItem}>
            <div className={styles.travauxStatHeader}>
              <span className={styles.travauxStatLabel}>Restant à appeler</span>
            </div>
            <span
              className={styles.travauxStatValue}
              style={{ color: restantAAppeler > 0 ? 'var(--success)' : 'var(--text-secondary)' }}
            >
              {restantAAppeler.toLocaleString()} €
            </span>
          </div>
        </div>
      </div>

      {/* Barre de progression détaillée */}
      <div className={styles.travauxProgressSection}>
        <div className={styles.travauxProgressHeader}>
          <span>Progression du budget</span>
          <span>{percentage.toFixed(1)}%</span>
        </div>
        <div className={styles.travauxProgressBar}>
          <div
            className={styles.travauxProgressFill}
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
            }}
          />
          <div
            className={styles.travauxProgressMarker}
            style={{
              left: `${Math.min((travaux.devisAssocie / travaux.budgetVote) * 100, 100)}%`,
            }}
            title={`Devis: ${travaux.devisAssocie.toLocaleString()} €`}
          />
        </div>
        <div className={styles.travauxProgressLegend}>
          <span>Devis: {devisVsBudget}% du budget</span>
        </div>
      </div>

      {/* Appels de fonds */}
      <div className={styles.appelsFondsEnhanced}>
        <div className={styles.appelsFondsTitleRow}>
          <h4 className={styles.appelsFondsTitle}>
            Appels de fonds
            <span className={styles.appelsFondsCount}>{travaux.appelsDeFonds.length}</span>
          </h4>
          <Link
            href={`/finance/appels-fonds?type=travaux&projet=${travaux.id}`}
            className={styles.appelsFondsLink}
          >
            Voir tout
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        {travaux.appelsDeFonds.length > 0 ? (
          <div className={styles.appelsFondsListEnhanced}>
            {travaux.appelsDeFonds.map((appel) => (
              <div key={appel.id} className={styles.appelFondsItemEnhanced}>
                <div className={styles.appelFondsInfo}>
                  <span className={styles.appelFondsDate}>
                    {new Date(appel.date).toLocaleDateString('fr-FR')}
                  </span>
                  <span className={styles.appelFondsMontant}>
                    {appel.montant.toLocaleString()} €
                  </span>
                </div>
                <span
                  className={`${styles.appelStatutEnhanced} ${
                    styles[`appelStatut${appel.statut}Enhanced`]
                  }`}
                >
                  {appel.statut === 'PAYE'
                    ? 'Payé'
                    : appel.statut === 'ENVOYE'
                    ? 'Envoyé'
                    : 'En attente'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noAppels}>Aucun appel de fonds programmé</p>
        )}
      </div>

      {/* Actions */}
      <div className={styles.travauxActionsEnhanced}>
        <button className="btn btn-secondary" onClick={() => onOpenDetail(travaux)}>
          <History size={16} aria-hidden="true" />
          Historique complet
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onNewAppelFonds?.(travaux)}
          disabled={restantAAppeler <= 0}
          title={restantAAppeler <= 0 ? 'Budget intégralement appelé' : undefined}
        >
          <Plus size={16} aria-hidden="true" />
          Nouvel appel de fonds
        </button>
      </div>
    </div>
  );
}
