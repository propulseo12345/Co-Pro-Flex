'use client';

import { GrandLivreTable } from './GrandLivreTable';
import { BalanceTable } from './BalanceTable';
import { Annexe1Table, Annexe1DetailCoprosTable, Annexe2Table, Annexe3Table, Annexe4Table, Annexe5Table } from './AnnexeTables';
import { ComptaEmptyDataState, ComptaAnnexeNotConnected } from './ComptaEmptyStates';
import { useAnnexeData } from '@/hooks/modules/useAnnexeData';
import type { TabCompta, OperationComptable, LigneBalance } from './types';

interface ComptaTabContentProps {
  activeTab: TabCompta;
  operations: OperationComptable[];
  filteredOperations: OperationComptable[];
  lignesBalance: LigneBalance[];
  annee: number;
  onViewOperationDetail: (operation: OperationComptable) => void;
  coproId: string | null;
  periodId: string | null;
  coproName?: string;
  nextPeriodId?: string | null;
}

function AnnexeLoader({ isLoading, error, children }: { isLoading: boolean; error: string | null; children: React.ReactNode }) {
  if (isLoading) return <ComptaAnnexeNotConnected title="Chargement..." />;
  if (error) return <ComptaEmptyDataState title="Erreur" message={error} />;
  return <>{children}</>;
}

export function ComptaTabContent({
  activeTab,
  operations,
  filteredOperations,
  lignesBalance,
  annee,
  onViewOperationDetail,
  coproId,
  periodId,
  coproName = 'Copropriété',
  nextPeriodId = null,
}: ComptaTabContentProps) {
  const exerciceLabel = `${annee}`;

  const periodLabels = {
    exPrecedent: `${annee - 1}`,
    exClosBudget: `${annee}`,
    exClosRealise: `${annee}`,
    bpEnCours: `${annee + 1}`,
    bpAVoter: `${annee + 2}`,
  };

  // Load annexe data only when the relevant tab is active
  const isAnnexe1 = activeTab === 'annexe-1';
  const isAnnexe2 = activeTab === 'annexe-2' || activeTab === 'compte-gestion';
  const isAnnexe3 = activeTab === 'annexe-3';
  const isAnnexe4 = activeTab === 'annexe-4';
  const isAnnexe5 = activeTab === 'annexe-5';

  const annexe1 = useAnnexeData(isAnnexe1 ? coproId : null, isAnnexe1 ? periodId : null, 1);
  const annexe1Detail = useAnnexeData(isAnnexe1 ? coproId : null, isAnnexe1 ? periodId : null, '1_detail');
  const annexe2 = useAnnexeData(isAnnexe2 ? coproId : null, isAnnexe2 ? periodId : null, 2, nextPeriodId);
  const annexe3 = useAnnexeData(isAnnexe3 ? coproId : null, isAnnexe3 ? periodId : null, 3, nextPeriodId);
  const annexe4 = useAnnexeData(isAnnexe4 ? coproId : null, isAnnexe4 ? periodId : null, 4);
  const annexe5 = useAnnexeData(isAnnexe5 ? coproId : null, isAnnexe5 ? periodId : null, 5);

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
    return (
      <AnnexeLoader isLoading={annexe2.isLoading} error={annexe2.error}>
        {annexe2.data && (
          <Annexe2Table data={annexe2.data} exercice={exerciceLabel} coproName={coproName} periodLabels={periodLabels} />
        )}
      </AnnexeLoader>
    );
  }

  if (activeTab === 'annexe-1') {
    return (
      <AnnexeLoader isLoading={annexe1.isLoading || annexe1Detail.isLoading} error={annexe1.error || annexe1Detail.error}>
        {annexe1.data && (
          <Annexe1Table data={annexe1.data} exercice={exerciceLabel} coproName={coproName} />
        )}
        {annexe1Detail.data && (
          <Annexe1DetailCoprosTable data={annexe1Detail.data} coproName={coproName} />
        )}
      </AnnexeLoader>
    );
  }

  if (activeTab === 'annexe-2') {
    return (
      <AnnexeLoader isLoading={annexe2.isLoading} error={annexe2.error}>
        {annexe2.data && (
          <Annexe2Table data={annexe2.data} exercice={exerciceLabel} coproName={coproName} periodLabels={periodLabels} />
        )}
      </AnnexeLoader>
    );
  }

  if (activeTab === 'annexe-3') {
    return (
      <AnnexeLoader isLoading={annexe3.isLoading} error={annexe3.error}>
        {annexe3.data && (
          <Annexe3Table data={annexe3.data} exercice={exerciceLabel} coproName={coproName} periodLabels={periodLabels} />
        )}
      </AnnexeLoader>
    );
  }

  if (activeTab === 'annexe-4') {
    return (
      <AnnexeLoader isLoading={annexe4.isLoading} error={annexe4.error}>
        {annexe4.data && (
          <Annexe4Table data={annexe4.data} exercice={exerciceLabel} coproName={coproName} />
        )}
      </AnnexeLoader>
    );
  }

  if (activeTab === 'annexe-5') {
    return (
      <AnnexeLoader isLoading={annexe5.isLoading} error={annexe5.error}>
        {annexe5.data && (
          <Annexe5Table data={annexe5.data} exercice={exerciceLabel} coproName={coproName} />
        )}
      </AnnexeLoader>
    );
  }

  return null;
}
