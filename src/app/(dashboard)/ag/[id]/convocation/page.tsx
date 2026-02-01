'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Send, AlertCircle, ClipboardCheck, Shield, Mail, FileText } from 'lucide-react';
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
import { updateAgCurrentStep } from '@/lib/ag/api';
import styles from './convocation.module.css';

export default function ConvocationPage() {
  const router = useRouter();
  const params = useParams();
  const agId = params.id as string;

  // Hook de chargement des données depuis Supabase
  const {
    status, agData, resolutions, coproprietaires,
    copropriete, syndic,
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

  // Infos syndic depuis DB ou valeur par défaut
  const syndicInfo = useMemo(() => {
    if (syndic) {
      return {
        nom: syndic.nom,
        adresse: syndic.adresse,
        codePostal: syndic.codePostal,
        ville: syndic.ville,
      };
    }
    // Valeur par défaut si pas de syndic en DB
    return {
      nom: 'Syndic',
      adresse: '',
      codePostal: '',
      ville: '',
    };
  }, [syndic]);

  // Infos copropriété depuis DB
  const coproprieteInfo = useMemo(() => {
    if (copropriete) {
      const adresseComplete = [copropriete.adresse, copropriete.codePostal, copropriete.ville]
        .filter(Boolean)
        .join(', ');
      return {
        nom: copropriete.nom,
        adresse: adresseComplete || copropriete.nom,
      };
    }
    return { nom: 'Copropriété', adresse: '' };
  }, [copropriete]);

  // Hook de prévisualisation PDF - utilise les données DB
  const preview = useConvocationPreview({
    agId,
    agData,
    resolutions,
    copropriete: coproprieteInfo,
    syndic: { nom: syndicInfo.nom, adresse: `${syndicInfo.adresse}, ${syndicInfo.codePostal} ${syndicInfo.ville}`.trim() },
  });

  // Onglet actif (configuration / tracking)
  const [activeTab, setActiveTab] = useState<'config' | 'tracking'>('config');

  // Mise à jour de l'étape courante en DB (étape 3 = Préparation convocations)
  useEffect(() => {
    if (status === 'ready' && agId) {
      updateAgCurrentStep(agId, 3);
    }
  }, [status, agId]);

  // Validation des variables
  const variableValidation = useMemo(() => {
    if (resolutions.length === 0) return null;
    return validateResolutionVariables(resolutions);
  }, [resolutions]);

  const handleContinue = async () => {
    if (!delivery.canValidate) {
      alert('Veuillez compléter les données manquantes avant de continuer.');
      return;
    }
    if (!preview.canSend) {
      alert('Veuillez valider la relecture avant d\'envoyer les convocations.');
      preview.toggleReviewMode();
      return;
    }
    // Naviguer vers l'étape suivante (envoi)
    // Le statut sera mis à jour lors de l'envoi effectif des convocations
    router.push(`/ag/${agId}/envoi`);
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
          <h2 className={styles.previewColumnTitle}>
            <FileText size={24} aria-hidden="true" />
            Prévisualisation
          </h2>
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
          {/* Titre de section */}
          <h2 className={styles.sendingColumnTitle}>
            <Mail size={24} aria-hidden="true" />
            Gestion des envois
          </h2>

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
              Suivi d&apos;envoi
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
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
                    sender={syndicInfo}
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
