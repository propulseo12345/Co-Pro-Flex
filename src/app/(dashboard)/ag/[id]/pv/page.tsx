'use client';

import { useParams, useRouter } from 'next/navigation';
import Stepper from '@/components/features/ag/Stepper';
import { StepUnavailable, AgDocumentActions } from '@/components/features/ag';
import { useAGStepGuard } from '@/hooks/modules/useAGStepGuard';
import { useCopro } from '@/providers/CoproContext';
import {
  Header,
  SuccessBanner,
  SummarySection,
  PDFSection,
  ResolutionsSummary,
  TextPreviewSection,
  Sidebar,
  Footer,
  SignatairesModal,
  SignaturePadModal,
  AutoFillConfirmModal,
  LoadingState,
  ErrorState,
} from '../../../../../features/ag/pv/components';
import { usePVPage, useSignaturePad } from '../../../../../features/ag/pv/hooks';
import styles from './pv.module.css';

export default function PVPage() {
  const params = useParams();
  const router = useRouter();
  const agId = params.id as string;
  const { currentCoproId } = useCopro();

  const {
    state: guardState,
    blockReason,
    redirectUrl,
  } = useAGStepGuard({
    agId,
    stepId: 'proces_verbal',
    autoRedirect: true,
    redirectDelay: 100,
  });

  const {
    canvasRef,
    agId: _agId,
    agData,
    resolutions,
    pvText,
    signataires,
    stats,
    isPreviewMode,
    isSigned,
    isDataLoading,
    dataLoadError,
    showSignatairesModal,
    showSignaturePadModal,
    currentSignataire,
    showAutoFillConfirm,
    autoFillData,
    autoFillSuccess,
    modeSignature,
    modeConfig,
    isEmailObligatoire,
    pdfUrl,
    isGeneratingPdf,
    pdfError,
    isDrawing,
    setIsPreviewMode,
    setShowSignatairesModal,
    setShowSignaturePadModal,
    setShowAutoFillConfirm,
    setModeSignature,
    setPdfUrl,
    setPdfError,
    setIsDrawing,
    getResolutionResult,
    handleDownloadPDF,
    handlePreviewPDF,
    handleOpenSignatairesModal,
    updateSignataire,
    handleAutoFillFromAG,
    applyAutoFill,
    handleSendSignatureRequests,
    handleOpenSignaturePad,
    clearSignature,
    saveSignature,
    handleFinish,
    handleGoBack,
  } = usePVPage({ agId });

  const { startDrawing, draw, stopDrawing, clearCanvas } = useSignaturePad({
    canvasRef,
    isOpen: showSignaturePadModal,
    isDrawing,
    setIsDrawing,
  });

  // Guard states
  if (guardState === 'loading') {
    return <LoadingState message="Vérification des prérequis..." />;
  }

  if (guardState === 'redirecting') {
    return (
      <div className="container">
        <StepUnavailable
          reason={blockReason || 'Prérequis non satisfaits'}
          redirectUrl={redirectUrl || undefined}
          redirectLabel="Accéder à l'ordre du jour"
          backUrl={`/ag/${agId}/session`}
          backLabel="Retour à la session"
          isRedirecting
        />
      </div>
    );
  }

  if (guardState === 'blocked' || guardState === 'error') {
    return (
      <div className="container">
        <StepUnavailable
          reason={blockReason || "Cette étape n'est pas accessible."}
          redirectUrl={redirectUrl || `/ag/${agId}/agenda`}
          redirectLabel="Accéder à l'ordre du jour"
          backUrl={`/ag/${agId}/session`}
          backLabel="Retour à la session"
        />
      </div>
    );
  }

  // Data loading states
  if (isDataLoading) {
    return (
      <LoadingState
        message="Chargement des données de l'AG..."
        hint="Si le chargement persiste, vérifiez vos données ou rafraîchissez la page."
      />
    );
  }

  if (dataLoadError) {
    return (
      <ErrorState
        title="Erreur de chargement"
        message={dataLoadError}
        onRefresh={() => window.location.reload()}
        onBack={handleGoBack}
      />
    );
  }

  if (!agData) {
    return (
      <ErrorState
        title="Assemblée non trouvée"
        message="Les données de cette AG n'ont pas été trouvées. Vérifiez que vous avez bien complété les étapes précédentes."
        iconColor="var(--color-warning)"
        onBack={handleGoBack}
        onHome={() => router.push('/ag/dashboard')}
      />
    );
  }

  return (
    <div className="container">
      <Header onBack={handleGoBack} />

      <Stepper currentStep={7} agId={agId} />

      {isSigned && <SuccessBanner />}

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          <SummarySection stats={stats} />

          <PDFSection
            pdfUrl={pdfUrl}
            isGeneratingPdf={isGeneratingPdf}
            pdfError={pdfError}
            onPreview={handlePreviewPDF}
            onDownload={handleDownloadPDF}
            onClosePdf={() => setPdfUrl(null)}
            onDismissError={() => setPdfError(null)}
          />

          {/* Archivage Supabase */}
          {currentCoproId && (
            <AgDocumentActions
              agId={agId}
              docType="pv"
              title="Archiver le PV dans la GED"
              description="Générez et archivez le procès-verbal officiel dans le système documentaire (conservation 10 ans)"
              showHistory
            />
          )}

          <ResolutionsSummary resolutions={resolutions} getResolutionResult={getResolutionResult} />

          <TextPreviewSection
            pvText={pvText}
            isPreviewMode={isPreviewMode}
            onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
            onDownloadPDF={handleDownloadPDF}
          />
        </div>

        <Sidebar
          isSigned={isSigned}
          onOpenSignatairesModal={handleOpenSignatairesModal}
          onShowSignatairesModal={() => setShowSignatairesModal(true)}
          onFinish={handleFinish}
        />
      </div>

      <Footer isSigned={isSigned} onBack={handleGoBack} onFinish={handleFinish} />

      <SignatairesModal
        isOpen={showSignatairesModal}
        signataires={signataires}
        modeSignature={modeSignature}
        modeConfig={modeConfig}
        isEmailObligatoire={isEmailObligatoire}
        autoFillSuccess={autoFillSuccess}
        onClose={() => setShowSignatairesModal(false)}
        onAutoFill={handleAutoFillFromAG}
        onUpdateSignataire={updateSignataire}
        onOpenSignaturePad={handleOpenSignaturePad}
        onClearSignature={clearSignature}
        onSetModeSignature={setModeSignature}
        onSendSignatureRequests={handleSendSignatureRequests}
      />

      <SignaturePadModal
        isOpen={showSignaturePadModal}
        currentSignataire={currentSignataire}
        canvasRef={canvasRef}
        onClose={() => setShowSignaturePadModal(false)}
        onClear={clearCanvas}
        onSave={saveSignature}
        onStartDrawing={startDrawing}
        onDraw={draw}
        onStopDrawing={stopDrawing}
      />

      <AutoFillConfirmModal
        isOpen={showAutoFillConfirm}
        autoFillData={autoFillData}
        onClose={() => setShowAutoFillConfirm(false)}
        onApply={applyAutoFill}
      />
    </div>
  );
}
