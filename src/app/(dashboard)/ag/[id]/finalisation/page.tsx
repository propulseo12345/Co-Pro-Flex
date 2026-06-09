'use client';

import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useFinalisationPage } from '@/features/ag/finalisation/hooks/useFinalisationPage';
import { BlocBudget } from '@/features/ag/finalisation/components/BlocBudget';
import { BlocALUR } from '@/features/ag/finalisation/components/BlocALUR';
import { BlocSimple } from '@/features/ag/finalisation/components/BlocSimple';
import { BlocConseilSyndical } from '@/features/ag/finalisation/components/BlocConseilSyndical';
import { BlocAppelsFonds } from '@/features/ag/finalisation/components/BlocAppelsFonds';
import styles from './finalisation.module.css';

const BUDGET_ACTION_TYPES = ['CREATE_BUDGET'];
const ALUR_ACTION_TYPES = ['CREATE_ALUR_FUND'];
const APPELS_ACTION_TYPES = ['SCHEDULE_BUDGET_PAYMENTS'];
const HIDDEN_ACTION_TYPES = ['SCHEDULE_ALUR_PAYMENTS']; // fusionné dans BlocAppelsFonds
const SIMPLE_ACTION_TYPES = [
  'CREATE_WORK_BUDGET',
  'CREATE_EXCEPTIONAL_CALL', 'APPROVE_ACCOUNTS', 'GRANT_QUITUS', 'APPOINT_SYNDIC',
  'DESIGNATE_BUREAU', 'MANAGE_CONTRACT',
];

export default function FinalisationPage() {
  const params = useParams();
  const router = useRouter();
  const agId = params.id as string;

  const {
    actions,
    isLoading,
    loadError,
    allActivated,
    isFinalizing,
    finalizeError,
    isFinalized,
    handleFinalize,
  } = useFinalisationPage(agId);

  if (isLoading) {
    return <div className={styles.loading}>Chargement des décisions…</div>;
  }

  if (loadError) {
    return <div className={styles.error}>{loadError}</div>;
  }

  if (actions.length === 0) {
    return (
      <div className={styles.empty}>
        <CheckCircle size={40} className={styles.emptyIcon} />
        <h2>Aucune décision à créer</h2>
        <p>Aucune résolution adoptée avec action automatique n&apos;a été détectée.</p>
        <button className={styles.nextBtn} onClick={() => router.push(`/ag/${agId}/pv`)}>
          Retour au PV <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (isFinalized) {
    return (
      <div className={styles.finalized}>
        <CheckCircle size={48} className={styles.finalizedIcon} />
        <h2>AG finalisée</h2>
        <p>Toutes les décisions ont été créées avec succès.</p>
        <button className={styles.nextBtn} onClick={() => router.push(`/ag`)}>
          Retour au tableau de bord <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  const budgetAction = actions.find(a => BUDGET_ACTION_TYPES.includes(a.action_type));
  const alurAction = actions.find(a => ALUR_ACTION_TYPES.includes(a.action_type));
  const scheduleAlurAction = actions.find(a => a.action_type === 'SCHEDULE_ALUR_PAYMENTS');
  const appelsAction = actions.find(a => APPELS_ACTION_TYPES.includes(a.action_type));
  const councilAction = actions.find(a => a.action_type === 'ELECT_COUNCIL');
  const simpleActions = actions.filter(a =>
    SIMPLE_ACTION_TYPES.includes(a.action_type) && !HIDDEN_ACTION_TYPES.includes(a.action_type)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Finalisation des décisions</h1>
        <p className={styles.subtitle}>
          {actions.filter(a => a.status === 'activated').length}/{actions.length} décisions créées
        </p>
      </div>

      <div className={styles.blocs}>
        {budgetAction && (
          <BlocBudget
            agId={agId}
            action={budgetAction}
          />
        )}

        {alurAction && (
          <BlocALUR
            agId={agId}
            action={alurAction}
            scheduleAction={scheduleAlurAction}
          />
        )}

        {appelsAction && (
          <BlocAppelsFonds
            agId={agId}
            action={appelsAction}
            alurAction={alurAction}
          />
        )}

        {councilAction && (
          <BlocConseilSyndical
            agId={agId}
            action={councilAction}
          />
        )}

        {simpleActions.map(action => (
          <BlocSimple
            key={action.id}
            agId={agId}
            action={action}
          />
        ))}
      </div>

      <div className={styles.footerActions}>
        {finalizeError && <p className={styles.error}>{finalizeError}</p>}
        <button
          className={styles.finalizeBtn}
          onClick={handleFinalize}
          disabled={!allActivated || isFinalizing}
        >
          <CheckCircle size={18} />
          {isFinalizing ? 'Finalisation…' : 'Marquer comme terminée'}
        </button>
      </div>
    </div>
  );
}
