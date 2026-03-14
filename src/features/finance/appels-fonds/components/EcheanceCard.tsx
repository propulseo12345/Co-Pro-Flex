'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { CallForFundsOverview } from '@/lib/finance/api';
import { formatEuros } from '../utils';
import { StatusBadge } from './StatusBadge';
import styles from '../styles/Cards.module.css';

interface EcheanceCardProps {
  call: CallForFundsOverview;
  index: number;
  total: number;
}

export function EcheanceCard({ call, index, total }: EcheanceCardProps) {
  const router = useRouter();
  const isPaid = call.status === 'paid';
  const isCurrent = call.status === 'issued' || call.status === 'partially_paid';
  const isUpcoming = call.status === 'draft';

  const rate = call.total_amount > 0
    ? Math.round((call.total_paid / call.total_amount) * 100)
    : 0;

  let statusLabel = 'À émettre';
  let statusVariant: 'green' | 'purple' | 'neutral' = 'neutral';
  let amountClass = styles.echeanceAmountMuted;

  if (isPaid) {
    statusLabel = 'Soldé';
    statusVariant = 'green';
    amountClass = styles.echeanceAmountGreen;
  } else if (isCurrent) {
    statusLabel = `En cours — ${rate} %`;
    statusVariant = 'purple';
    amountClass = styles.echeanceAmountPurple;
  }

  return (
    <div
      className={clsx(
        styles.echeance,
        isPaid && styles.echeancePaid,
        isCurrent && styles.echeanceCurrent,
        isUpcoming && styles.echeanceUpcoming,
      )}
      onClick={() => !isUpcoming && router.push(`/finance/appels-fonds/${call.id}`)}
    >
      <div className={styles.echeanceLabel}>Appel {index + 1}/{total}</div>
      <div className={styles.echeanceDate}>
        Échéance : {new Date(call.due_date).toLocaleDateString('fr-FR')}
      </div>
      <div className={clsx(styles.echeanceAmount, amountClass)}>
        {formatEuros(call.total_amount)}
      </div>
      <StatusBadge label={statusLabel} variant={statusVariant} />
    </div>
  );
}
