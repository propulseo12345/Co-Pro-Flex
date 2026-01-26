'use client';

import { FileUp, RefreshCw, Shield } from 'lucide-react';
import { useRapprochementBancairePage } from '../../../../features/finance/rapprochement-bancaire/hooks';
import {
  StatsGrid,
  Filters,
  RapprochementTable,
  SessionBanner,
  WelcomeState,
  ImportModal,
  CertificationModal,
  EcartsAlert,
} from '../../../../features/finance/rapprochement-bancaire/components';
import styles from './rapprochement-bancaire.module.css';

export default function RapprochementBancairePage() {
  const {
    // Refs
    fileInputRef,

    // Session state
    sessionActive,
    moisSelectionne,
    anneeSelectionnee,

    // Data
    lignesRapprochement,
    lignesFiltrees,

    // Balances
    soldeReleveDebut,
    soldeReleveFin,

    // Filters & UI
    filtreStatut,
    searchTerm,
    showImportModal,
    showCertificationModal,
    isImporting,
    expandedRows,

    // Computed
    stats,

    // Setters
    setMoisSelectionne,
    setAnneeSelectionnee,
    setSoldeReleveDebut,
    setSoldeReleveFin,
    setFiltreStatut,
    setSearchTerm,
    setShowImportModal,
    setShowCertificationModal,

    // Handlers
    handleImportCSV,
    handleValiderLigne,
    handleCreerMouvement,
    handleCertifier,
    toggleRowExpansion,
  } = useRapprochementBancairePage();

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Rapprochement bancaire</h1>
          <p className={styles.subtitle}>Vérification et validation des mouvements bancaires</p>
        </div>
        <div className={styles.headerActions}>
          {!sessionActive ? (
            <button className={styles.primaryButton} onClick={() => setShowImportModal(true)}>
              <FileUp size={18} />
              Nouveau rapprochement
            </button>
          ) : (
            <>
              <button className={styles.secondaryButton} onClick={() => setShowImportModal(true)}>
                <RefreshCw size={18} />
                Relancer le rapprochement
              </button>
              {stats.peutCertifier && sessionActive.statut !== 'CERTIFIE' && (
                <button className={styles.successButton} onClick={() => setShowCertificationModal(true)}>
                  <Shield size={18} />
                  Certifier le mois
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Session Banner */}
      {sessionActive && <SessionBanner session={sessionActive} />}

      {/* Stats & Content */}
      {lignesRapprochement.length > 0 && (
        <>
          <StatsGrid stats={stats} soldeReleveFin={soldeReleveFin} />

          <EcartsAlert ecarts={stats.ecarts} />

          <Filters
            searchTerm={searchTerm}
            filtreStatut={filtreStatut}
            stats={stats}
            onSearchChange={setSearchTerm}
            onFiltreChange={setFiltreStatut}
          />

          <RapprochementTable
            lignes={lignesFiltrees}
            expandedRows={expandedRows}
            sessionActive={sessionActive}
            onToggleExpand={toggleRowExpansion}
            onValider={handleValiderLigne}
            onCreerMouvement={handleCreerMouvement}
          />
        </>
      )}

      {/* Welcome State */}
      {!sessionActive && lignesRapprochement.length === 0 && (
        <WelcomeState onStart={() => setShowImportModal(true)} />
      )}

      {/* Modals */}
      <ImportModal
        isOpen={showImportModal}
        isImporting={isImporting}
        moisSelectionne={moisSelectionne}
        anneeSelectionnee={anneeSelectionnee}
        soldeReleveDebut={soldeReleveDebut}
        soldeReleveFin={soldeReleveFin}
        fileInputRef={fileInputRef}
        onClose={() => setShowImportModal(false)}
        onMoisChange={setMoisSelectionne}
        onAnneeChange={setAnneeSelectionnee}
        onSoldeDebutChange={setSoldeReleveDebut}
        onSoldeFinChange={setSoldeReleveFin}
        onImport={handleImportCSV}
      />

      <CertificationModal
        isOpen={showCertificationModal}
        moisSelectionne={moisSelectionne}
        anneeSelectionnee={anneeSelectionnee}
        stats={stats}
        onClose={() => setShowCertificationModal(false)}
        onCertifier={handleCertifier}
      />
    </div>
  );
}
