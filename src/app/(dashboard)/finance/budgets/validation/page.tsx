'use client';

import { useBudgetValidationPage } from '@/features/finance/budgets/validation/hooks';
import {
  NoCoproState,
  ErrorBanner,
  ConfigStep,
  PreviewStep,
  SuccessStep,
} from '@/features/finance/budgets/validation/components';
import styles from './validation.module.css';

export default function BudgetValidationPage() {
  const {
    step,
    budget,
    modeEcheancier,
    cleRepartition,
    resolutionGeneree,
    currentCoproId,
    isSaving,
    mutationError,
    clesRepartition,
    updateBudget,
    setModeEcheancier,
    setCleRepartition,
    handlePreview,
    handleValider,
    goBack,
    goToBudgets,
    goToNewAG,
    goToConfig,
    getCleRepartitionLabel,
  } = useBudgetValidationPage();

  return (
    <div className="container">
      <div className={styles.header}>
        <h1 className={styles.title}>Validation du budget prévisionnel</h1>
        <p className={styles.subtitle}>
          Créez et validez votre budget pour générer automatiquement la résolution
          d&apos;approbation et l&apos;échéancier d&apos;appels de fonds
        </p>
      </div>

      {!currentCoproId && <NoCoproState />}

      {mutationError && <ErrorBanner error={mutationError} />}

      {step === 'config' && currentCoproId && (
        <ConfigStep
          budget={budget}
          modeEcheancier={modeEcheancier}
          cleRepartition={cleRepartition}
          clesRepartition={clesRepartition}
          onBudgetChange={updateBudget}
          onModeChange={setModeEcheancier}
          onCleChange={setCleRepartition}
          onCancel={goBack}
          onPreview={handlePreview}
        />
      )}

      {step === 'preview' && resolutionGeneree && (
        <PreviewStep
          budget={budget}
          modeEcheancier={modeEcheancier}
          cleRepartitionLabel={getCleRepartitionLabel(cleRepartition)}
          resolutionGeneree={resolutionGeneree}
          isSaving={isSaving}
          currentCoproId={currentCoproId}
          onModify={goToConfig}
          onValidate={handleValider}
        />
      )}

      {step === 'success' && (
        <SuccessStep
          budget={budget}
          modeEcheancier={modeEcheancier}
          resolutionGeneree={resolutionGeneree}
          onGoToBudgets={goToBudgets}
          onGoToNewAG={goToNewAG}
        />
      )}
    </div>
  );
}
