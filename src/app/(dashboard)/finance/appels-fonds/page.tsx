'use client';

import { useAppelsFondsPage } from '@/features/finance/appels-fonds/hooks';
import { AppelsFondsMainContent, AppelsFondsModals } from '@/features/finance/appels-fonds/components';
import styles from './appels-fonds.module.css';

export default function AppelsFondsPage() {
  const page = useAppelsFondsPage();

  return (
    <div className={styles.container}>
      <AppelsFondsMainContent
        appels={page.appels}
        groupedAppels={page.groupedAppels}
        campaigns={page.campaigns}
        selectedCampaignId={page.selectedCampaignId}
        onSelectCampaign={page.setSelectedCampaignId}
        stats={page.stats}
        onNewAppel={() => page.setShowNewAppelModal(true)}
        onEmettreAppel={page.handleEmettreAppel}
      />

      <AppelsFondsModals
        showGestionModal={page.showGestionModal}
        selectedAppel={page.selectedAppel}
        coproprietaires={page.coproprietaires}
        filteredCoproprietaires={page.filteredCoproprietaires}
        sendingInProgress={page.sendingInProgress}
        searchCopro={page.searchCopro}
        paiementFilter={page.paiementFilterModal}
        recommandeFilter={page.recommandeFilterModal}
        onCloseGestion={() => page.setShowGestionModal(false)}
        onSearchCoproChange={page.setSearchCopro}
        onPaiementFilterChange={page.setPaiementFilterModal}
        onRecommandeFilterChange={page.setRecommandeFilterModal}
        onModeEnvoiChange={page.handleModeEnvoiChange}
        onEnvoyerAppel={page.handleEnvoyerAppel}
        onEnvoyerTous={page.handleEnvoyerTous}
        onEnregistrerPaiement={page.handleEnregistrerPaiement}
        onVoirHistoriquePaiements={page.handleVoirHistoriquePaiements}
        showMontantModal={page.showMontantModal}
        onCloseMontant={() => page.setShowMontantModal(false)}
        onExportPDF={page.exportToPDF}
        onExportExcel={page.exportToExcel}
        showDetailModal={page.showDetailModal}
        onCloseDetail={() => page.setShowDetailModal(false)}
        showNewAppelModal={page.showNewAppelModal}
        newAppelForm={page.newAppelForm}
        onFormChange={page.setNewAppelForm}
        onNewAppelSubmit={page.handleNewAppelSubmit}
        onNewAppelCancel={page.handleNewAppelCancel}
        showEditModal={page.showEditModal}
        onUpdateAppel={page.handleUpdateAppel}
        onCloseEdit={page.handleCloseEditModal}
        showPaiementModal={page.showPaiementModal}
        selectedCoproprietaire={page.selectedCoproprietaire}
        onClosePaiement={page.handleClosePaiementModal}
        onSubmitPaiement={page.handleSubmitPaiement}
        showHistoriqueModal={page.showHistoriqueModal}
        paiements={page.selectedCoproprietaire ? page.getPaiementsForCoproprietaire(page.selectedCoproprietaire.id) : []}
        onCloseHistorique={page.handleCloseHistoriqueModal}
        showEmissionModal={page.showEmissionModal}
        appelEmissionConverted={page.appelEmissionConverted}
        onCloseEmission={page.handleCloseEmissionModal}
        onEmissionSuccess={page.handleEmissionSuccess}
        showRelancesModal={page.showRelancesModal}
        onCloseRelances={page.handleCloseRelancesModal}
        onNouvelleRelance={page.handleNouvelleRelance}
        showExportAvisModal={page.showExportAvisModal}
        onCloseExportAvis={page.handleCloseExportAvisModal}
      />
    </div>
  );
}
