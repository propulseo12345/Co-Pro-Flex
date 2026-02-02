'use client';

import {
  GestionEnvoisModal,
  RepartitionModal,
  AppelDetailModal,
  AppelFormModal,
  EnregistrerPaiementModal,
  HistoriquePaiementsModal,
  EmissionAppelModal,
  HistoriqueRelancesModal,
  ExportAvisAppelModal,
  type PaiementHistorique,
  type NouveauPaiement,
} from '@/components/features/finance/AppelsFonds/modals';
import type {
  AppelFonds,
  CoproprietaireAppel,
  ModeEnvoi,
  NewAppelForm,
  StatutPaiement,
  StatutRecommande,
  RelanceAppel,
} from '@/components/features/finance/AppelsFonds/types';
import type { AppelFondsEmission } from '@/lib/services/emission-appel.service';

interface AppelsFondsModalsProps {
  // Gestion Modal
  showGestionModal: boolean;
  selectedAppel: AppelFonds | null;
  coproprietaires: CoproprietaireAppel[];
  filteredCoproprietaires: CoproprietaireAppel[];
  sendingInProgress: boolean;
  searchCopro: string;
  paiementFilter: 'TOUS' | StatutPaiement;
  recommandeFilter: 'TOUS' | StatutRecommande;
  onCloseGestion: () => void;
  onSearchCoproChange: (value: string) => void;
  onPaiementFilterChange: (value: 'TOUS' | StatutPaiement) => void;
  onRecommandeFilterChange: (value: 'TOUS' | StatutRecommande) => void;
  onModeEnvoiChange: (coproId: string, mode: ModeEnvoi) => void;
  onEnvoyerAppel: (coproId: string) => void;
  onEnvoyerTous: () => void;
  onEnregistrerPaiement: (coproId: string) => void;
  onVoirHistoriquePaiements: (coproId: string) => void;

  // Montant Modal
  showMontantModal: boolean;
  onCloseMontant: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;

  // Detail Modal
  showDetailModal: boolean;
  onCloseDetail: () => void;

  // New Appel Modal
  showNewAppelModal: boolean;
  newAppelForm: NewAppelForm;
  onFormChange: (form: NewAppelForm) => void;
  onNewAppelSubmit: () => void;
  onNewAppelCancel: () => void;

  // Edit Modal
  showEditModal: boolean;
  onUpdateAppel: () => void;
  onCloseEdit: () => void;

  // Paiement Modal
  showPaiementModal: boolean;
  selectedCoproprietaire: CoproprietaireAppel | null;
  onClosePaiement: () => void;
  onSubmitPaiement: (coproId: string, paiement: NouveauPaiement) => void;

  // Historique Paiements Modal
  showHistoriqueModal: boolean;
  paiements: PaiementHistorique[];
  onCloseHistorique: () => void;

  // Emission Modal
  showEmissionModal: boolean;
  appelEmissionConverted: AppelFondsEmission | null;
  onCloseEmission: () => void;
  onEmissionSuccess: (result: { nouveauStatut: string }) => void;

  // Relances Modal
  showRelancesModal: boolean;
  onCloseRelances: () => void;
  onNouvelleRelance: (relance: Omit<RelanceAppel, 'id'>) => void;

  // Export Avis Modal
  showExportAvisModal: boolean;
  onCloseExportAvis: () => void;
}

export function AppelsFondsModals({
  showGestionModal,
  selectedAppel,
  coproprietaires,
  filteredCoproprietaires,
  sendingInProgress,
  searchCopro,
  paiementFilter,
  recommandeFilter,
  onCloseGestion,
  onSearchCoproChange,
  onPaiementFilterChange,
  onRecommandeFilterChange,
  onModeEnvoiChange,
  onEnvoyerAppel,
  onEnvoyerTous,
  onEnregistrerPaiement,
  onVoirHistoriquePaiements,
  showMontantModal,
  onCloseMontant,
  onExportPDF,
  onExportExcel,
  showDetailModal,
  onCloseDetail,
  showNewAppelModal,
  newAppelForm,
  onFormChange,
  onNewAppelSubmit,
  onNewAppelCancel,
  showEditModal,
  onUpdateAppel,
  onCloseEdit,
  showPaiementModal,
  selectedCoproprietaire,
  onClosePaiement,
  onSubmitPaiement,
  showHistoriqueModal,
  paiements,
  onCloseHistorique,
  showEmissionModal,
  appelEmissionConverted,
  onCloseEmission,
  onEmissionSuccess,
  showRelancesModal,
  onCloseRelances,
  onNouvelleRelance,
  showExportAvisModal,
  onCloseExportAvis,
}: AppelsFondsModalsProps) {
  return (
    <>
      {showGestionModal && selectedAppel && (
        <GestionEnvoisModal
          appel={selectedAppel}
          coproprietaires={coproprietaires}
          filteredCoproprietaires={filteredCoproprietaires}
          sendingInProgress={sendingInProgress}
          searchCopro={searchCopro}
          paiementFilter={paiementFilter}
          recommandeFilter={recommandeFilter}
          onClose={onCloseGestion}
          onSearchChange={onSearchCoproChange}
          onPaiementFilterChange={onPaiementFilterChange}
          onRecommandeFilterChange={onRecommandeFilterChange}
          onModeEnvoiChange={onModeEnvoiChange}
          onEnvoyerAppel={onEnvoyerAppel}
          onEnvoyerTous={onEnvoyerTous}
          onEnregistrerPaiement={onEnregistrerPaiement}
          onVoirHistoriquePaiements={onVoirHistoriquePaiements}
        />
      )}

      {showMontantModal && selectedAppel && (
        <RepartitionModal
          appel={selectedAppel}
          coproprietaires={coproprietaires}
          onClose={onCloseMontant}
          onExportPDF={onExportPDF}
          onExportExcel={onExportExcel}
        />
      )}

      {showDetailModal && selectedAppel && (
        <AppelDetailModal
          appel={selectedAppel}
          onClose={onCloseDetail}
        />
      )}

      {showNewAppelModal && (
        <AppelFormModal
          mode="new"
          form={newAppelForm}
          onFormChange={onFormChange}
          onSubmit={onNewAppelSubmit}
          onClose={onNewAppelCancel}
        />
      )}

      {showEditModal && selectedAppel && (
        <AppelFormModal
          mode="edit"
          form={newAppelForm}
          onFormChange={onFormChange}
          onSubmit={onUpdateAppel}
          onClose={onCloseEdit}
        />
      )}

      {showPaiementModal && selectedCoproprietaire && (
        <EnregistrerPaiementModal
          coproprietaire={selectedCoproprietaire}
          onClose={onClosePaiement}
          onSubmit={onSubmitPaiement}
        />
      )}

      {showHistoriqueModal && selectedCoproprietaire && (
        <HistoriquePaiementsModal
          coproprietaire={selectedCoproprietaire}
          paiements={paiements}
          onClose={onCloseHistorique}
        />
      )}

      {showEmissionModal && appelEmissionConverted && (
        <EmissionAppelModal
          isOpen={showEmissionModal}
          appel={appelEmissionConverted}
          onClose={onCloseEmission}
          onEmissionSuccess={onEmissionSuccess}
        />
      )}

      {showRelancesModal && selectedAppel && (
        <HistoriqueRelancesModal
          appel={selectedAppel}
          onClose={onCloseRelances}
          onNouvelleRelance={onNouvelleRelance}
        />
      )}

      {showExportAvisModal && selectedAppel && (
        <ExportAvisAppelModal
          appel={selectedAppel}
          coproprietaires={coproprietaires}
          onClose={onCloseExportAvis}
        />
      )}
    </>
  );
}
