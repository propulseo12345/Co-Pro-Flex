'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, Zap } from 'lucide-react';
import { createUntypedClient } from '@/lib/ag/api/utils';
import styles from './ActivationRecap.module.css';
import clsx from 'clsx';

interface PendingAction {
  id: string;
  action_type: string;
  status: string;
  error_message: string | null;
  resolution: {
    title: string;
  } | null;
}

interface ActivationRecapProps {
  agId: string;
  result: { activated: number; failed: number };
  onClose: () => void;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  APPROVE_ACCOUNTS: 'Approbation des comptes',
  CREATE_BUDGET: 'Creation du budget previsionnel',
  SCHEDULE_BUDGET_PAYMENTS: 'Echeancier du budget',
  CREATE_ALUR_FUND: 'Fonds de travaux ALUR',
  SCHEDULE_ALUR_PAYMENTS: 'Echeancier fonds ALUR',
  CREATE_WORK_BUDGET: 'Budget travaux',
  CREATE_EXCEPTIONAL_CALL: 'Appel de fonds exceptionnel',
  APPOINT_SYNDIC: 'Nomination du syndic',
  ELECT_COUNCIL: 'Election du conseil syndical',
  MANAGE_CONTRACT: 'Gestion de contrat',
  GRANT_QUITUS: 'Quitus au syndic',
};

function getActionLabel(actionType: string): string {
  return ACTION_TYPE_LABELS[actionType] || actionType;
}

export function ActivationRecap({ agId, result, onClose }: ActivationRecapProps) {
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadActions = async () => {
      const supabase = createUntypedClient();
      const { data } = await supabase
        .from('ag_pending_actions')
        .select(`
          id, action_type, status, error_message,
          resolution:ag_resolutions!resolution_id(title)
        `)
        .eq('ag_id', agId)
        .order('created_at');

      if (data) {
        setActions(data as unknown as PendingAction[]);
      }
      setIsLoading(false);
    };

    loadActions();
  }, [agId]);

  const hasFailed = result.failed > 0;
  const HeaderIcon = hasFailed ? AlertCircle : CheckCircle;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={clsx(styles.headerIcon, hasFailed ? styles.headerIconWarning : styles.headerIconSuccess)}>
            <HeaderIcon size={22} />
          </div>
          <h2 className={styles.title}>
            {hasFailed ? 'Activation partielle des decisions' : 'Decisions activees'}
          </h2>
        </div>

        <div className={styles.summary}>
          <div className={clsx(styles.summaryItem, styles.summarySuccess)}>
            <span className={clsx(styles.summaryNumber, styles.summaryNumberSuccess)}>
              {result.activated}
            </span>
            <div className={styles.summaryLabel}>Activee{result.activated > 1 ? 's' : ''}</div>
          </div>
          {result.failed > 0 && (
            <div className={clsx(styles.summaryItem, styles.summaryFailed)}>
              <span className={clsx(styles.summaryNumber, styles.summaryNumberFailed)}>
                {result.failed}
              </span>
              <div className={styles.summaryLabel}>En erreur</div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className={styles.loading}>Chargement des details...</div>
        ) : (
          <div className={styles.actionsList}>
            {actions.map((action) => {
              const isSuccess = action.status === 'activated';
              const isFailed = action.status === 'failed';
              const StatusIcon = isSuccess ? CheckCircle : isFailed ? XCircle : Zap;

              return (
                <div key={action.id} className={styles.actionItem}>
                  <div className={clsx(
                    styles.actionIcon,
                    isSuccess && styles.actionIconSuccess,
                    isFailed && styles.actionIconFailed
                  )}>
                    <StatusIcon size={18} />
                  </div>
                  <div className={styles.actionContent}>
                    <div className={styles.actionLabel}>
                      {getActionLabel(action.action_type)}
                    </div>
                    {isFailed && action.error_message && (
                      <div className={styles.actionError}>{action.error_message}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className={styles.closeBtn} onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
