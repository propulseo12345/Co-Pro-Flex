'use client';

import { useState, useCallback } from 'react';
import { BlocCard } from './BlocCard';
import { markActionActivated } from '@/lib/ag/api/finalisation.api';
import type { PendingAction } from '@/lib/ag/api/finalisation.api';
import styles from './BlocSimple.module.css';

const ACTION_LABELS: Record<string, string> = {
  APPROVE_ACCOUNTS: 'Approbation des comptes',
  GRANT_QUITUS: 'Quitus au syndic',
  APPOINT_SYNDIC: 'Nomination du syndic',
  DESIGNATE_BUREAU: 'Bureau de séance',
  SCHEDULE_BUDGET_PAYMENTS: 'Échéancier du budget',
  SCHEDULE_ALUR_PAYMENTS: 'Échéancier fonds ALUR',
  CREATE_WORK_BUDGET: 'Budget travaux',
  CREATE_EXCEPTIONAL_CALL: 'Appel de fonds exceptionnel',
  MANAGE_CONTRACT: 'Gestion de contrat',
  ELECT_COUNCIL: 'Conseil syndical',
};

interface BlocSimpleProps {
  agId: string;
  action: PendingAction;
  onActivated: () => void;
}

export function BlocSimple({ agId, action, onActivated }: BlocSimpleProps) {
  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
  const [error, setError] = useState<string | null>(null);

  const variables = action.resolution?.variables || {};

  const handleConfirm = useCallback(async () => {
    setStatus('loading');
    setError(null);
    const result = await markActionActivated(agId, action.action_type, variables as Record<string, unknown>);
    if (result.success) {
      setStatus('activated');
      onActivated();
    } else {
      setStatus('failed');
      setError(result.error || 'Erreur inconnue');
    }
  }, [agId, action.action_type, variables, onActivated]);

  const label = ACTION_LABELS[action.action_type] || action.action_type;

  return (
    <BlocCard
      title={label}
      actionType={action.action_type}
      status={status}
      error={error}
      onConfirm={handleConfirm}
      confirmLabel="Valider"
    >
      {action.resolution?.title && (
        <p className={styles.resolutionTitle}>Résolution : {action.resolution.title}</p>
      )}
      {Object.keys(variables).length > 0 && (
        <div className={styles.variables}>
          {Object.entries(variables).map(([k, v]) => (
            <div key={k} className={styles.variable}>
              <span className={styles.varKey}>{k}</span>
              <span className={styles.varValue}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </BlocCard>
  );
}
