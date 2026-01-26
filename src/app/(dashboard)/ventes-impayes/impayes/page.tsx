'use client';

import styles from './impayes.module.css';
import { useImpayesPage } from '@/components/features/ventes-impayes/impayes/hooks/useImpayesPage';
import {
  Header,
  StatsGrid,
  SelectionBar,
  WorkflowLegend,
  Filters,
  ImpayesList,
  DetailModal,
  RelanceModal,
  RegleModal,
  ExportModal,
  HistoriqueDetailModal,
  PreviewModal,
  RelancesGroupeesModal,
} from '@/components/features/ventes-impayes/impayes/components';

export default function ImpayesPage() {
  const {
    impayes,
    filteredImpayes,
    selectedImpaye,
    selectedStatut,
    stats,
    selectedIds,
    selectedImpayes,
    showDetailModal,
    showRelanceModal,
    showRegleModal,
    showExportModal,
    showHistoriqueDetailModal,
    showPreviewModal,
    showRelancesGroupeesModal,
    relanceType,
    selectedHistoriqueItem,
    previewUrl,
    previewZoom,
    relanceGroupeeType,
    relanceGroupeeStep,
    isProcessing,
    exportLoading,
    exportSuccess,
    setSelectedStatut,
    setShowDetailModal,
    setShowRelanceModal,
    setShowExportModal,
    setShowRegleModal,
    setShowHistoriqueDetailModal,
    setRelanceType,
    setPreviewZoom,
    setRelanceGroupeeType,
    setRelanceGroupeeStep,
    setShowRelancesGroupeesModal,
    openDetailModal,
    openRelanceModal,
    openRegleModal,
    openHistoriqueDetail,
    openRelancesGroupeesModal,
    handlePreviewPDF,
    handleDownloadPDF,
    closePreview,
    handleSendRelance,
    handleMarkAsRegle,
    toggleSelection,
    toggleSelectAll,
    handleSendRelancesGroupees,
    handleExport,
    getEligibleForType,
  } = useImpayesPage();

  const activeCount = filteredImpayes.filter((i) => i.statut !== 'regle').length;

  return (
    <div className={styles.container}>
      <Header
        selectedCount={selectedIds.length}
        onExport={() => setShowExportModal(true)}
        onRelancesGroupees={openRelancesGroupeesModal}
      />

      <StatsGrid
        activeCount={stats.activeCount}
        montantTotal={stats.montantTotal}
        nbMiseEnDemeure={stats.nbMiseEnDemeure}
        nbContentieux={stats.nbContentieux}
      />

      <SelectionBar
        selectedCount={selectedIds.length}
        totalCount={activeCount}
        onToggleSelectAll={toggleSelectAll}
        onClearSelection={() => toggleSelectAll()}
      />

      <WorkflowLegend />

      <Filters
        selectedStatut={selectedStatut}
        impayes={impayes}
        nbClotures={stats.nbClotures}
        onStatutChange={setSelectedStatut}
      />

      <ImpayesList
        impayes={filteredImpayes}
        selectedIds={selectedIds}
        selectedStatut={selectedStatut}
        onToggleSelection={toggleSelection}
        onOpenDetail={openDetailModal}
        onOpenRelance={openRelanceModal}
        onOpenRegle={openRegleModal}
      />

      <DetailModal
        isOpen={showDetailModal}
        impaye={selectedImpaye}
        onClose={() => setShowDetailModal(false)}
        onOpenHistoriqueDetail={openHistoriqueDetail}
        onOpenRelance={openRelanceModal}
      />

      <RelanceModal
        isOpen={showRelanceModal}
        impaye={selectedImpaye}
        relanceType={relanceType}
        isProcessing={isProcessing}
        onClose={() => setShowRelanceModal(false)}
        onRelanceTypeChange={setRelanceType}
        onPreviewPDF={handlePreviewPDF}
        onSendRelance={handleSendRelance}
      />

      <RegleModal
        isOpen={showRegleModal}
        impaye={selectedImpaye}
        isProcessing={isProcessing}
        onClose={() => setShowRegleModal(false)}
        onConfirm={handleMarkAsRegle}
      />

      <ExportModal
        isOpen={showExportModal}
        filteredCount={filteredImpayes.length}
        montantTotal={stats.montantTotal}
        selectedStatut={selectedStatut}
        isLoading={exportLoading}
        isSuccess={exportSuccess}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
      />

      <HistoriqueDetailModal
        isOpen={showHistoriqueDetailModal}
        item={selectedHistoriqueItem}
        impaye={selectedImpaye}
        onClose={() => setShowHistoriqueDetailModal(false)}
        onPreviewPDF={handlePreviewPDF}
        onDownloadPDF={handleDownloadPDF}
      />

      <PreviewModal
        isOpen={showPreviewModal}
        previewUrl={previewUrl}
        zoom={previewZoom}
        onClose={closePreview}
        onZoomChange={setPreviewZoom}
        onDownload={() => selectedImpaye && handleDownloadPDF(relanceType)}
      />

      <RelancesGroupeesModal
        isOpen={showRelancesGroupeesModal}
        selectedImpayes={selectedImpayes}
        relanceGroupeeType={relanceGroupeeType}
        relanceGroupeeStep={relanceGroupeeStep}
        isProcessing={isProcessing}
        getEligibleForType={getEligibleForType}
        onClose={() => setShowRelancesGroupeesModal(false)}
        onTypeChange={setRelanceGroupeeType}
        onStepChange={setRelanceGroupeeStep}
        onSend={handleSendRelancesGroupees}
      />
    </div>
  );
}
