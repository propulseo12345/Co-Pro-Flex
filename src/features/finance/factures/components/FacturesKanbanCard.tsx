'use client';

import clsx from 'clsx';
import type { Facture } from '@/components/features/finance/Factures/types';
import { isFactureEnRetard, getJoursAvantEcheance } from '@/components/features/finance/Factures/types';
import { POSTE_BUDGET_LABELS } from '@/components/features/finance/Factures/utils';
import type { KanbanColumnId } from '../types';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanCardProps {
  facture: Facture;
  columnId: KanbanColumnId;
  onClick: (facture: Facture) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

export function FacturesKanbanCard({ facture, columnId, onClick }: FacturesKanbanCardProps) {
  const isOverdue = isFactureEnRetard(facture);
  const joursRetard = isOverdue ? Math.abs(getJoursAvantEcheance(facture.dateEcheance)) : 0;
  const isPaid = facture.statut === 'PAYEE';

  return (
    <div
      className={clsx(
        styles.card,
        columnId === 'overdue' && styles.cardOverdue,
        isPaid && styles.cardPaid,
      )}
      onClick={() => onClick(facture)}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardSupplier}>{facture.fournisseur}</div>
        <div className={clsx(
          styles.cardAmount,
          columnId === 'overdue' && styles.amountRed,
          isPaid && styles.amountGreen,
        )}>
          {formatCurrency(facture.montant)}
        </div>
      </div>
      <div className={styles.cardRef}>{facture.reference}</div>
      <div className={styles.cardBottom}>
        {isOverdue ? (
          <div className={styles.cardUrgent}>⚠ {joursRetard}j de retard</div>
        ) : isPaid ? (
          <div className={styles.cardDate}>✓ {facture.datePaiement ? formatDateShort(facture.datePaiement) : 'Payée'}</div>
        ) : (
          <div className={styles.cardDate}>Éch. {formatDateShort(facture.dateEcheance)}</div>
        )}
        {facture.posteBudgetaire && (
          <div className={styles.cardPoste}>
            {POSTE_BUDGET_LABELS[facture.posteBudgetaire] ?? facture.posteBudgetaire}
          </div>
        )}
      </div>
    </div>
  );
}
