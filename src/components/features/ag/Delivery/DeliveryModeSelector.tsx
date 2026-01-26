'use client';

import { Mail, Send, MailCheck, Users, Info, AlertTriangle } from 'lucide-react';
import { DeliveryMode } from '@/types/enums';
import { GLOBAL_DELIVERY_OPTIONS } from '@/lib/constants/delivery';
import type { DeliveryStats } from '@/hooks/modules/useDeliveryConfig';
import styles from './DeliveryModeSelector.module.css';

interface DeliveryModeSelectorProps {
  selectedMode: DeliveryMode | 'PAR_COPROPRIETAIRE';
  isRegistered: boolean;
  stats: DeliveryStats;
  onModeChange: (mode: DeliveryMode | 'PAR_COPROPRIETAIRE') => void;
  onRegisteredChange: (isRegistered: boolean) => void;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  [DeliveryMode.EMAIL]: <Mail size={20} aria-hidden="true" />,
  [DeliveryMode.COURRIER]: <Send size={20} aria-hidden="true" />,
  [DeliveryMode.EMAIL_ET_COURRIER]: <MailCheck size={20} aria-hidden="true" />,
  PAR_COPROPRIETAIRE: <Users size={20} aria-hidden="true" />,
};

export function DeliveryModeSelector({
  selectedMode,
  isRegistered,
  stats,
  onModeChange,
  onRegisteredChange,
}: DeliveryModeSelectorProps) {
  const showPostalOptions =
    selectedMode === DeliveryMode.COURRIER ||
    selectedMode === DeliveryMode.EMAIL_ET_COURRIER ||
    selectedMode === 'PAR_COPROPRIETAIRE';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Mode d&apos;envoi par défaut</h2>
        <p className={styles.subtitle}>
          Sélectionnez comment envoyer les convocations aux copropriétaires
        </p>
      </div>

      <div className={styles.optionsGrid}>
        {GLOBAL_DELIVERY_OPTIONS.map((option) => {
          const isSelected = selectedMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onModeChange(option.value)}
              className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
            >
              <div className={styles.optionIcon}>
                {MODE_ICONS[option.value]}
              </div>
              <div className={styles.optionContent}>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionDescription}>{option.description}</span>
              </div>
              {isSelected && (
                <div className={styles.selectedBadge}>
                  <span>Sélectionné</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {showPostalOptions && (
        <div className={styles.postalOptions}>
          <div className={styles.postalHeader}>
            <Send size={18} aria-hidden="true" />
            <span>Options d&apos;envoi postal</span>
          </div>

          <label className={styles.toggleRow}>
            <input
              type="checkbox"
              checked={isRegistered}
              onChange={(e) => onRegisteredChange(e.target.checked)}
              className={styles.checkbox}
            />
            <div className={styles.toggleContent}>
              <span className={styles.toggleLabel}>Courrier recommandé (LRAR)</span>
              <span className={styles.toggleDescription}>
                Envoi avec accusé de réception - 6,50€ par courrier
              </span>
            </div>
          </label>

          <div className={styles.integrationNotice}>
            <Info size={16} aria-hidden="true" />
            <span>Intégration La Poste / Docapost à venir</span>
          </div>

          {stats.estimatedPostalCost > 0 && (
            <div className={styles.costEstimate}>
              <span>Coût postal estimé :</span>
              <strong>{stats.estimatedPostalCost.toFixed(2)} €</strong>
            </div>
          )}
        </div>
      )}

      {stats.blocked > 0 && (
        <div className={styles.warningBanner}>
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            {stats.blocked} copropriétaire(s) avec données manquantes.
            Complétez les informations avant de continuer.
          </span>
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.byEmail}</span>
          <span className={styles.statLabel}>Email seul</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.byCourrier}</span>
          <span className={styles.statLabel}>Courrier seul</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{stats.byBoth}</span>
          <span className={styles.statLabel}>Les deux</span>
        </div>
        <div className={`${styles.statItem} ${stats.blocked > 0 ? styles.statItemWarning : ''}`}>
          <span className={styles.statValue}>{stats.eligible}/{stats.totalOwners}</span>
          <span className={styles.statLabel}>Éligibles</span>
        </div>
      </div>
    </div>
  );
}
