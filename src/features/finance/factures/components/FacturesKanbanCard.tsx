'use client';

import clsx from 'clsx';
import type { Facture } from '@/components/features/finance/Factures/types';
import { isFactureEnRetard, getJoursAvantEcheance } from '@/components/features/finance/Factures/types';
import { POSTE_BUDGET_LABELS } from '@/components/features/finance/Factures/utils';
import type { KanbanColumnId, KanbanFacture } from '../types';
import styles from './FacturesKanban.module.css';

interface FacturesKanbanCardProps {
  facture: KanbanFacture;
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
  const isAvoir = facture.typeDocument === 'AVOIR';
  const isOverdue = !isAvoir && isFactureEnRetard(facture);
  const joursRetard = isOverdue ? Math.abs(getJoursAvantEcheance(facture.dateEcheance)) : 0;
  const isPaid = facture.statut === 'PAYEE';
  const hasAvoirs = facture.avoirsDeduits > 0;

  return (
    <div
      className={clsx(
        styles.card,
        columnId === 'overdue' && styles.cardOverdue,
        !isAvoir && isPaid && styles.cardPaid,
      )}
      onClick={() => onClick(facture)}
    >
      <div className={styles.cardTop}>
        <div className={styles.cardSupplier}>{facture.fournisseur}</div>
        <div className={clsx(
          styles.cardAmount,
          columnId === 'overdue' && styles.amountRed,
          !isAvoir && isPaid && styles.amountGreen,
          isAvoir && styles.amountViolet,
        )}>
          {isAvoir ? '−' : ''}{formatCurrency(hasAvoirs ? facture.montantNet : facture.montant)}
        </div>
      </div>
      <div className={styles.cardRef}>{facture.reference}</div>
      <div className={styles.cardBottom}>
        {isAvoir ? (
          <div className={styles.cardAvoir}>Avoir · {formatDateShort(facture.date)}</div>
        ) : isOverdue ? (
          <div className={styles.cardUrgent}>⚠ {joursRetard}j de retard</div>
        ) : isPaid ? (
          <div className={styles.cardDate}>✓ {facture.datePaiement ? formatDateShort(facture.datePaiement) : 'Payée'}</div>
        ) : (
          <div className={styles.cardDate}>Éch. {formatDateShort(facture.dateEcheance)}</div>
        )}
        {hasAvoirs && (
          <div className={styles.cardAvoir}>avoir −{formatCurrency(facture.avoirsDeduits)}</div>
        )}
        {!hasAvoirs && facture.posteBudgetaire && (
          <div className={styles.cardPoste}>
            {POSTE_BUDGET_LABELS[facture.posteBudgetaire] ?? facture.posteBudgetaire}
          </div>
        )}
      </div>
    </div>
  );
}
