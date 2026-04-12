'use client';

import { useState } from 'react';
import { FinanceTopBar } from '@/components/layout/FinanceTopBar';
import { DPEGestionnaireTable } from '@/components/features/conformite/dpe/DPEGestionnaireTable';
import { DPEFicheDetail } from '@/components/features/conformite/dpe/DPEFicheDetail';
import { DPEEditModal } from '@/components/features/conformite/dpe/DPEEditModal';
import { DPERenewModal } from '@/components/features/conformite/dpe/DPERenewModal';
import { useDPE } from '@/hooks/useDPE';
import { useCopro } from '@/providers/CoproContext';
import { useToast } from '@/providers/ToastProvider';

export default function DPEGestionnairePage() {
  const { currentCoproId } = useCopro();
  const { showToast } = useToast();
  const { coproprietes, selectedDPE, updateDPE, planifierRenouvellement } = useDPE({
    coproprieteId: currentCoproId ?? undefined,
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);

  // Vue copropriété spécifique (CoproContext actif)
  if (currentCoproId && selectedDPE) {
    return (
      <div className="container">
        <FinanceTopBar
          title="DPE Collectif"
          subtitle={`${selectedDPE.coproprieteNom} · ${selectedDPE.nbLots} lots · Classe ${selectedDPE.classeEnergie} · ${selectedDPE.consoEnergie} kWh/m²/an`}
        />
        <DPEFicheDetail
          dpe={selectedDPE}
          onEdit={() => setShowEditModal(true)}
          onPlanifier={() => setShowRenewModal(true)}
        />
        {showEditModal && (
          <DPEEditModal
            dpe={selectedDPE}
            onSave={data => {
              updateDPE(selectedDPE.id, data);
              showToast({ type: 'success', message: 'Fiche DPE mise à jour' });
            }}
            onClose={() => setShowEditModal(false)}
          />
        )}
        {showRenewModal && (
          <DPERenewModal
            diagnostiqueurActuel={selectedDPE.diagnostiqueur}
            onSave={data => {
              planifierRenouvellement(selectedDPE.id, data);
              const [y, m, d] = data.datePrevue.split('-').map(Number);
              const dateFormatted = new Date(y, m - 1, d).toLocaleDateString('fr-FR');
              showToast({ type: 'success', message: `Renouvellement DPE planifié pour le ${dateFormatted}` });
            }}
            onClose={() => setShowRenewModal(false)}
          />
        )}
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
