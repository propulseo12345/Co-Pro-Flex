'use client';

import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { DPEGestionnaireTable } from '@/components/features/conformite/dpe/DPEGestionnaireTable';
import { useDPE } from '@/hooks/useDPE';

export default function DPEGestionnairePage() {
  const { coproprietes } = useDPE();

  return (
    <div className="container">
      <FinanceTopBar
        title="DPE Collectif"
        subtitle="Suivi des Diagnostics de Performance Énergétique — obligation légale depuis le 01/01/2026"
      />
      <DPEGestionnaireTable dpeList={coproprietes} />
    </div>
  );
}
