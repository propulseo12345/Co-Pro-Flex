'use client';

import { parseISO } from 'date-fns';
import Stepper from '@/components/features/ag/Stepper';
import { AGFormat } from '@/types';
import {
  Header,
  TypeAGSection,
  FormatAGSection,
  DateHeureSection,
  AdresseSection,
  VisioSection,
  CalendrierJalonsSection,
  BudgetSection,
  InfoBox,
  ValidationBanner,
  Footer,
} from '../../../../features/ag/new/components';
import { useAgCreateForm, useGoogleMapsAutocomplete, useBudgetPostes } from '../../../../features/ag/new/hooks';
import type { AGFormData, BudgetPoste } from '../../../../features/ag/new/domain/types';
import styles from './new-ag.module.css';

export default function NewAGPage() {
  const {
    formData,
    errors,
    showValidationErrors,
    showCalendrierJalons,
    jalons,
    alertes,
    validationDateAG,
    datesMinimales,
    budgetTotal,
    setShowCalendrierJalons,
    handleChange,
    handleVisioUrlChange,
    handleAdresseChange,
    setAdresseFromAutocomplete,
    handleSubmit,
    handleBack,
    formatAdresseComplete,
  } = useAgCreateForm();

  const { autocompleteRef, isGoogleMapsLoaded } = useGoogleMapsAutocomplete({
    onPlaceSelect: setAdresseFromAutocomplete,
    formatAdresseComplete,
  });

  const budgetPostesManager = useBudgetPostes({
    budgetPostes: formData.budgetPostes,
    onPostesChange: (postes) => handleChange('budgetPostes', postes),
  });

  return (
    <div className="container">
      <Header onBack={handleBack} />

      <Stepper currentStep={1} />

      <form onSubmit={handleSubmit} className={styles.form}>
        <ValidationBanner errors={errors} show={showValidationErrors} />

        <div className={styles.formContent}>
          <TypeAGSection
            type={formData.type}
            onChange={(type) => handleChange('type', type)}
          />

          <FormatAGSection
            format={formData.format}
            onChange={(format) => handleChange('format', format)}
          />

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.required}>Informations obligatoires</span>
            </h2>

            <DateHeureSection
              date={formData.date}
              heure={formData.heure}
              errors={errors}
              validationDateAG={validationDateAG}
              datesMinimales={datesMinimales}
              onDateChange={(date) => handleChange('date', date)}
              onHeureChange={(heure) => handleChange('heure', heure)}
            />

            <AdresseSection
              adresse={formData.adresse}
              adresseComplete={formData.adresseComplete}
              errors={errors}
              autocompleteRef={autocompleteRef}
              isGoogleMapsLoaded={isGoogleMapsLoaded}
              onAdresseChange={handleAdresseChange}
            />

            {formData.format === AGFormat.MIXTE && (
              <VisioSection
                visioUrl={formData.visioUrl}
                visioProvider={formData.visioProvider}
                error={errors.visioUrl}
                onVisioUrlChange={handleVisioUrlChange}
              />
            )}
          </div>

          {formData.date && validationDateAG && validationDateAG.valide && jalons.length > 0 && (
            <CalendrierJalonsSection
              date={formData.date}
              jalons={jalons}
              alertes={alertes}
              showCalendrier={showCalendrierJalons}
              onToggleCalendrier={() => setShowCalendrierJalons(!showCalendrierJalons)}
            />
          )}

          <BudgetSection
            budget={formData.budget}
            budgetExercice={formData.budgetExercice}
            budgetPostes={formData.budgetPostes}
            budgetTotal={budgetTotal}
            errors={errors}
            newPoste={budgetPostesManager.newPoste}
            showCustomPoste={budgetPostesManager.showCustomPoste}
            editing={budgetPostesManager.editing}
            onBudgetChange={(value) => handleChange('budget', value)}
            onExerciceChange={(value) => handleChange('budgetExercice', value)}
            onNewPosteChange={budgetPostesManager.setNewPoste}
            onPosteSelect={budgetPostesManager.handlePosteSelect}
            onAddPoste={budgetPostesManager.handleAddPoste}
            onRemovePoste={budgetPostesManager.handleRemovePoste}
            onEditPoste={budgetPostesManager.handleEditPoste}
            onSavePoste={budgetPostesManager.handleSavePoste}
            onCancelEdit={budgetPostesManager.handleCancelEdit}
            onEditKeyDown={budgetPostesManager.handleEditKeyDown}
            onImportBudget={budgetPostesManager.handleImportBudgetPrecedent}
            onUpdateEditingData={budgetPostesManager.updateEditingData}
          />

          <InfoBox type={formData.type} />
        </div>

        <Footer onCancel={handleBack} />
      </form>
    </div>
  );
}
