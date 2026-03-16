'use client';

import { Download, Upload, RefreshCw } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import { useMouvementsBancairesPage } from '../../../../features/finance/mouvements-bancaires/hooks';
import {
  AccountPills,
  AlertBanners,
  MovementFilters,
  UnifiedMovementsTable,
  RapprochementSlideOver,
  CategorisationModal,
  EntityDetailModal,
  ImportModal,
  NewMovementsNotification,
} from '../../../../features/finance/mouvements-bancaires/components';

export default function MouvementsBancairesPage() {
  const hook = useMouvementsBancairesPage();
  const isSyncing = hook.statutConnexion.statut === 'en_cours';

  const handleFilterNonCategorises = () => {
    hook.setCategorieFilter('NON_CATEGORISE');
    hook.setTypeFilter('TOUS');
    hook.setRapprochementFilter('tous');
  };

  const handleFilterNonRapproches = () => {
    hook.setRapprochementFilter('non_rapproche');
    hook.setTypeFilter('TOUS');
    hook.setCategorieFilter('TOUS');
  };

  return (
    <div>
      <FinanceTopBar
        title="Mouvements bancaires"
        subtitle="Suivi en temps réel de vos comptes bancaires"
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={hook.downloadRIB}>
              <Download size={15} />
              RIB
            </button>
            <button className={topBarStyles.btnGhost} onClick={() => hook.setShowImportModal(true)}>
              <Upload size={15} />
              Import
            </button>
            <button
              className={topBarStyles.btnGhost}
              onClick={hook.handleRefresh}
              disabled={hook.isRefreshing || isSyncing}
            >
              <RefreshCw size={15} className={hook.isRefreshing ? topBarStyles.spinning : undefined} />
              {hook.isRefreshing ? 'Sync...' : 'Synchroniser'}
            </button>
          </>
        }
      />

      <AccountPills
        compteActif={hook.compteActif}
        soldeActuel={hook.soldeActuel}
        totalEntrees={hook.totalEntrees}
        totalSorties={hook.totalSorties}
        compteCourant={hook.compteCourant}
        compteTravaux={hook.compteTravaux}
        onCompteChange={hook.setCompteActif}
      />

      {hook.alerteNouveauxMouvements && (
        <NewMovementsNotification
          count={hook.alerteNouveauxMouvements}
          onDismiss={() => hook.setAlerteNouveauxMouvements(null)}
        />
      )}

      <AlertBanners
        statsNonCategorises={hook.statsNonCategorises}
        ecartSoldes={hook.ecartSoldes}
        totalMouvements={hook.mouvements.length}
        statutConnexion={hook.statutConnexion}
        getTempsDepuisDerniereSync={hook.getTempsDepuisDerniereSync}
        onFilterNonCategorises={handleFilterNonCategorises}
        onFilterNonRapproches={handleFilterNonRapproches}
      />

      <MovementFilters
        searchTerm={hook.searchTerm}
        typeFilter={hook.typeFilter}
        categorieFilter={hook.categorieFilter}
        rapprochementFilter={hook.rapprochementFilter}
        totalCount={hook.mouvements.length}
        onSearchChange={hook.setSearchTerm}
        onTypeFilterChange={hook.setTypeFilter}
        onCategorieFilterChange={hook.setCategorieFilter}
        onRapprochementFilterChange={hook.setRapprochementFilter}
      />

      <UnifiedMovementsTable
        mouvements={hook.filteredMouvements}
        selectedMouvementId={hook.selectedMouvementRapprochement?.id ?? null}
        showPanel={hook.showSlideOver}
        isMouvementRapproche={hook.isMouvementRapproche}
        getEcritureRapprochee={hook.getEcritureRapprochee}
        onCategoriserClick={hook.handleCategoriserClick}
        onRapprocherClick={hook.handleOpenRapprochement}
        onOpenEntityDetail={hook.handleOpenEntityDetail}
      >
        {hook.showSlideOver && hook.selectedMouvementRapprochement && (
          <RapprochementSlideOver
            mouvement={hook.selectedMouvementRapprochement}
            suggestions={hook.suggestionsRapprochement}
            ecrituresComptables={hook.ecrituresComptables}
            onRapprocher={hook.handleRapprocher}
            onClose={() => hook.setShowSlideOver(false)}
          />
        )}
      </UnifiedMovementsTable>

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
