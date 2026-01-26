'use client';

import { useMemo, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, AlertCircle, ClipboardCheck, Shield } from 'lucide-react';
import Stepper from '@/components/features/ag/Stepper';
import {
  ConvocationErrorState,
  ConvocationLoadingState,
  ConvocationDegradedBanner,
  ConvocationPreview,
  ConvocationReviewChecklist,
  ConvocationVersionBadge,
} from '@/components/features/ag/Convocation';
import {
  DeliveryModeSelector,
  DeliveryByOwnerTable,
  PostalLabelsGeneratorButton,
  EmailSendTrackingPanel,
} from '@/components/features/ag/Delivery';
import { useConvocationData } from '@/hooks/modules/useConvocationData';
import { useConvocationPreview } from '@/hooks/modules/useConvocationPreview';
import { useDeliveryConfig, type CoproprietaireDelivery } from '@/hooks/modules/useDeliveryConfig';
import { validateResolutionVariables } from '@/lib/utils/variable-resolution';
import styles from './convocation.module.css';

const SYNDIC_INFO = {
  nom: 'Cabinet Immobilier Martin',
  adresse: '10 place Bellecour',
  codePostal: '69002',
  ville: 'Lyon',
};

export default function ConvocationPage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  // Hook de chargement des données
  const {
    status, agData, resolutions, coproprietaires,
    error, degradedMode, reload,
  } = useConvocationData({ agId, timeoutMs: 10000 });

  // Conversion copropriétaires pour le hook delivery
  const deliveryCopros = useMemo<CoproprietaireDelivery[]>(() => {
    return coproprietaires.map((c) => ({
      id: c.id,
      nom: c.nom,
      lot: c.lot,
      email: c.email,
      adressePostale: c.adressePostale,
      tantiemes: c.tantiemes,
    }));
  }, [coproprietaires]);

  // Hook de gestion des modes d'envoi
  const delivery = useDeliveryConfig({ agId, coproprietaires: deliveryCopros });

  // Hook de prévisualisation PDF
  const preview = useConvocationPreview({
    agId,
    agData,
    resolutions,
    copropriete: { nom: 'Résidence Les Jardins', adresse: '25 avenue Victor Hugo, 69003 Lyon' },
    syndic: { nom: SYNDIC_INFO.nom, adresse: SYNDIC_INFO.ville },
  });

  // Onglet actif (configuration / tracking)
  const [activeTab, setActiveTab] = useState<'config' | 'tracking'>('config');

  // Validation des variables
  const variableValidation = useMemo(() => {
    if (resolutions.length === 0) return null;
    return validateResolutionVariables(resolutions);
  }, [resolutions]);

  const handleContinue = () => {
    if (!delivery.canValidate) {
      alert('Veuillez compléter les données manquantes avant de continuer.');
      return;
    }
    if (!preview.canSend) {
      alert('Veuillez valider la relecture avant d\'envoyer les convocations.');
      preview.toggleReviewMode();
      return;
    }
    localStorage.setItem('ag-sent-' + agId, 'true');
    router.push(`/ag/${agId}/preparation`);
  };

  // États de chargement/erreur
  if (status === 'loading') {
    return <div className="container"><ConvocationLoadingState message="Chargement des données de convocation..." /></div>;
  }

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
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => router.push(`/ag/${agId}/agenda`)} className={styles.backButton}>
          <ArrowLeft size={20} aria-hidden="true" /> Retour
        </button>
        <div className={styles.headerContent}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Convocations</h1>
            <ConvocationVersionBadge
              currentVersion={preview.currentVersion}
              versions={preview.versions}
              onViewVersion={preview.viewVersion}
            />
          </div>
          <p className={styles.subtitle}>Préparez et envoyez les convocations aux copropriétaires</p>
        </div>
      </div>

      <Stepper currentStep={3} agId={agId} />

      {/* Alertes */}
      {status === 'degraded' && <ConvocationDegradedBanner {...degradedMode} onRetry={reload} onDownloadPDF={() => preview.downloadPDF()} />}

      {variableValidation && !variableValidation.isComplete && (
        <div className={`${styles.alertBanner} ${styles.alertBannerWarning}`}>
          <AlertCircle size={20} aria-hidden="true" />
          <div>
            <strong>Variables non remplies</strong>
            <p>{variableValidation.unfilledVariables.length} variable(s) à compléter.</p>
            <button onClick={() => router.push(`/ag/${agId}/agenda`)} className={styles.alertLink}>
              Retourner à l&apos;ordre du jour
            </button>
          </div>
        </div>
      )}

      {/* Validation banner */}
      {preview.reviewValidation && (
        <div className={styles.validatedBanner}>
          <Shield size={20} aria-hidden="true" />
          <span>Convocation validée par {preview.reviewValidation.reluPar} (v{preview.reviewValidation.version})</span>
          <button onClick={preview.resetReview} className={styles.resetReviewBtn}>Réinitialiser</button>
        </div>
      )}

      {/* Layout principal */}
      <div className={styles.mainLayout}>
        {/* Colonne gauche: Preview */}
        <div className={styles.previewColumn}>
          <ConvocationPreview
            status={preview.status}
            pdfUrl={preview.pdfUrl}
            error={preview.error}
            previewMode={preview.previewMode}
            version={preview.currentVersion}
            onRegenerate={preview.regeneratePreview}
            onDownload={() => preview.downloadPDF()}
            onModeChange={preview.setPreviewMode}
          />
          <button onClick={preview.toggleReviewMode} className={`${styles.reviewBtn} ${preview.canSend ? styles.reviewBtnValidated : ''}`}>
            <ClipboardCheck size={16} aria-hidden="true" />
            {preview.canSend ? 'Relecture validée' : 'Mode relecture obligatoire'}
          </button>
        </div>

        {/* Colonne droite: Configuration envoi */}
        <div className={styles.sendingColumn}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              onClick={() => setActiveTab('config')}
              className={`${styles.tab} ${activeTab === 'config' ? styles.tabActive : ''}`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`${styles.tab} ${activeTab === 'tracking' ? styles.tabActive : ''}`}
            >
              Suivi envois
            </button>
          </div>

          {activeTab === 'config' ? (
            <>
              <DeliveryModeSelector
                selectedMode={delivery.config.globalMode}
                isRegistered={delivery.config.postalSettings.isRegistered}
                stats={delivery.stats}
                onModeChange={delivery.setGlobalMode}
                onRegisteredChange={delivery.setPostalRegistered}
              />

              <DeliveryByOwnerTable
                owners={delivery.ownerStatuses}
                globalMode={delivery.config.globalMode}
                onOwnerModeChange={delivery.setOwnerMode}
                onSavePreferences={delivery.saveAsPreferences}
                onResetPreferences={delivery.resetToPreferences}
              />

              {/* Actions */}
              <div className={styles.actionsSection}>
                <PostalLabelsGeneratorButton
                  postalRecipients={delivery.getOwnersForPostal()}
                  sendType={delivery.config.postalSettings.sendType}
                  sender={SYNDIC_INFO}
                  agTitle={agData?.type}
                />
              </div>
            </>
          ) : (
            <EmailSendTrackingPanel
              emailRecipients={delivery.getOwnersForEmail()}
              stats={delivery.stats}
              onSendEmail={delivery.sendEmail}
              onSendAllEmails={delivery.sendAllEmails}
            />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button onClick={() => router.push(`/ag/${agId}/agenda`)} className="btn btn-secondary">
          <ArrowLeft size={16} aria-hidden="true" /> Retour
        </button>
        <button onClick={handleContinue} className="btn btn-primary" disabled={!delivery.canValidate || !preview.canSend}>
          <Send size={16} aria-hidden="true" /> Envoyer et continuer <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Modal relecture */}
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
