'use client';

import { ArrowRightLeft, Calendar } from 'lucide-react';
import type { ALURTransfer } from '@/hooks/modules/useALURData';
import styles from '@/app/(dashboard)/finance/fonds-alur/fonds-alur.module.css';

interface ALURTransfersCardProps {
  transfers: ALURTransfer[];
}

export function ALURTransfersCard({ transfers }: ALURTransfersCardProps) {
  if (transfers.length === 0) return null;

  return (
    <div className={styles.transfersCard}>
      <h2 className={styles.sectionTitle}>
        <ArrowRightLeft size={18} />
        Derniers transferts
      </h2>
      <div className={styles.transfersTable}>
        {transfers.slice(0, 5).map((t) => (
          <div key={t.id} className={styles.transferRow}>
            <div className={styles.transferDate}>
              <Calendar size={14} />
              {new Date(t.transferDate).toLocaleDateString('fr-FR')}
            </div>
            <div className={styles.transferDescription}>
              {t.description}
              {t.destinationBudgetName && (
                <span className={styles.transferBadge}>{t.destinationBudgetName}</span>
              )}
            </div>
            <div className={styles.transferAmountNeg}>
              -{t.amount.toLocaleString('fr-FR')} €
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
