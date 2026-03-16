'use client';

import {
  ALURSummary,
  ALURCoproTable,
  ALURTransfertHistory,
} from '@/components/features/finance/Budget';

import type { FondsALUR, CoproprietaireALUR } from '@/components/features/finance/Budget/types';

interface ALURTabProps {
  fondsALUR: FondsALUR;
  coproprietairesALUR: CoproprietaireALUR[];
  budgetAnnuelVote: number;
  onOpenTransferModal: () => void;
  onSelectCoproprietaire: (copro: CoproprietaireALUR | null) => void;
}

export function ALURTab({
  fondsALUR,
  coproprietairesALUR,
  budgetAnnuelVote,
  onOpenTransferModal,
  onSelectCoproprietaire,
}: ALURTabProps) {
  return (
    <div>
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
