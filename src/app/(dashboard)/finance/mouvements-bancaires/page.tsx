'use client';

import {
  Download,
  Upload,
  RefreshCw,
  Bell,
  X,
  CreditCard,
  Link as LinkIcon,
} from 'lucide-react';
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
} from '../../../../features/finance/mouvements-bancaires/components';
import styles from './mouvements-bancaires.module.css';

export default function MouvementsBancairesPage() {
  const {
    // State
    compteActif,
    ongletActif,
    searchTerm,
    typeFilter,
    categorieFilter,
    isRefreshing,
    alerteNouveauxMouvements,
    showHistoriqueSync,
    showImportModal,
    showCategorieModal,
    showDetailModal,
    showRapprochementModal,
    importType,
    importFile,
    isImporting,

    // Computed values
    mouvements,
    filteredMouvements,
    statutConnexion,
    historiqueSync,
    erreurs,
    alertesNonCategorises,
    statutCloture,
    soldeActuel,
    soldeInitial,
    totalEntrees,
    totalSorties,
    ecartSoldes,
    compteCourant,
    compteTravaux,
    ecrituresComptables,

    // Modal state
    selectedMouvement,
    selectedMouvementRapprochement,
    suggestions,
    selectedSuggestion,
    selectedCategorie,
    selectedCompte,
    selectedEntite,
    suggestionsRapprochement,

    // Setters
    setCompteActif,
    setOngletActif,
    setSearchTerm,
    setTypeFilter,
    setCategorieFilter,
    setAlerteNouveauxMouvements,
    setShowHistoriqueSync,
    setShowImportModal,
    setShowCategorieModal,
    setShowDetailModal,
    setShowRapprochementModal,
    setImportType,
    setImportFile,

    // Handlers
    handleRefresh,
    handleToggleModeSync,
    handleImportFile,
    handleCategoriserClick,
    handleApplySuggestion,
    handleSaveCategorie,
    handleCategorieChange,
    handleCompteChange,
    handleOpenEntityDetail,
    handleNavigateToEntity,
    handleOpenRapprochement,
    handleRapprocher,
    handleAnnulerRapprochement,

    // Utils
    getTempsDepuisDerniereSync,
    getTempsJusquaProchaineSync,
    isMouvementRapproche,
    getEcritureRapprochee,
  } = useMouvementsBancairesPage();

  const downloadRIB = () => {
    // Téléchargement du RIB
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mouvements bancaires</h1>
          <p className={styles.subtitle}>Suivi en temps réel de vos comptes bancaires</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.downloadRibButton} onClick={downloadRIB}>
            <Download size={18} aria-hidden="true" />
            Télécharger RIB
          </button>
          <button
            className={styles.importButton}
            onClick={() => setShowImportModal(true)}
            title="Importer un fichier bancaire (CSV, OFX, QIF)"
          >
            <Upload size={18} aria-hidden="true" />
            Import manuel
          </button>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={isRefreshing || statutConnexion.statut === 'en_cours'}
          >
            <RefreshCw size={18} className={isRefreshing ? styles.spinning : ''} aria-hidden="true" />
            {isRefreshing ? 'Synchronisation...' : 'Synchroniser'}
          </button>
        </div>
      </div>

      {/* Notification nouveaux mouvements */}
      {alerteNouveauxMouvements && (
        <div className={styles.notificationNouveauxMouvements}>
          <Bell size={18} />
          <span>{alerteNouveauxMouvements} nouveau{alerteNouveauxMouvements > 1 ? 'x' : ''} mouvement{alerteNouveauxMouvements > 1 ? 's' : ''} importé{alerteNouveauxMouvements > 1 ? 's' : ''}</span>
          <button onClick={() => setAlerteNouveauxMouvements(null)}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Synchronisation bancaire */}
      <SyncSection
        statutConnexion={statutConnexion}
        historiqueSync={historiqueSync}
        showHistoriqueSync={showHistoriqueSync}
        getTempsDepuisDerniereSync={getTempsDepuisDerniereSync}
        getTempsJusquaProchaineSync={getTempsJusquaProchaineSync}
        onToggleHistorique={() => setShowHistoriqueSync(!showHistoriqueSync)}
        onToggleModeSync={handleToggleModeSync}
        onRefresh={handleRefresh}
      />

      {/* Alertes */}
      <AlertsSection
        erreurs={erreurs}
        alertesNonCategorises={alertesNonCategorises}
        statutCloture={statutCloture}
        mouvements={mouvements}
        onCategoriserClick={handleCategoriserClick}
      />

      {/* Cartes comptes bancaires */}
      <AccountCards
        compteActif={compteActif}
        soldeActuel={soldeActuel}
        compteCourant={compteCourant}
        compteTravaux={compteTravaux}
        onCompteChange={setCompteActif}
      />

      {/* Statistiques */}
      <StatsCards
        totalEntrees={totalEntrees}
        totalSorties={totalSorties}
        soldeActuel={soldeActuel}
        soldeInitial={soldeInitial}
      />

      {/* Onglets */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${ongletActif === 'mouvements' ? styles.tabActive : ''}`}
          onClick={() => setOngletActif('mouvements')}
        >
          <CreditCard size={18} />
          Mouvements bancaires
        </button>
        <button
          className={`${styles.tab} ${ongletActif === 'rapprochement' ? styles.tabActive : ''}`}
          onClick={() => setOngletActif('rapprochement')}
        >
          <LinkIcon size={18} />
          Rapprochement bancaire
          {ecartSoldes.ecart !== 0 && (
            <span className={styles.tabBadgeWarning}>{ecartSoldes.ecrituresNonRapprochees}</span>
          )}
        </button>
      </div>

      {/* Contenu des onglets */}
      {ongletActif === 'mouvements' && (
        <MovementsTab
          searchTerm={searchTerm}
          typeFilter={typeFilter}
          categorieFilter={categorieFilter}
          filteredMouvements={filteredMouvements}
          onSearchChange={setSearchTerm}
          onTypeFilterChange={setTypeFilter}
          onCategorieFilterChange={setCategorieFilter}
          onCategoriserClick={handleCategoriserClick}
          onOpenEntityDetail={handleOpenEntityDetail}
        />
      )}

      {ongletActif === 'rapprochement' && (
        <RapprochementTab
          mouvements={mouvements}
          ecrituresComptables={ecrituresComptables}
          ecartSoldes={ecartSoldes}
          soldeActuel={soldeActuel}
          isMouvementRapproche={isMouvementRapproche}
          getEcritureRapprochee={getEcritureRapprochee}
          onOpenRapprochement={handleOpenRapprochement}
          onAnnulerRapprochement={handleAnnulerRapprochement}
        />
      )}

      {/* Modals */}
      <CategorisationModal
        isOpen={showCategorieModal}
        selectedMouvement={selectedMouvement}
        suggestions={suggestions}
        selectedSuggestion={selectedSuggestion}
        selectedCategorie={selectedCategorie}
        selectedCompte={selectedCompte}
        onClose={() => setShowCategorieModal(false)}
        onApplySuggestion={handleApplySuggestion}
        onCategorieChange={handleCategorieChange}
        onCompteChange={handleCompteChange}
        onSave={handleSaveCategorie}
      />

      <RapprochementModal
        isOpen={showRapprochementModal}
        selectedMouvement={selectedMouvementRapprochement}
        suggestions={suggestionsRapprochement}
        ecrituresComptables={ecrituresComptables}
        onClose={() => setShowRapprochementModal(false)}
        onRapprocher={handleRapprocher}
      />

      <EntityDetailModal
        isOpen={showDetailModal}
        selectedEntite={selectedEntite}
        onClose={() => setShowDetailModal(false)}
        onNavigate={handleNavigateToEntity}
      />

      <ImportModal
        isOpen={showImportModal}
        importType={importType}
        importFile={importFile}
        isImporting={isImporting}
        onClose={() => setShowImportModal(false)}
        onImportTypeChange={setImportType}
        onFileChange={setImportFile}
        onImport={handleImportFile}
      />
    </div>
  );
}
