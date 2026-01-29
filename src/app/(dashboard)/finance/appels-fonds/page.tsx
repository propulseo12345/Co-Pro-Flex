'use client';

import { useState, useCallback } from 'react';
import { AppelsFondsHeader } from '@/components/features/finance/AppelsFonds/AppelsFondsHeader';
import { AppelsFondsStats } from '@/components/features/finance/AppelsFonds/AppelsFondsStats';
import { AppelsFondsFilters } from '@/components/features/finance/AppelsFonds/AppelsFondsFilters';
import { AppelsFondsTable } from '@/components/features/finance/AppelsFonds/AppelsFondsTable';
import { RecouvrementAlert } from '@/components/features/finance/AppelsFonds/RecouvrementAlert';
import { AppelsFondsAlerts } from '@/components/features/finance/AppelsFonds/AppelsFondsAlerts';
import {
  GestionEnvoisModal,
  RepartitionModal,
  AppelDetailModal,
  AppelFormModal,
  EnregistrerPaiementModal,
  HistoriquePaiementsModal,
  EmissionAppelModal,
  HistoriqueRelancesModal,
  ExportAvisAppelModal
} from '@/components/features/finance/AppelsFonds/modals';
import { useAppelsFonds } from '@/hooks/modules/useAppelsFonds';
import type { AppelFonds } from '@/components/features/finance/AppelsFonds/types';
import type { AppelFondsEmission } from '@/lib/services/emission-appel.service';
import { AppelFondsStatut } from '@/types/enums/statuts';
import styles from './appels-fonds.module.css';

/**
 * Convertit un AppelFonds du module vers AppelFondsEmission pour le service
 */
function convertToEmissionAppel(appel: AppelFonds): AppelFondsEmission {
  return {
    id: appel.id,
    numero: parseInt(appel.id, 10) || 1,
    montant: appel.montantTotal,
    montantEncaisse: appel.montantEncaisse || 0,
    date: appel.dateEmission || new Date().toISOString().split('T')[0],
    dateEcheance: appel.dateExigibilite,
    description: appel.description,
    statut: appel.statut === 'A_GENERER' ? AppelFondsStatut.EN_ATTENTE : appel.statut,
    budgetId: appel.budgetTravauxId,
    lignes: [], // Les lignes seront gérées par le service
  };
}

export default function AppelsFondsPage() {
  // État local pour la modal d'émission
  const [showEmissionModal, setShowEmissionModal] = useState(false);
  const [appelAEmettre, setAppelAEmettre] = useState<AppelFonds | null>(null);

  const {
    // État
    appels,
    filteredAppels,
    selectedAppel,
    coproprietaires,
    filteredCoproprietaires,
    sendingInProgress,
    stats,
    refreshCalls,
    isLoading: _isLoading,

    // Alertes de délais
    alertes: _alertes,
    statsAlertes: _statsAlertes,

    // Filtres principaux
    searchTerm,
    setSearchTerm,
    statutFilter,
    setStatutFilter,
    typeFilter,
    setTypeFilter,

    // États modals
    showGestionModal,
    setShowGestionModal,
    showMontantModal,
    setShowMontantModal,
    showNewAppelModal,
    setShowNewAppelModal,
    showDetailModal,
    setShowDetailModal,
    showEditModal,
    showPaiementModal,
    showHistoriqueModal,
    showRelancesModal,
    showExportAvisModal,
    selectedCoproprietaire,

    // Filtres modal gestion
    searchCopro,
    setSearchCopro,
    paiementFilterModal,
    setPaiementFilterModal,
    recommandeFilterModal,
    setRecommandeFilterModal,

    // Formulaire
    newAppelForm,
    setNewAppelForm,

    // Handlers
    handleGestionClick,
    handleMontantClick,
    handleModeEnvoiChange,
    handleEnvoyerAppel,
    handleEnvoyerTous,
    handleViewAppel,
    handleEditAppel,
    handleDeleteAppel,
    handleUpdateAppel,
    handleNewAppelSubmit,
    handleNewAppelCancel,
    handleCloseEditModal,

    // Handlers paiements
    handleEnregistrerPaiement,
    handleVoirHistoriquePaiements,
    handleSubmitPaiement,
    handleClosePaiementModal,
    handleCloseHistoriqueModal,
    getPaiementsForCoproprietaire,

    // Export
    exportToExcel,
    exportToPDF,

    // Alertes et calendrier
    handleAlerteAction,

    // Relances et export avis
    handleVoirRelances,
    handleCloseRelancesModal,
    handleNouvelleRelance,
    handleVoirExportAvis,
    handleCloseExportAvisModal,
  } = useAppelsFonds();

  // Handler pour ouvrir la modal d'émission
  const handleEmettreAppel = useCallback((appel: AppelFonds) => {
    setAppelAEmettre(appel);
    setShowEmissionModal(true);
  }, []);

  // Handler pour le succès de l'émission
  const handleEmissionSuccess = useCallback(async (_result: { nouveauStatut: string }) => {
    // Refresh data from Supabase to get updated status
    await refreshCalls();
    setShowEmissionModal(false);
    setAppelAEmettre(null);
  }, [refreshCalls]);

  // Handler pour fermer la modal d'émission
  const handleCloseEmissionModal = useCallback(() => {
    setShowEmissionModal(false);
    setAppelAEmettre(null);
  }, []);

  return (
    <div className={styles.container}>
      <AppelsFondsHeader onNewAppel={() => setShowNewAppelModal(true)} />

      <AppelsFondsStats stats={stats} />

      <RecouvrementAlert
        tauxRecouvrement={stats.tauxRecouvrement}
        montantRestant={stats.montantTotal - stats.montantEncaisse}
      />

      {/* Alertes de délais de planification */}
      <AppelsFondsAlerts
        appels={appels}
        onActionClick={handleAlerteAction}
        maxAlertes={3}
      />

      <AppelsFondsFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statutFilter={statutFilter}
        onStatutChange={setStatutFilter}
        typeFilter={typeFilter}
        onTypeChange={setTypeFilter}
      />

      <AppelsFondsTable
        appels={filteredAppels}
        onGestionClick={handleGestionClick}
        onMontantClick={handleMontantClick}
        onViewAppel={handleViewAppel}
        onEditAppel={handleEditAppel}
        onDeleteAppel={handleDeleteAppel}
        onEmettreAppel={handleEmettreAppel}
        onVoirRelances={handleVoirRelances}
        onExportAvis={handleVoirExportAvis}
      />

      {/* Modal: Suivi des envois */}
      {showGestionModal && selectedAppel && (
        <GestionEnvoisModal
          appel={selectedAppel}
          coproprietaires={coproprietaires}
          filteredCoproprietaires={filteredCoproprietaires}
          sendingInProgress={sendingInProgress}
          searchCopro={searchCopro}
          paiementFilter={paiementFilterModal}
          recommandeFilter={recommandeFilterModal}
          onClose={() => setShowGestionModal(false)}
          onSearchChange={setSearchCopro}
          onPaiementFilterChange={setPaiementFilterModal}
          onRecommandeFilterChange={setRecommandeFilterModal}
          onModeEnvoiChange={handleModeEnvoiChange}
          onEnvoyerAppel={handleEnvoyerAppel}
          onEnvoyerTous={handleEnvoyerTous}
          onEnregistrerPaiement={handleEnregistrerPaiement}
          onVoirHistoriquePaiements={handleVoirHistoriquePaiements}
        />
      )}

      {/* Modal: Répartition détaillée */}
      {showMontantModal && selectedAppel && (
        <RepartitionModal
          appel={selectedAppel}
          coproprietaires={coproprietaires}
          onClose={() => setShowMontantModal(false)}
          onExportPDF={exportToPDF}
          onExportExcel={exportToExcel}
        />
      )}

      {/* Modal: Détail de l'appel */}
      {showDetailModal && selectedAppel && (
        <AppelDetailModal
          appel={selectedAppel}
          onClose={() => setShowDetailModal(false)}
        />
      )}

      {/* Modal: Nouvel appel de fonds */}
      {showNewAppelModal && (
        <AppelFormModal
          mode="new"
          form={newAppelForm}
          onFormChange={setNewAppelForm}
          onSubmit={handleNewAppelSubmit}
          onClose={handleNewAppelCancel}
        />
      )}

      {/* Modal: Édition d'un appel */}
      {showEditModal && selectedAppel && (
        <AppelFormModal
          mode="edit"
          form={newAppelForm}
          onFormChange={setNewAppelForm}
          onSubmit={handleUpdateAppel}
          onClose={handleCloseEditModal}
        />
      )}

      {/* Modal: Enregistrer un paiement */}
      {showPaiementModal && selectedCoproprietaire && (
        <EnregistrerPaiementModal
          coproprietaire={selectedCoproprietaire}
          onClose={handleClosePaiementModal}
          onSubmit={handleSubmitPaiement}
        />
      )}

      {/* Modal: Historique des paiements */}
      {showHistoriqueModal && selectedCoproprietaire && (
        <HistoriquePaiementsModal
          coproprietaire={selectedCoproprietaire}
          paiements={getPaiementsForCoproprietaire(selectedCoproprietaire.id)}
          onClose={handleCloseHistoriqueModal}
        />
      )}

      {/* Modal: Émission d'un appel de fonds */}
      {showEmissionModal && appelAEmettre && (
        <EmissionAppelModal
          isOpen={showEmissionModal}
          appel={convertToEmissionAppel(appelAEmettre)}
          onClose={handleCloseEmissionModal}
          onEmissionSuccess={handleEmissionSuccess}
        />
      )}

      {/* Modal: Historique des relances */}
      {showRelancesModal && selectedAppel && (
        <HistoriqueRelancesModal
          appel={selectedAppel}
          onClose={handleCloseRelancesModal}
          onNouvelleRelance={handleNouvelleRelance}
        />
      )}

      {/* Modal: Export des avis d'appel */}
      {showExportAvisModal && selectedAppel && (
        <ExportAvisAppelModal
          appel={selectedAppel}
          coproprietaires={coproprietaires}
          onClose={handleCloseExportAvisModal}
        />
      )}
    </div>
  );
}
