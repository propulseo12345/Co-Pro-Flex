'use client';

import { useState, useCallback } from 'react';
import { useCopro } from '@/providers/CoproContext';
import { BlocCard } from './BlocCard';
import { markActionActivated, appointSyndicFromAg } from '@/lib/ag/api/finalisation.api';
import * as financeApi from '@/lib/finance/api';
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
  const { currentCoproId } = useCopro();
  const [status, setStatus] = useState<'pending' | 'activated' | 'failed' | 'loading'>(
    action.status as 'pending' | 'activated' | 'failed'
  );
  const [error, setError] = useState<string | null>(null);

  const allVariables = action.resolution?.variables || {};
  const variables = Object.fromEntries(
    Object.entries(allVariables).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  );

  const isApproveAccounts = action.action_type === 'APPROVE_ACCOUNTS';
  const isAppointSyndic = action.action_type === 'APPOINT_SYNDIC';

  const handleAppointSyndic = useCallback(async () => {
    if (!currentCoproId) {
      setStatus('failed');
      setError('Copropriété non sélectionnée');
      return;
    }
    setStatus('loading');
    setError(null);

    const vars = variables as Record<string, string>;
    const nomSyndic = vars.nom_syndic;
    const dureeMois = parseInt(vars.duree_mandat_mois || '12', 10);
    const honoraires = parseFloat(vars.honoraires_annuels_ttc || '0');

    if (!nomSyndic) {
      setStatus('failed');
      setError('Nom du syndic manquant dans la résolution.');
      return;
    }

    // Use today as AG date (nomination date)
    const agDate = new Date().toISOString().split('T')[0];

    const syndicResult = await appointSyndicFromAg(
      currentCoproId, agId, nomSyndic, dureeMois, honoraires, agDate
    );

    if (!syndicResult.success) {
      setStatus('failed');
      setError(syndicResult.error || 'Erreur création contrat syndic');
      return;
    }

    // Mark the AG action as activated
    const result = await markActionActivated(agId, action.action_type, {
      ...variables,
      contract_id: syndicResult.contract_id,
    } as Record<string, unknown>);

    if (result.success) {
      setStatus('activated');
      onActivated();
    } else {
      setStatus('failed');
      setError(result.error || 'Erreur inconnue');
    }
  }, [agId, action.action_type, variables, currentCoproId, onActivated]);

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

  const findPeriod = useCallback(async () => {
    if (!currentCoproId) return null;
    const dateDebut = (variables as Record<string, string>).date_debut;
    const dateFin = (variables as Record<string, string>).date_fin;
    if (!dateDebut || !dateFin) return null;
    const result = await financeApi.findPeriodByDates(currentCoproId, dateDebut, dateFin);
    return result.data;
  }, [currentCoproId, variables]);

  const handleApproveOrReject = useCallback(async (decision: 'approved' | 'rejected') => {
    setStatus('loading');
    setError(null);

    // 1. Find the matching period
    const period = await findPeriod();
    if (!period) {
      setStatus('failed');
      setError('Exercice comptable introuvable pour ces dates.');
      return;
    }

    if (period.status !== 'closed') {
      setStatus('failed');
      setError(`L'exercice doit être clôturé avant approbation (statut actuel : ${period.status}).`);
      return;
    }

    // 2. Approve or reject the period
    const apiCall = decision === 'approved' ? financeApi.approvePeriod : financeApi.rejectPeriod;
    const periodResult = await apiCall(period.id);
    if (periodResult.error) {
      setStatus('failed');
      setError(periodResult.error);
      return;
    }

    // 3. Mark the AG action as activated
    const result = await markActionActivated(agId, action.action_type, {
      ...variables,
      decision,
      period_id: period.id,
    } as Record<string, unknown>);

    if (result.success) {
      setStatus('activated');
      onActivated();
    } else {
      setStatus('failed');
      setError(result.error || 'Erreur inconnue');
    }
  }, [agId, action.action_type, variables, findPeriod, onActivated]);

  const label = ACTION_LABELS[action.action_type] || action.action_type;

  // Display variables but filter out internal ones
  const displayVars = Object.entries(variables).filter(([k]) => !['period_id'].includes(k));

  return (
    <BlocCard
      title={label}
      actionType={action.action_type}
      status={status}
      error={error}
      onConfirm={isApproveAccounts ? undefined : isAppointSyndic ? handleAppointSyndic : handleConfirm}
      confirmLabel={isAppointSyndic ? 'Nommer le syndic' : 'Valider'}
      dualActions={isApproveAccounts ? {
        onApprove: () => handleApproveOrReject('approved'),
        onReject: () => handleApproveOrReject('rejected'),
        approveLabel: 'Approuver les comptes',
        rejectLabel: 'Refuser les comptes',
      } : undefined}
    >
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
