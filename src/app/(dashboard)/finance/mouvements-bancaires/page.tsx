'use client';

import { Download, Upload, RefreshCw } from 'lucide-react';
import { FinanceTopBar, topBarStyles } from '@/components/layout/FinanceTopBar';
import { FinanceKpiStrip } from '@/components/layout/FinanceKpiStrip';
import type { FinanceKpi } from '@/components/layout/FinanceKpiStrip';
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
  NewMovementsNotification,
  TabsNavigation,
} from '../../../../features/finance/mouvements-bancaires/components';
import styles from './mouvements-bancaires.module.css';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(amount);
}

export default function MouvementsBancairesPage() {
  const hook = useMouvementsBancairesPage();

  const downloadRIB = () => {
    // Placeholder for RIB download
  };

  const isSyncing = hook.statutConnexion.statut === 'en_cours';

  const kpis: FinanceKpi[] = [
    { label: 'Solde actuel', value: formatCurrency(hook.soldeActuel), color: '#3b82f6' },
    { label: 'Entrées', value: formatCurrency(hook.totalEntrees), color: '#22c55e' },
    { label: 'Sorties', value: formatCurrency(hook.totalSorties), color: '#ef4444' },
    { label: 'Solde initial', value: formatCurrency(hook.soldeInitial) },
  ];

  return (
    <div className={styles.container}>
      <FinanceTopBar
        title="Mouvements bancaires"
        subtitle="Suivi en temps réel de vos comptes bancaires"
        actions={
          <>
            <button className={topBarStyles.btnGhost} onClick={downloadRIB}>
              <Download size={15} />
              Télécharger RIB
            </button>
            <button className={topBarStyles.btnGhost} onClick={() => hook.setShowImportModal(true)}>
              <Upload size={15} />
              Import manuel
            </button>
            <button
              className={topBarStyles.btnGhost}
              onClick={hook.handleRefresh}
              disabled={hook.isRefreshing || isSyncing}
            >
              <RefreshCw size={15} className={hook.isRefreshing ? topBarStyles.spinning : undefined} />
              {hook.isRefreshing ? 'Synchronisation...' : 'Synchroniser'}
            </button>
          </>
        }
      />

      <FinanceKpiStrip items={kpis} />

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
