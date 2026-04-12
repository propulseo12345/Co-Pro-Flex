'use client';

import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { FacturXTable } from '@/components/features/conformite/facturx/FacturXTable';
import { useFacturX } from '@/hooks/useFacturX';
import { useCopro } from '@/providers/CoproContext';

export default function FacturXPage() {
  const { currentCopro } = useCopro();
  const { factures, genererFacturX, telecharger, isLoading, filter, setFilter } = useFacturX({
    coproNom: currentCopro?.name,
  });

  const subtitle = currentCopro
    ? `${currentCopro.name} · e-facturation obligatoire dès septembre 2026`
    : "E-facturation obligatoire dès septembre 2026 — génération PDF/A-3 + XML embarqué (EN 16931)";

  return (
    <div className="container">
      <FinanceTopBar title="Factur-X" subtitle={subtitle} />
      <FacturXTable
        factures={factures}
        loadingId={isLoading}
        filter={filter}
        onSetFilter={setFilter}
        onGenerer={genererFacturX}
        onTelecharger={telecharger}
      />
    </div>
  );
}
