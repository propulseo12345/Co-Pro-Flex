'use client';

import { useState } from 'react';
import {
  ALURSummary,
  ALURCoproTable,
  ALURTransfertHistory,
} from '@/components/features/finance/Budget';

import type { FondsALUR, CoproprietaireALUR } from '@/components/features/finance/Budget/types';
import type { PendingAlurCash } from '@/lib/budget/api';
import styles from './ALURTab.module.css';

interface ALURTabProps {
  fondsALUR: FondsALUR;
  coproprietairesALUR: CoproprietaireALUR[];
  budgetAnnuelVote: number;
  pendingAlurCash: PendingAlurCash[];
  onSettleAlurCash: (transferId: string) => void | Promise<void>;
  onOpenTransferModal: () => void;
  onSelectCoproprietaire: (copro: CoproprietaireALUR | null) => void;
}

export function ALURTab({
  fondsALUR,
  coproprietairesALUR,
  budgetAnnuelVote,
  pendingAlurCash,
  onSettleAlurCash,
  onOpenTransferModal,
  onSelectCoproprietaire,
}: ALURTabProps) {
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const totalPending = pendingAlurCash.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleSettle = async (transferId: string) => {
    if (settlingId) return;
    setSettlingId(transferId);
    try {
      await onSettleAlurCash(transferId);
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div>
      {pendingAlurCash.length > 0 && (
        <div className={styles.pendingBanner} role="status">
          <span className={styles.pendingTitle}>
            {totalPending.toLocaleString('fr-FR')} € affectés en attente de virement de trésorerie (Livret A → compte courant).
          </span>
          <ul className={styles.pendingList}>
            {pendingAlurCash.map((p) => {
              const label = `${p.budget_name ?? 'Budget travaux'} (${Number(p.amount).toLocaleString('fr-FR')} €)`;
              return (
                <li key={p.transfer_id} className={styles.pendingItem}>
                  <span className={styles.pendingLabel}>
                    {p.budget_name ?? 'Budget travaux'} — {Number(p.amount).toLocaleString('fr-FR')} €
                  </span>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleSettle(p.transfer_id)}
                    disabled={settlingId !== null}
                    aria-label={`Marquer le virement effectué pour ${label}`}
                  >
                    {settlingId === p.transfer_id ? 'Enregistrement…' : 'Marquer le virement effectué'}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ALURSummary
        fondsALUR={fondsALUR}
        coproprietairesALUR={coproprietairesALUR}
        budgetAnnuelVote={budgetAnnuelVote}
      />
      <ALURTransfertHistory fondsALUR={fondsALUR} onOpenTransferModal={onOpenTransferModal} />
      <ALURCoproTable
        coproprietairesALUR={coproprietairesALUR}
        onSelectCoproprietaire={onSelectCoproprietaire}
      />
    </div>
  );
}
