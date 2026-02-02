'use client';

import { useNewResolutionPage } from '@/features/ag/resolutions-new/hooks';
import {
  PageHeader,
  AlertBox,
  TitreSection,
  AppelFondsCheckbox,
  MajoriteSection,
  CleRepartitionSection,
  CorpsSection,
  EcheancierSection,
} from '@/features/ag/resolutions-new/components';
import styles from './new-resolution.module.css';

export default function NewResolutionPage() {
  const {
    MAJORITES,
    showAlert,
    titre,
    majorite,
    cleRepartition,
    corps,
    estAppelFonds,
    modeEcheancier,
    montantTotal,
    dateDebut,
    nombreEcheancesPersonnalisees,
    echeances,
    setTitre,
    setMajorite,
    setCleRepartition,
    setCorps,
    setEstAppelFonds,
    handleModeEcheancierChange,
    handleMontantChange,
    handleDateDebutChange,
    handleNombreEcheancesChange,
    handleEcheanceChange,
    handleSubmit,
    handleBack,
    closeAlert,
  } = useNewResolutionPage();

  return (
    <div className="container">
      <PageHeader onBack={handleBack} />

      {showAlert && <AlertBox onClose={closeAlert} />}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formContent}>
          <TitreSection titre={titre} onTitreChange={setTitre} />

          <AppelFondsCheckbox
            estAppelFonds={estAppelFonds}
            onEstAppelFondsChange={setEstAppelFonds}
          />

          <MajoriteSection
            majorite={majorite}
            MAJORITES={MAJORITES}
            onMajoriteChange={setMajorite}
          />

          <CleRepartitionSection
            cleRepartition={cleRepartition}
            onCleRepartitionChange={setCleRepartition}
          />

          <CorpsSection corps={corps} onCorpsChange={setCorps} />

          {estAppelFonds && (
            <EcheancierSection
              modeEcheancier={modeEcheancier}
              montantTotal={montantTotal}
              dateDebut={dateDebut}
              nombreEcheancesPersonnalisees={nombreEcheancesPersonnalisees}
              echeances={echeances}
              onModeChange={handleModeEcheancierChange}
              onMontantChange={handleMontantChange}
              onDateDebutChange={handleDateDebutChange}
              onNombreEcheancesChange={handleNombreEcheancesChange}
              onEcheanceChange={handleEcheanceChange}
            />
          )}
        </div>

        <div className={styles.actions}>
          <button type="submit" className="btn btn-primary">
            Ajouter a l'ordre du jour
          </button>
        </div>
      </form>
    </div>
  );
}
