'use client';

import { Loader2, AlertCircle, Download, ArrowRightLeft, Info } from 'lucide-react';
import {
  useFondsALURPage,
  ALURStatsCards,
  ALURTransfersCard,
  ALURLotsTable,
  LotDetailModal,
  TransferModal,
} from '@/features/finance/fonds-alur';
import styles from './fonds-alur.module.css';

export default function FondsALURPage() {
  const {
    fundSummary,
    lotContributions,
    filteredLots,
    transfers,
    worksBudgets,
    selectedYear,
    isLoading,
    error,
    searchTerm,
    selectedLot,
    showTransferModal,
    setSearchTerm,
    clearSearch,
    exportToExcel,
    handleTransfer,
    openTransferModal,
    closeTransferModal,
    openLotDetail,
    closeLotDetail,
  } = useFondsALURPage();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <Loader2 size={32} className="animate-spin" />
          <span>Chargement des données ALUR...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertCircle size={32} />
          <p>Erreur: {error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Fonds ALUR</h1>
          <p className={styles.subtitle}>
            Suivi du fonds travaux obligatoire (Loi ALUR) - Exercice {selectedYear}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.transferButton} onClick={openTransferModal}>
            <ArrowRightLeft size={18} />
            Nouveau transfert
          </button>
          <button className={styles.exportButton} onClick={exportToExcel}>
            <Download size={18} />
            Exporter
          </button>
        </div>
      </div>

      <ALURStatsCards fundSummary={fundSummary} />

      <ALURTransfersCard transfers={transfers} />

      <ALURLotsTable
        filteredLots={filteredLots}
        totalLots={lotContributions.length}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={clearSearch}
        onSelectLot={openLotDetail}
      />

      <div className={styles.infoBox}>
        <div className={styles.infoIcon}>
          <Info size={20} />
        </div>
        <div>
          <h3 className={styles.infoTitle}>À propos du fonds ALUR</h3>
          <p className={styles.infoText}>
            La loi ALUR (2014) impose aux copropriétés de plus de 5 ans de constituer un fonds de travaux,
            alimenté par une cotisation annuelle minimale de <strong>5% du budget prévisionnel</strong>.
            Ce fonds est exclusivement destiné à financer les travaux d'entretien et de conservation
            des parties communes, votés en assemblée générale.
          </p>
        </div>
      </div>

      {selectedLot && (
        <LotDetailModal
          lot={selectedLot}
          transfers={transfers}
          onClose={closeLotDetail}
        />
      )}

      {showTransferModal && fundSummary && (
        <TransferModal
          soldeActuel={fundSummary.soldeActuel}
          worksBudgets={worksBudgets}
          onTransfer={handleTransfer}
          onClose={closeTransferModal}
        />
      )}
    </div>
  );
}
