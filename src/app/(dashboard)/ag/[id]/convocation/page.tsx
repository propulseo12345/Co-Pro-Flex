'use client';

import { useEffect, useRef } from 'react';
import Stepper from '@/components/features/ag/Stepper';
import { updateAgCurrentStep } from '@/lib/ag/api';
import {
  ConvocationErrorState,
  ConvocationLoadingState,
  ConvocationReviewChecklist,
} from '@/components/features/ag/Convocation';
import {
  useConvocationPage,
  ConvocationHeader,
  ConvocationAlerts,
  ConvocationPreviewColumn,
  ConvocationAnnexesSection,
  ConvocationFooter,
} from '@/features/ag/convocation';
import styles from './convocation.module.css';

export default function ConvocationPage() {
  const {
    agId,
    router,
    status,
    error,
    degradedMode,
    reload,
    agData,
    coproprietaires,
    variableValidation,
    preview,
    delivery,
    annexes,
    uploadedDocs,
    handleContinue,
    handleBack,
  } = useConvocationPage();

  // Mise à jour de l'étape courante en DB (étape 3 = Préparation convocations)
  // Utilise un ref pour ne l'appeler qu'une seule fois
  const stepUpdatedRef = useRef(false);
  useEffect(() => {
    if (agId && status === 'ready' && !stepUpdatedRef.current) {
      stepUpdatedRef.current = true;
      updateAgCurrentStep(agId, 3);
    }
  }, [agId, status]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container">
        <ConvocationLoadingState message="Chargement des données de convocation..." />
      </div>
    );
  }

  // Error state
  if (status === 'error' && error) {
    return (
      <div className="container">
        <ConvocationErrorState
          errorCode={error.code}
          errorMessage={error.message}
          errorDetails={error.details}
          onRetry={reload}
          onGoBack={() => router.push('/ag/dashboard')}
          onDownloadPDF={() => preview.downloadPDF()}
          showDegradedOptions={coproprietaires.length > 0}
        />
      </div>
    );
  }

  return (
    <div className="container">
      <ConvocationHeader
        currentVersion={preview.currentVersion}
        versions={preview.versions}
        onViewVersion={preview.viewVersion}
        onBack={handleBack}
      />

      <Stepper currentStep={3} agId={agId} />

      <ConvocationAlerts
        status={status}
        degradedMode={degradedMode}
        variableValidation={variableValidation}
        reviewValidation={preview.reviewValidation}
        onRetry={reload}
        onDownloadPDF={() => preview.downloadPDF()}
        onNavigateToAgenda={() => router.push(`/ag/${agId}/agenda`)}
        onResetReview={preview.resetReview}
      />

      {/* Main layout */}
      <div className={styles.mainLayout}>
        <ConvocationPreviewColumn
          status={preview.status}
          pdfUrl={preview.pdfUrl}
          error={preview.error}
          previewMode={preview.previewMode}
          currentVersion={preview.currentVersion}
          canSend={preview.canSend}
          onRegenerate={preview.regeneratePreview}
          onDownload={() => preview.downloadPDF()}
          onModeChange={preview.setPreviewMode}
          onToggleReviewMode={preview.toggleReviewMode}
        />
      </div>

      {/* Annexes */}
      <div className={styles.mainLayout}>
        <ConvocationAnnexesSection
          annexes={annexes.annexes}
          onToggle={annexes.toggleAnnexe}
          agType={agData?.type ?? 'ORDINAIRE'}
          uploadedDocs={uploadedDocs}
        />
      </div>

      <ConvocationFooter
        canValidate={delivery.canValidate}
        canSend={preview.canSend}
        onBack={handleBack}
        onContinue={handleContinue}
      />

      {/* Review modal */}
      <ConvocationReviewChecklist
        checklist={preview.checklist}
        reviewValidation={preview.reviewValidation}
        currentVersion={preview.currentVersion}
        isReviewMode={preview.isReviewMode}
        onToggleItem={preview.updateChecklistItem}
        onValidate={preview.validateReview}
        onReset={preview.resetReview}
        onClose={preview.toggleReviewMode}
      />
    </div>
  );
}
