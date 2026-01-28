'use client';

import { GrandLivreTable } from './GrandLivreTable';
import { BalanceTable } from './BalanceTable';
import { ComptaEmptyDataState, ComptaAnnexeNotConnected } from './ComptaEmptyStates';
import type { TabCompta, OperationComptable, LigneBalance } from './types';

interface ComptaTabContentProps {
  activeTab: TabCompta;
  operations: OperationComptable[];
  filteredOperations: OperationComptable[];
  lignesBalance: LigneBalance[];
  annee: number;
  onViewOperationDetail: (operation: OperationComptable) => void;
}

export function ComptaTabContent({
  activeTab,
  operations,
  filteredOperations,
  lignesBalance,
  annee,
  onViewOperationDetail,
}: ComptaTabContentProps) {
  if (activeTab === 'grand-livre') {
    if (operations.length === 0) {
      return (
        <ComptaEmptyDataState
          title="Aucune écriture comptable"
          message="Il n'y a pas encore d'écritures comptables validées pour cette période."
        />
      );
    }
    return <GrandLivreTable operations={filteredOperations} onViewDetail={onViewOperationDetail} />;
  }

  if (activeTab === 'balance') {
    if (lignesBalance.length === 0) {
      return (
        <ComptaEmptyDataState
          title="Balance vide"
          message="Il n'y a pas encore de données de balance pour cette période."
        />
      );
    }
    return <BalanceTable lignesBalance={lignesBalance} annee={annee} />;
  }

  if (activeTab === 'compte-gestion') {
    return <ComptaAnnexeNotConnected title="Compte de gestion" />;
  }

  if (activeTab === 'annexe-1') {
    return <ComptaAnnexeNotConnected title="Annexe 1 - État financier" />;
  }

  if (activeTab === 'annexe-2') {
    return <ComptaAnnexeNotConnected title="Annexe 2 - Compte de gestion général" />;
  }

  if (activeTab === 'annexe-3') {
    return <ComptaAnnexeNotConnected title="Annexe 3 - Compte de gestion opérations courantes" />;
  }

  if (activeTab === 'annexe-4') {
    return <ComptaAnnexeNotConnected title="Annexe 4 - Compte de gestion travaux" />;
  }

  if (activeTab === 'annexe-5') {
    return <ComptaAnnexeNotConnected title="Annexe 5 - État des travaux" />;
  }

  return null;
}
