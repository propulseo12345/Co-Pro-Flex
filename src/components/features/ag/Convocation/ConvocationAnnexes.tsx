'use client';

import { useAnnexeData } from '@/hooks/modules/useAnnexeData';
import {
  Annexe1Table,
  Annexe1DetailCoprosTable,
  Annexe2Table,
  Annexe3Table,
  Annexe4Table,
  Annexe5Table,
} from '@/components/features/finance/Comptabilite/AnnexeTables';

interface ConvocationAnnexesProps {
  coproId: string;
  periodId: string;
  coproName: string;
  exercice: string;
  nextPeriodId?: string | null;
  periodLabels: {
    exPrecedent: string;
    exClosBudget: string;
    exClosRealise: string;
    bpEnCours: string;
    bpAVoter: string;
  };
}

export function ConvocationAnnexes({
  coproId,
  periodId,
  coproName,
  exercice,
  nextPeriodId = null,
  periodLabels,
}: ConvocationAnnexesProps) {
  const annexe1 = useAnnexeData(coproId, periodId, 1);
  const annexe1Detail = useAnnexeData(coproId, periodId, '1_detail');
  const annexe2 = useAnnexeData(coproId, periodId, 2, nextPeriodId);
  const annexe3 = useAnnexeData(coproId, periodId, 3, nextPeriodId);
  const annexe4 = useAnnexeData(coproId, periodId, 4);
  const annexe5 = useAnnexeData(coproId, periodId, 5);

  const isLoading = annexe1.isLoading || annexe1Detail.isLoading || annexe2.isLoading || annexe3.isLoading || annexe4.isLoading || annexe5.isLoading;

  if (isLoading) {
    return <p>Chargement des annexes comptables...</p>;
  }

  return (
    <div>
      {annexe1.data && (
        <Annexe1Table data={annexe1.data} exercice={exercice} coproName={coproName} />
      )}

      {annexe1Detail.data && (
        <Annexe1DetailCoprosTable data={annexe1Detail.data} coproName={coproName} />
      )}

      {annexe2.data && (
        <Annexe2Table data={annexe2.data} exercice={exercice} coproName={coproName} periodLabels={periodLabels} />
      )}

      {annexe3.data && (
        <Annexe3Table data={annexe3.data} exercice={exercice} coproName={coproName} periodLabels={periodLabels} />
      )}

      {annexe4.data && (
        <Annexe4Table data={annexe4.data} exercice={exercice} coproName={coproName} />
      )}

      {annexe5.data && (
        <Annexe5Table data={annexe5.data} exercice={exercice} coproName={coproName} />
      )}
    </div>
  );
}
