'use client';

import {
  ALURSummary,
  ALURCoproTable,
  ALURTransfertHistory,
} from '@/components/features/finance/Budget';

interface ALURTabProps {
  fondsALUR: any;
  coproprietairesALUR: any[];
  budgetAnnuelVote: number;
  onOpenTransferModal: () => void;
  onSelectCoproprietaire: (copro: any | null) => void;
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
