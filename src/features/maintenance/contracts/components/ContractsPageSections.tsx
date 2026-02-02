'use client';

import { ContratDetaille, ContratSyndic } from '@/types';
import {
  ContractsStats,
  ContractsAlertSection,
  PlannedOrdersSection,
} from '@/components/features/maintenance/Contracts';

interface ContractsPageSectionsProps {
  contrats: ContratDetaille[];
  contratSyndic: ContratSyndic | null;
  onSyndicAction: () => void;
  onEditSyndic: () => void;
  onOpenDecisionModal: (contrat: ContratDetaille) => void;
  onGenerateOrder: (osData: Record<string, unknown>) => void;
}

export function ContractsPageSections({
  contrats,
  contratSyndic,
  onSyndicAction,
  onEditSyndic,
  onOpenDecisionModal,
  onGenerateOrder,
}: ContractsPageSectionsProps) {
  return (
    <>
      <ContractsStats
        contrats={contrats}
        contratSyndic={contratSyndic}
        onSyndicAction={onSyndicAction}
        onEditSyndic={onEditSyndic}
      />

      <ContractsAlertSection
        contrats={contrats}
        onAction={onOpenDecisionModal}
      />

      <PlannedOrdersSection
        contrats={contrats}
        onGenerateOrder={onGenerateOrder}
      />
    </>
  );
}
