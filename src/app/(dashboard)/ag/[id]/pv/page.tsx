'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAGStepGuard } from '@/hooks/modules/useAGStepGuard';
import { updateAgCurrentStep } from '@/lib/ag/api';
import { useCopro } from '@/providers/CoproContext';
import {
  PvPageContent,
  PvGuardStates,
} from '../../../../../features/ag/pv/components';
import { usePVPage, useSignaturePad } from '../../../../../features/ag/pv/hooks';
import { ActivationRecap } from '@/components/features/ag/PV/ActivationRecap';

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

  const pvPage = usePVPage({ agId });

  const { startDrawing, draw, stopDrawing, clearCanvas } = useSignaturePad({
    canvasRef: pvPage.canvasRef,
    isOpen: pvPage.showSignaturePadModal,
    isDrawing: pvPage.isDrawing,
    setIsDrawing: pvPage.setIsDrawing,
  });

  // Update current step in DB (step 8 = Proces-verbal)
  useEffect(() => {
    if (guardState === 'allowed' && !pvPage.isDataLoading && pvPage.agData && agId) {
      updateAgCurrentStep(agId, 8);
    }
  }, [guardState, pvPage.isDataLoading, pvPage.agData, agId]);

  // Handle guard states
  const guardContent = PvGuardStates({
    guardState,
    blockReason,
    redirectUrl,
    agId,
    isDataLoading: pvPage.isDataLoading,
    dataLoadError: pvPage.dataLoadError,
    hasAgData: !!pvPage.agData,
    onGoBack: pvPage.handleGoBack,
    onRefresh: pvPage.handleRetry,
    onHome: () => router.push('/ag/dashboard'),
  });

  if (guardContent) {
    return guardContent;
  }

  return (
    <>
      <PvPageContent
        agId={agId}
        currentCoproId={currentCoproId}
        stats={pvPage.stats}
        resolutions={pvPage.resolutions}
        pvText={pvPage.pvText}
        signataires={pvPage.signataires}
        currentSignataire={pvPage.currentSignataire}
        autoFillData={pvPage.autoFillData}
        isPreviewMode={pvPage.isPreviewMode}
        isSigned={pvPage.isSigned}
        pdfUrl={pvPage.pdfUrl}
        isGeneratingPdf={pvPage.isGeneratingPdf}
        pdfError={pvPage.pdfError}
        showSignatairesModal={pvPage.showSignatairesModal}
        showSignaturePadModal={pvPage.showSignaturePadModal}
        showAutoFillConfirm={pvPage.showAutoFillConfirm}
        autoFillSuccess={pvPage.autoFillSuccess}
        modeSignature={pvPage.modeSignature}
        modeConfig={pvPage.modeConfig}
        isEmailObligatoire={pvPage.isEmailObligatoire}
        canvasRef={pvPage.canvasRef}
        onGoBack={pvPage.handleGoBack}
        setIsPreviewMode={pvPage.setIsPreviewMode}
        setShowSignatairesModal={pvPage.setShowSignatairesModal}
        setShowSignaturePadModal={pvPage.setShowSignaturePadModal}
        setShowAutoFillConfirm={pvPage.setShowAutoFillConfirm}
        setModeSignature={pvPage.setModeSignature}
        setPdfUrl={pvPage.setPdfUrl}
        setPdfError={pvPage.setPdfError}
        getResolutionResult={pvPage.getResolutionResult}
        onDownloadPDF={pvPage.handleDownloadPDF}
        onPreviewPDF={pvPage.handlePreviewPDF}
        onOpenSignatairesModal={pvPage.handleOpenSignatairesModal}
        onUpdateSignataire={pvPage.updateSignataire}
        onAutoFillFromAG={pvPage.handleAutoFillFromAG}
        onApplyAutoFill={pvPage.applyAutoFill}
        onSendSignatureRequests={pvPage.handleSendSignatureRequests}
        onOpenSignaturePad={pvPage.handleOpenSignaturePad}
        onClearSignature={pvPage.clearSignature}
        onSaveSignature={pvPage.saveSignature}
        onFinish={pvPage.handleFinish}
        onFinalisation={() => router.push(`/ag/${agId}/finalisation`)}
        onStartDrawing={startDrawing}
        onDraw={draw}
        onStopDrawing={stopDrawing}
        onClearCanvas={clearCanvas}
      />
      {pvPage.showActivationRecap && pvPage.activationResult && (
        <ActivationRecap
          agId={agId}
          result={pvPage.activationResult}
          onClose={() => pvPage.setShowActivationRecap(false)}
        />
      )}
    </>
  );
}
