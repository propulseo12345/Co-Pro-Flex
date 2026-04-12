'use client';

import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { FacturXTable } from '@/components/features/conformite/facturx/FacturXTable';
import { useFacturX } from '@/hooks/useFacturX';

export default function FacturXPage() {
  const { factures, genererFacturX, telecharger, isLoading, filter, setFilter } = useFacturX();

  return (
    <div className="container">
      <FinanceTopBar
        title="Factur-X"
        subtitle="E-facturation obligatoire dès septembre 2026 — génération PDF/A-3 + XML embarqué (EN 16931)"
      />
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
