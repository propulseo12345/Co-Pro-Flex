'use client';

import Stepper from '@/components/features/ag/Stepper';
import { AgDocumentActions } from '@/components/features/ag';
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
} from './index';
import styles from '@/app/(dashboard)/ag/[id]/pv/pv.module.css';
import type { RefObject } from 'react';
import type { Resolution, Signataire, PVStats, ResolutionResult } from '../domain/types';
import type { ModeSignature } from '@/types/models/pv-signature';
import { LABELS_MODE_SIGNATURE } from '@/types/models/pv-signature';
import type { ExtractedSignataire } from '@/lib/utils/variable-resolution';

type ModeSignatureConfig = typeof LABELS_MODE_SIGNATURE[ModeSignature];

interface PvPageContentProps {
  // IDs
  agId: string;
  currentCoproId: string | null;

  // Data
  stats: PVStats;
  resolutions: Resolution[];
  pvText: string;
  signataires: Signataire[];
  currentSignataire: Signataire | null;
  autoFillData: ExtractedSignataire[];

  // State
  isPreviewMode: boolean;
  isSigned: boolean;
  pdfUrl: string | null;
  isGeneratingPdf: boolean;
  pdfError: string | null;
  showSignatairesModal: boolean;
  showSignaturePadModal: boolean;
  showAutoFillConfirm: boolean;
  autoFillSuccess: string | null;
  modeSignature: ModeSignature;
  modeConfig: ModeSignatureConfig;
  isEmailObligatoire: boolean;

  // Refs
  canvasRef: RefObject<HTMLCanvasElement | null>;

  // Handlers
  onGoBack: () => void;
  setIsPreviewMode: (value: boolean) => void;
  setShowSignatairesModal: (value: boolean) => void;
  setShowSignaturePadModal: (value: boolean) => void;
  setShowAutoFillConfirm: (value: boolean) => void;
  setModeSignature: (value: ModeSignature) => void;
  setPdfUrl: (value: string | null) => void;
  setPdfError: (value: string | null) => void;
  getResolutionResult: (resolution: Resolution) => ResolutionResult;
  onDownloadPDF: () => void;
  onPreviewPDF: () => void;
  onOpenSignatairesModal: () => void;
  onUpdateSignataire: (id: string, field: keyof Signataire, value: string) => void;
  onAutoFillFromAG: () => void;
  onApplyAutoFill: (data: ExtractedSignataire[]) => void;
  onSendSignatureRequests: () => void;
  onOpenSignaturePad: (signataire: Signataire) => void;
  onClearSignature: (id: string) => void;
  onSaveSignature: () => void;
  onFinish: () => void;
  onFinalisation?: () => void;

  // Signature pad handlers
  onStartDrawing: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onDraw: (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => void;
  onStopDrawing: () => void;
  onClearCanvas: () => void;
}

export function PvPageContent({
  agId,
  currentCoproId,
  stats,
  resolutions,
  pvText,
  signataires,
  currentSignataire,
  autoFillData,
  isPreviewMode,
  isSigned,
  pdfUrl,
  isGeneratingPdf,
  pdfError,
  showSignatairesModal,
  showSignaturePadModal,
  showAutoFillConfirm,
  autoFillSuccess,
  modeSignature,
  modeConfig,
  isEmailObligatoire,
  canvasRef,
  onGoBack,
  setIsPreviewMode,
  setShowSignatairesModal,
  setShowSignaturePadModal,
  setShowAutoFillConfirm,
  setModeSignature,
  setPdfUrl,
  setPdfError,
  getResolutionResult,
  onDownloadPDF,
  onPreviewPDF,
  onOpenSignatairesModal,
  onUpdateSignataire,
  onAutoFillFromAG,
  onApplyAutoFill,
  onSendSignatureRequests,
  onOpenSignaturePad,
  onClearSignature,
  onSaveSignature,
  onFinish,
  onFinalisation,
  onStartDrawing,
  onDraw,
  onStopDrawing,
  onClearCanvas,
}: PvPageContentProps) {
  return (
    <div className="container">
      <Header onBack={onGoBack} />

      <Stepper currentStep={8} agId={agId} />

      {isSigned && <SuccessBanner signataires={signataires} />}

      <div className={styles.layout}>
        <div className={styles.mainContent}>
          <SummarySection stats={stats} />

          <PDFSection
            pdfUrl={pdfUrl}
            isGeneratingPdf={isGeneratingPdf}
            pdfError={pdfError}
            onPreview={onPreviewPDF}
            onDownload={onDownloadPDF}
            onClosePdf={() => setPdfUrl(null)}
            onDismissError={() => setPdfError(null)}
          />

          {currentCoproId && (
            <AgDocumentActions
              agId={agId}
              docType="pv"
              title="Archiver le PV dans la GED"
              description="Generez et archivez le proces-verbal officiel dans le systeme documentaire (conservation 10 ans)"
              showHistory
            />
          )}

          <ResolutionsSummary resolutions={resolutions} getResolutionResult={getResolutionResult} />

          <TextPreviewSection
            pvText={pvText}
            isPreviewMode={isPreviewMode}
            onTogglePreview={() => setIsPreviewMode(!isPreviewMode)}
            onDownloadPDF={onDownloadPDF}
          />
        </div>

        <Sidebar
          isSigned={isSigned}
          onOpenSignatairesModal={onOpenSignatairesModal}
          onShowSignatairesModal={() => setShowSignatairesModal(true)}
          onFinish={onFinish}
          onFinalisation={onFinalisation}
        />
      </div>

      <Footer isSigned={isSigned} onBack={onGoBack} onFinish={onFinish} onFinalisation={onFinalisation} />

      <SignatairesModal
        isOpen={showSignatairesModal}
        signataires={signataires}
        modeSignature={modeSignature}
        modeConfig={modeConfig}
        isEmailObligatoire={isEmailObligatoire}
        autoFillSuccess={autoFillSuccess}
        onClose={() => setShowSignatairesModal(false)}
        onAutoFill={onAutoFillFromAG}
        onUpdateSignataire={onUpdateSignataire}
        onOpenSignaturePad={onOpenSignaturePad}
        onClearSignature={onClearSignature}
        onSetModeSignature={setModeSignature}
        onSendSignatureRequests={onSendSignatureRequests}
      />

      <SignaturePadModal
        isOpen={showSignaturePadModal}
        currentSignataire={currentSignataire}
        canvasRef={canvasRef}
        onClose={() => setShowSignaturePadModal(false)}
        onClear={onClearCanvas}
        onSave={onSaveSignature}
        onStartDrawing={onStartDrawing}
        onDraw={onDraw}
        onStopDrawing={onStopDrawing}
      />

      <AutoFillConfirmModal
        isOpen={showAutoFillConfirm}
        autoFillData={autoFillData}
        onClose={() => setShowAutoFillConfirm(false)}
        onApply={onApplyAutoFill}
      />
    </div>
  );
}
