'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Bell, ArrowRight } from 'lucide-react';
import type { AlerteDelai, StatsAlertes, AppelFonds } from './types';
import { calculerToutesAlertes, calculerStatsAlertes, formatDate, formatDateRelative } from './utils';
import styles from './appels-fonds.module.css';

interface AppelsFondsAlertsProps {
  appels: AppelFonds[];
  onActionClick?: (alerte: AlerteDelai) => void;
  maxAlertes?: number;
}

export function AppelsFondsAlerts({ appels, onActionClick, maxAlertes = 5 }: AppelsFondsAlertsProps) {
  const [expanded, setExpanded] = useState(false);

  const alertes = useMemo(() => calculerToutesAlertes(appels), [appels]);
  const stats = useMemo(() => calculerStatsAlertes(alertes), [alertes]);

  if (alertes.length === 0) {
    return null;
  }

  const alertesAffichees = expanded ? alertes : alertes.slice(0, maxAlertes);
  const hasMore = alertes.length > maxAlertes;

  const getNiveauClass = (niveau: AlerteDelai['niveau']) => {
    switch (niveau) {
      case 'critical':
        return styles.alerteDelaiCritical;
      case 'warning':
        return styles.alerteDelaiWarning;
      case 'info':
        return styles.alerteDelaiInfo;
    }
  };

  const getNiveauIcon = (niveau: AlerteDelai['niveau']) => {
    switch (niveau) {
      case 'critical':
        return <AlertTriangle size={18} />;
      case 'warning':
        return <Clock size={18} />;
      case 'info':
        return <Bell size={18} />;
    }
  };

  const getSummaryClass = () => {
    if (stats.critiques > 0) return styles.alertesSummaryCritical;
    if (stats.warnings > 0) return styles.alertesSummaryWarning;
    return styles.alertesSummaryInfo;
  };

  return (
    <div className={styles.alertesDelaisContainer}>
      {/* Résumé */}
      <div className={`${styles.alertesSummary} ${getSummaryClass()}`}>
        <div className={styles.alertesSummaryIcon}>
          {stats.critiques > 0 ? (
            <AlertTriangle size={20} />
          ) : (
            <Clock size={20} />
          )}
        </div>
        <div className={styles.alertesSummaryContent}>
          <h3 className={styles.alertesSummaryTitle}>
            {stats.total} alerte{stats.total > 1 ? 's' : ''} de planification
          </h3>
          <div className={styles.alertesSummaryStats}>
            {stats.critiques > 0 && (
              <span className={`${styles.alertesSummaryStat} ${styles.alertesSummaryStatCritical}`}>
                <AlertTriangle size={12} />
                {stats.critiques} critique{stats.critiques > 1 ? 's' : ''}
              </span>
            )}
            {stats.warnings > 0 && (
              <span className={`${styles.alertesSummaryStat} ${styles.alertesSummaryStatWarning}`}>
                <Clock size={12} />
                {stats.warnings} avertissement{stats.warnings > 1 ? 's' : ''}
              </span>
            )}
            {stats.infos > 0 && (
              <span className={`${styles.alertesSummaryStat} ${styles.alertesSummaryStatInfo}`}>
                <Bell size={12} />
                {stats.infos} info{stats.infos > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        {hasMore && (
          <button
            className={styles.alertesSummaryToggle}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Réduire' : `Voir tout (${alertes.length})`}
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Liste des alertes */}
      {alertesAffichees.map((alerte) => (
        <div
          key={alerte.id}
          className={`${styles.alerteDelai} ${getNiveauClass(alerte.niveau)}`}
        >
          <div className={styles.alerteDelaiIcon}>
            {getNiveauIcon(alerte.niveau)}
          </div>
          <div className={styles.alerteDelaiContent}>
            <div className={styles.alerteDelaiHeader}>
              <h4 className={styles.alerteDelaiTitle}>
                {getTypeLabel(alerte.type)}
              </h4>
              <span className={styles.alerteDelaiJours}>
                {alerte.joursRestants > 0
                  ? `J-${alerte.joursRestants}`
                  : alerte.joursRestants === 0
                  ? "Aujourd'hui"
                  : `J+${Math.abs(alerte.joursRestants)}`}
              </span>
            </div>
            <p className={styles.alerteDelaiMessage}>{alerte.message}</p>
            <p className={styles.alerteDelaiAppel}>
              {alerte.appelDescription} - Échéance : {formatDate(alerte.dateEcheance)} ({formatDateRelative(alerte.dateEcheance)})
            </p>
            {alerte.action && onActionClick && (
              <button
                className={styles.alerteDelaiAction}
                onClick={() => onActionClick(alerte)}
              >
                {alerte.action.label}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Bouton voir plus */}
      {hasMore && !expanded && (
        <button
          className={styles.alertesSummaryToggle}
          onClick={() => setExpanded(true)}
          style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-sm)' }}
        >
          Voir {alertes.length - maxAlertes} alerte{alertes.length - maxAlertes > 1 ? 's' : ''} de plus
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}

function getTypeLabel(type: AlerteDelai['type']): string {
  switch (type) {
    case 'GENERATION_EN_RETARD':
      return 'Génération en retard';
    case 'DELAI_INSUFFISANT':
      return 'Délai de paiement insuffisant';
    case 'ENVOI_EN_RETARD':
      return 'Envoi en retard';
    case 'RELANCE_1_DUE':
      return '1ère relance recommandée';
    case 'RELANCE_2_DUE':
      return 'Relance urgente';
    case 'ECHEANCE_IMMINENTE':
      return 'Échéance imminente';
  }
}
