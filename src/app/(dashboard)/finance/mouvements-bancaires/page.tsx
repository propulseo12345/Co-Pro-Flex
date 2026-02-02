'use client';

import { useMouvementsBancairesPage } from '../../../../features/finance/mouvements-bancaires/hooks';
import {
  SyncSection,
  AlertsSection,
  AccountCards,
  StatsCards,
  MovementsTab,
  RapprochementTab,
  CategorisationModal,
  RapprochementModal,
  EntityDetailModal,
  ImportModal,
  PageHeader,
  NewMovementsNotification,
  TabsNavigation,
} from '../../../../features/finance/mouvements-bancaires/components';
import styles from './mouvements-bancaires.module.css';

export default function MouvementsBancairesPage() {
  const hook = useMouvementsBancairesPage();

  const downloadRIB = () => {
    // Placeholder for RIB download
  };

  return (
    <div className={styles.container}>
      <PageHeader
        isRefreshing={hook.isRefreshing}
        isSyncing={hook.statutConnexion.statut === 'en_cours'}
        onDownloadRIB={downloadRIB}
        onImportClick={() => hook.setShowImportModal(true)}
        onRefresh={hook.handleRefresh}
      />

      {hook.alerteNouveauxMouvements && (
        <NewMovementsNotification
          count={hook.alerteNouveauxMouvements}
          onDismiss={() => hook.setAlerteNouveauxMouvements(null)}
        />
      )}

      <SyncSection
        statutConnexion={hook.statutConnexion}
        historiqueSync={hook.historiqueSync}
        showHistoriqueSync={hook.showHistoriqueSync}
        getTempsDepuisDerniereSync={hook.getTempsDepuisDerniereSync}
        getTempsJusquaProchaineSync={hook.getTempsJusquaProchaineSync}
        onToggleHistorique={() => hook.setShowHistoriqueSync(!hook.showHistoriqueSync)}
        onToggleModeSync={hook.handleToggleModeSync}
        onRefresh={hook.handleRefresh}
      />

      <AlertsSection
        erreurs={hook.erreurs}
        alertesNonCategorises={hook.alertesNonCategorises}
        statutCloture={hook.statutCloture}
        mouvements={hook.mouvements}
        onCategoriserClick={hook.handleCategoriserClick}
      />

      <AccountCards
        compteActif={hook.compteActif}
        soldeActuel={hook.soldeActuel}
        compteCourant={hook.compteCourant}
        compteTravaux={hook.compteTravaux}
        onCompteChange={hook.setCompteActif}
      />

      <StatsCards
        totalEntrees={hook.totalEntrees}
        totalSorties={hook.totalSorties}
        soldeActuel={hook.soldeActuel}
        soldeInitial={hook.soldeInitial}
      />

      <TabsNavigation
        activeTab={hook.ongletActif}
        onTabChange={hook.setOngletActif}
        unreconciliedCount={hook.ecartSoldes.ecrituresNonRapprochees}
        hasDiscrepancy={hook.ecartSoldes.ecart !== 0}
      />

      {hook.ongletActif === 'mouvements' && (
        <MovementsTab
          searchTerm={hook.searchTerm}
          typeFilter={hook.typeFilter}
          categorieFilter={hook.categorieFilter}
          filteredMouvements={hook.filteredMouvements}
          onSearchChange={hook.setSearchTerm}
          onTypeFilterChange={hook.setTypeFilter}
          onCategorieFilterChange={hook.setCategorieFilter}
          onCategoriserClick={hook.handleCategoriserClick}
          onOpenEntityDetail={hook.handleOpenEntityDetail}
        />
      )}

      {hook.ongletActif === 'rapprochement' && (
        <RapprochementTab
          mouvements={hook.mouvements}
          ecrituresComptables={hook.ecrituresComptables}
          ecartSoldes={hook.ecartSoldes}
          soldeActuel={hook.soldeActuel}
          isMouvementRapproche={hook.isMouvementRapproche}
          getEcritureRapprochee={hook.getEcritureRapprochee}
          onOpenRapprochement={hook.handleOpenRapprochement}
          onAnnulerRapprochement={hook.handleAnnulerRapprochement}
        />
      )}

      <CategorisationModal
        isOpen={hook.showCategorieModal}
        selectedMouvement={hook.selectedMouvement}
        suggestions={hook.suggestions}
        selectedSuggestion={hook.selectedSuggestion}
        selectedCategorie={hook.selectedCategorie}
        selectedCompte={hook.selectedCompte}
        onClose={() => hook.setShowCategorieModal(false)}
        onApplySuggestion={hook.handleApplySuggestion}
        onCategorieChange={hook.handleCategorieChange}
        onCompteChange={hook.handleCompteChange}
        onSave={hook.handleSaveCategorie}
      />

      <RapprochementModal
        isOpen={hook.showRapprochementModal}
        selectedMouvement={hook.selectedMouvementRapprochement}
        suggestions={hook.suggestionsRapprochement}
        ecrituresComptables={hook.ecrituresComptables}
        onClose={() => hook.setShowRapprochementModal(false)}
        onRapprocher={hook.handleRapprocher}
      />

      <EntityDetailModal
        isOpen={hook.showDetailModal}
        selectedEntite={hook.selectedEntite}
        onClose={() => hook.setShowDetailModal(false)}
        onNavigate={hook.handleNavigateToEntity}
      />

      <ImportModal
        isOpen={hook.showImportModal}
        importType={hook.importType}
        importFile={hook.importFile}
        isImporting={hook.isImporting}
        onClose={() => hook.setShowImportModal(false)}
        onImportTypeChange={hook.setImportType}
        onFileChange={hook.setImportFile}
        onImport={hook.handleImportFile}
      />
    </div>
  );
}
