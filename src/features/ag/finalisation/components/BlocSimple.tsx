'use client';

import { BlocCard } from './BlocCard';
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
}

/** Revue lecture seule d'une décision déjà activée à l'étape PV (aucune action d'écriture). */
export function BlocSimple({ action }: BlocSimpleProps) {
  const allVariables = action.resolution?.variables || {};
  const variables = Object.fromEntries(
    Object.entries(allVariables).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );

  const label = ACTION_LABELS[action.action_type] || action.action_type;

  // Afficher les variables en masquant les champs internes.
  const displayVars = Object.entries(variables).filter(([k]) => !['period_id'].includes(k));

  return (
    <BlocCard title={label} actionType={action.action_type} status={action.status}>
      {action.resolution?.title && (
        <p className={styles.resolutionTitle}>Résolution : {action.resolution.title}</p>
      )}
      {displayVars.length > 0 && (
        <div className={styles.variables}>
          {displayVars.map(([k, v]) => (
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
