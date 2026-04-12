'use client';

import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { DPEGestionnaireTable } from '@/components/features/conformite/dpe/DPEGestionnaireTable';
import { DPEFicheDetail } from '@/components/features/conformite/dpe/DPEFicheDetail';
import { useDPE } from '@/hooks/useDPE';
import { useCopro } from '@/providers/CoproContext';

export default function DPEGestionnairePage() {
  const { currentCoproId } = useCopro();
  const { coproprietes, selectedDPE } = useDPE({ coproprieteId: currentCoproId ?? undefined });

  // Vue copropriété spécifique (CoproContext actif)
  if (currentCoproId && selectedDPE) {
    return (
      <div className="container">
        <FinanceTopBar
          title="DPE Collectif"
          subtitle={`${selectedDPE.coproprieteNom} · ${selectedDPE.nbLots} lots · Classe ${selectedDPE.classeEnergie} · ${selectedDPE.consoEnergie} kWh/m²/an`}
        />
        <DPEFicheDetail dpe={selectedDPE} />
      </div>
    );
  }

  // Vue gestionnaire (toutes copropriétés)
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
