/**
 * AGQuickActions - Actions rapides contextuelles pour le Dashboard AG
 *
 * @description Affiche des actions recommandées basées sur l'état actuel des AG.
 *              Les actions s'adaptent automatiquement au contexte.
 *
 * @created 2026-01-19 (Bug #75)
 */

'use client';

import Link from 'next/link';
import { useAGContext, type QuickAction } from '@/hooks/modules/useAGContext';
import { useCopro } from '@/providers/CoproContext';
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './AGQuickActions.module.css';
import clsx from 'clsx';

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export function AGQuickActions() {
  const { currentCoproId } = useCopro();
  const { state, stateLabel, actionsRecommandees, joursAvantProchaine, alertes, isLoading } = useAGContext(currentCoproId);

  return (
    <div className={styles.container}>
      {/* Alertes contextuelles */}
      {alertes.length > 0 && (
        <div className={styles.alertes}>
          {alertes.map((alerte, index) => (
            <div
              key={index}
              className={clsx(styles.alerte, styles[`alerte_${alerte.type}`])}
            >
              <div className={styles.alerteIcon}>
                {alerte.type === 'error' && <AlertCircle size={20} />}
                {alerte.type === 'warning' && <AlertTriangle size={20} />}
                {alerte.type === 'info' && <Info size={20} />}
                {alerte.type === 'success' && <CheckCircle size={20} />}
              </div>
              <div className={styles.alerteContent}>
                <strong className={styles.alerteTitle}>{alerte.title}</strong>
                <p className={styles.alerteMessage}>{alerte.message}</p>
              </div>
              {alerte.action && (
                <Link href={alerte.action.href} className={styles.alerteAction}>
                  {alerte.action.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Titre avec badge contextuel */}
      <div className={styles.header}>
        <h3 className={styles.title}>{stateLabel}</h3>
        {joursAvantProchaine !== null && joursAvantProchaine > 0 && (
          <span className={styles.badge}>J-{joursAvantProchaine}</span>
        )}
        {state === 'ag_jour_j' && (
          <span className={clsx(styles.badge, styles.badgeLive)}>En direct</span>
        )}
      </div>

      {/* Actions contextuelles */}
      <div className={styles.actions}>
        {actionsRecommandees.map((action) => (
          <ActionButton key={action.id} action={action} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT ACTION BUTTON
// ============================================

function ActionButton({ action }: { action: QuickAction }) {
  const Icon = action.icon;

  const buttonContent = (
    <div
      className={clsx(
        styles.actionButton,
        action.disabled && styles.actionButtonDisabled,
        action.variant === 'primary' && styles.actionButtonPrimary,
        action.variant === 'warning' && styles.actionButtonWarning,
        action.variant === 'success' && styles.actionButtonSuccess,
        action.priority === 'high' && styles.actionButtonHigh
      )}
      title={action.disabled ? action.disabledReason : undefined}
    >
      <div
        className={clsx(
          styles.actionIcon,
          action.variant === 'primary' && styles.actionIconPrimary,
          action.variant === 'warning' && styles.actionIconWarning,
          action.variant === 'success' && styles.actionIconSuccess
        )}
      >
        <Icon size={20} />
      </div>

      <div className={styles.actionContent}>
        <div className={styles.actionLabelRow}>
          <span className={styles.actionLabel}>{action.label}</span>
          {action.badge && (
            <span
              className={clsx(
                styles.actionBadge,
                action.variant === 'warning' && styles.actionBadgeWarning,
                action.variant === 'success' && styles.actionBadgeSuccess
              )}
            >
              {action.badge}
            </span>
          )}
        </div>
        {action.description && (
          <p className={styles.actionDescription}>{action.description}</p>
        )}
      </div>
    </div>
  );

  if (action.disabled) {
    return <div className={styles.actionWrapper}>{buttonContent}</div>;
  }

  if (action.href) {
    return (
      <Link href={action.href} className={styles.actionWrapper}>
        {buttonContent}
      </Link>
    );
  }

  return (
    <button onClick={action.onClick} className={styles.actionWrapper}>
      {buttonContent}
    </button>
  );
}

export default AGQuickActions;
