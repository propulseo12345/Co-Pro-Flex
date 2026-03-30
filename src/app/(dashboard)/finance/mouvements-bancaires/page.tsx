'use client';

import { useCallback } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import { useMouvementsBancairesPage } from '../../../../features/finance/mouvements-bancaires/hooks';
import {
  AccountPills,
  AlertBanners,
  MovementFilters,
  UnifiedMovementsTable,
  EntityDetailModal,
  CategorisationModal,
  RapprochementModal,
  NewMovementsNotification,
  WorkflowModeSwitcher,
  WorkflowSummaryBar,
  WorkflowTabs,
  ImportTab,
  BatchCategorisation,
  SplitReconciliation,
  ClotureTab,
} from '../../../../features/finance/mouvements-bancaires/components';
import type { MouvementBancaireBase } from '../../../../features/finance/mouvements-bancaires/domain/types';

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

  const handleImportMouvements = useCallback((mouvements: MouvementBancaireBase[]) => {
    // For now, add imported mouvements to local state
    // Will be replaced by Supabase import when connected
    hook.setShowImportModal(false);
  }, [hook]);

  // Workflow counts
  const workflowCounts = {
    import: 0,
    categorisation: hook.suggestionsCategorisation.length,
    rapprochement: hook.suggestionsRapprochementBatch.length,
    cloture: 0,
  };

  const pendingCount = hook.statsNonCategorises.total + (hook.ecartSoldes?.mouvementsNonRapproches ?? 0);

  // Progression: % of mouvements fully processed (categorised + rapproché)
  const totalMouvements = hook.mouvements.length;
  const categorises = hook.mouvements.filter(m => m.categorise).length;
  const rapproches = hook.mouvements.filter(m => hook.isMouvementRapproche(m.id)).length;
  const progression = totalMouvements > 0
    ? Math.round(((categorises + rapproches) / (totalMouvements * 2)) * 100)
    : 100;

  return (
    <div>
      <FinanceTopBar
        title="Mouvements bancaires"
        subtitle="Suivi en temps réel de vos comptes bancaires"
        actions={
          <>
            <WorkflowModeSwitcher
              mode={hook.workflowMode}
              onModeChange={hook.setWorkflowMode}
              pendingCount={pendingCount}
            />
            <button className={topBarStyles.btnGhost} onClick={hook.downloadRIB}>
              <Download size={15} />
              RIB
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

      {hook.workflowMode === 'table' ? (
        <>
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
          />
        </>
      ) : (
        <>
          <WorkflowSummaryBar
            nonCategorises={hook.statsNonCategorises}
            nonRapproches={hook.ecartSoldes?.mouvementsNonRapproches ?? 0}
            suggestionsPretes={hook.suggestionsCategorisation.filter(s => s.suggestion).length}
            ecartSoldes={hook.ecartSoldes?.ecart ?? 0}
            progressionMensuelle={progression}
          />

          <WorkflowTabs
            activeTab={hook.activeTab}
            onTabChange={hook.setActiveTab}
            counts={workflowCounts}
          />

          {hook.activeTab === 'import' && (
            <ImportTab
              onImport={handleImportMouvements}
              isImporting={hook.isImporting}
              accountId={hook.compteActuel.id}
            />
          )}

          {hook.activeTab === 'categorisation' && (
            <BatchCategorisation
              suggestions={hook.suggestionsCategorisation}
              onApply={hook.handleBatchCategorise}
              isMutating={hook.isMutating}
            />
          )}

          {hook.activeTab === 'rapprochement' && (
            <SplitReconciliation
              suggestions={hook.suggestionsRapprochementBatch}
              ecritures={hook.ecrituresComptables}
              onApply={hook.handleBatchRapprocher}
              isMutating={hook.isMutating}
              ecartSoldes={hook.ecartSoldes?.ecart ?? 0}
            />
          )}

          {hook.activeTab === 'cloture' && (
            <ClotureTab
              mouvements={hook.mouvements}
              ecritures={hook.ecrituresComptables}
              onTabChange={hook.setActiveTab}
            />
          )}
        </>
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
        isOpen={hook.showSlideOver}
        mouvement={hook.selectedMouvementRapprochement}
        suggestions={hook.suggestionsRapprochement}
        ecritures={hook.ecrituresComptables}
        onClose={() => hook.setShowSlideOver(false)}
        onRapprocher={hook.handleRapprocher}
        isMutating={hook.isMutating}
      />

      <EntityDetailModal
        isOpen={hook.showDetailModal}
        selectedEntite={hook.selectedEntite}
        onClose={() => hook.setShowDetailModal(false)}
        onNavigate={hook.handleNavigateToEntity}
      />
    </div>
  );
}
