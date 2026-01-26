'use client';

import { Calendar, AlertTriangle, TrendingUp, Info } from 'lucide-react';
import styles from './Budget.module.css';

interface BudgetProjectionProps {
  budgetAnnuelVote: number;
  totalConsomme: number;
  projectedYearEnd: number;
  projectedDifference: number;
  monthsElapsed: number;
  monthsRemaining: number;
  avgMonthlyConsumption?: number;
  projectionMin?: number;
  projectionMax?: number;
  fiabiliteNiveau?: 'faible' | 'moyenne' | 'bonne';
}

export function BudgetProjection({
  budgetAnnuelVote,
  totalConsomme,
  projectedYearEnd,
  projectedDifference,
  monthsElapsed,
  monthsRemaining,
  avgMonthlyConsumption: avgMonthlyConsumptionProp,
  projectionMin,
  projectionMax,
  fiabiliteNiveau = 'moyenne',
}: BudgetProjectionProps) {
  // Fallback pour compatibilité si avgMonthlyConsumption n'est pas passé
  const avgMonthlyConsumption = avgMonthlyConsumptionProp ?? (monthsElapsed > 0 ? totalConsomme / monthsElapsed : 0);

  // Configuration du badge de fiabilité
  const fiabiliteConfig = {
    faible: {
      label: 'Fiabilité faible',
      className: styles.fiabiliteFaible,
      icon: AlertTriangle,
    },
    moyenne: {
      label: 'Fiabilité moyenne',
      className: styles.fiabiliteMoyenne,
      icon: Info,
    },
    bonne: {
      label: 'Fiabilité bonne',
      className: styles.fiabiliteBonne,
      icon: TrendingUp,
    },
  };

  const config = fiabiliteConfig[fiabiliteNiveau];
  const FiabiliteIcon = config.icon;

  return (
    <div className={`card ${styles.projectionCard}`}>
      <div className={styles.projectionHeader}>
        <Calendar size={24} aria-hidden="true" />
        <h2 className={styles.sectionTitle}>Prévision fin d&apos;année</h2>
        <span className={`${styles.fiabiliteBadge} ${config.className}`}>
          <FiabiliteIcon size={14} aria-hidden="true" />
          {config.label}
        </span>
      </div>

      {fiabiliteNiveau === 'faible' && (
        <div className={styles.projectionWarning}>
          <AlertTriangle size={16} aria-hidden="true" />
          <span>
            Projection basée sur seulement {monthsElapsed} mois de données.
            La prévision sera plus fiable après 3 mois de consommation.
          </span>
        </div>
      )}

      <div className={styles.projectionStats}>
        <div className={styles.projectionStat}>
          <span className={styles.projectionLabel}>Consommation moyenne mensuelle</span>
          <span className={styles.projectionValue}>
            {avgMonthlyConsumption.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
        </div>
        <div className={styles.projectionStat}>
          <span className={styles.projectionLabel}>Projection fin d&apos;année</span>
          <span className={`${styles.projectionValue} ${styles.projectionMain}`}>
            {projectedYearEnd.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
          {projectionMin !== undefined && projectionMax !== undefined && projectionMin !== projectionMax && (
            <span className={styles.projectionInterval}>
              (entre {projectionMin.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              et {projectionMax.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €)
            </span>
          )}
        </div>
        <div className={styles.projectionStat}>
          <span className={styles.projectionLabel}>
            {projectedDifference >= 0 ? 'Économie prévue' : 'Dépassement prévu'}
          </span>
          <span
            className={`${styles.projectionValue} ${
              projectedDifference >= 0 ? styles.projectionPositive : styles.projectionNegative
            }`}
          >
            {projectedDifference >= 0 ? '+' : ''}
            {projectedDifference.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </span>
        </div>
      </div>

      <div className={styles.projectionProgress}>
        <div className={styles.projectionProgressBar}>
          <div
            className={styles.projectionProgressFill}
            style={{
              width: `${Math.min((projectedYearEnd / budgetAnnuelVote) * 100, 100)}%`,
              backgroundColor: projectedDifference >= 0 ? 'var(--success)' : 'var(--danger)',
            }}
          />
          <div
            className={styles.projectionProgressMarker}
            style={{ left: `${Math.min((totalConsomme / budgetAnnuelVote) * 100, 100)}%` }}
            title="Consommation actuelle"
          />
        </div>
        <div className={styles.projectionProgressLabels}>
          <span>Actuel: {((totalConsomme / budgetAnnuelVote) * 100).toFixed(0)}%</span>
          <span>Prévu: {((projectedYearEnd / budgetAnnuelVote) * 100).toFixed(0)}%</span>
        </div>
      </div>

      <p className={styles.projectionNote}>
        Basé sur {monthsElapsed} mois de données ({monthsRemaining} mois restants)
      </p>
    </div>
  );
}
