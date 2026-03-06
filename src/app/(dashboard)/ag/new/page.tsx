'use client';

import Stepper from '@/components/features/ag/Stepper';
import { AGFormat } from '@/types';
import type { AGFormData } from '@/features/ag/new/domain/types';
import {
  Header,
  ValidationBanner,
  Footer,
  AgNewFormContent,
  AgNewLoadingState,
  AgNewErrorState,
  SavingIndicator,
} from '@/features/ag/new/components';
import { useAgNewPage } from '@/features/ag/new/hooks';
import styles from './new-ag.module.css';

export default function NewAGPage() {
  const {
    // Loading and error states
    isLoading,
    error,
    isSaving,

    // Form data
    formData,
    errors,
    showValidationErrors,

    // Calendar milestones
    jalons,
    alertes,
    validationDateAG,
    datesMinimales,
    showCalendrierJalons,
    showCalendrier,
    toggleCalendrierJalons,

    // Budget
    budgetTotal,
    budgetPostesManager,
    isBudgetImporting,
    budgetImportError,
    availableBudgetYears,

    // Google Maps
    addressSearchValue,
    addressSuggestions,
    isAddressSearching,
    setAddressSearchValue,
    selectAddressSuggestion,
    isGoogleMapsLoaded,
    googleMapsStatus,

    // Handlers
    handleChange,
    handleVisioUrlChange,
    handleAdresseChange,
    handleSubmit,
    handleBack,
  } = useAgNewPage();

  if (isLoading) {
    return <AgNewLoadingState />;
  }

  if (error) {
    return <AgNewErrorState error={error} />;
  }

  return (
    <div className="container">
      <Header onBack={handleBack} />

      <Stepper currentStep={1} />

      {isSaving && <SavingIndicator />}

      <form onSubmit={handleSubmit} className={styles.form}>
        <ValidationBanner errors={errors} show={showValidationErrors} />

        <AgNewFormContent
          formData={formData}
          errors={errors}
          validationDateAG={validationDateAG}
          datesMinimales={datesMinimales}
          addressSearchValue={addressSearchValue}
          addressSuggestions={addressSuggestions}
          isAddressSearching={isAddressSearching}
          onAddressSearchChange={setAddressSearchValue}
          onAddressSuggestionSelect={selectAddressSuggestion}
          isGoogleMapsLoaded={isGoogleMapsLoaded}
          googleMapsStatus={googleMapsStatus}
          jalons={jalons}
          alertes={alertes}
          showCalendrierJalons={showCalendrierJalons}
          showCalendrier={showCalendrier}
          budgetTotal={budgetTotal}
          budgetPostesManager={budgetPostesManager}
          isBudgetImporting={isBudgetImporting}
          budgetImportError={budgetImportError}
          availableBudgetYears={availableBudgetYears}
          onTypeChange={(type: AGFormData['type']) => handleChange('type', type)}
          onFormatChange={(format: AGFormat) => handleChange('format', format)}
          onDateChange={(date: string) => handleChange('date', date)}
          onHeureChange={(heure: string) => handleChange('heure', heure)}
          onAdresseChange={handleAdresseChange}
          onVisioUrlChange={handleVisioUrlChange}
          onToggleCalendrier={toggleCalendrierJalons}
          onBudgetChange={(value: boolean) => handleChange('budget', value)}
          onExerciceChange={(value: string) => handleChange('budgetExercice', value)}
        />

        <Footer onCancel={handleBack} />
      </form>
    </div>
  );
}
