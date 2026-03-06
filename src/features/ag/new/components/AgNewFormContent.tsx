'use client';

import { AGFormat } from '@/types';
import type { JalonAG } from '@/lib/constants/ag-delais-legaux';
import type { AlerteDelai, ValidationDateAG, DatesMinimales } from '@/hooks/modules/useAGDelais';
import {
  TypeAGSection,
  FormatAGSection,
  DateHeureSection,
  AdresseSection,
  VisioSection,
  CalendrierJalonsSection,
  BudgetSection,
  InfoBox,
} from './index';
import type { AdresseAG, BudgetPoste, EditingPosteState } from '../domain/types';
import type { GoogleMapsAutocompleteStatus, AdresseAutocompleteSuggestion } from '../domain/types';
import type { BudgetImportSource } from '../hooks/useBudgetImport';
import styles from '@/app/(dashboard)/ag/new/new-ag.module.css';

interface BudgetPostesManager {
  newPoste: { poste: string; montant: string };
  showCustomPoste: boolean;
  editing: EditingPosteState;
  isImporting: boolean;
  importError: string | null;
  setNewPoste: (poste: { poste: string; montant: string }) => void;
  handlePosteSelect: (value: string) => void;
  handleAddPoste: () => void;
  handleRemovePoste: (id: string) => void;
  handleEditPoste: (poste: BudgetPoste) => void;
  handleSavePoste: () => void;
  handleCancelEdit: () => void;
  handleEditKeyDown: (e: React.KeyboardEvent) => void;
  handleImportBudgetPrecedent: (params: {
    source: BudgetImportSource;
    budgetId?: string | null;
  }) => void;
  updateEditingData: (field: 'poste' | 'montant', value: string) => void;
}

interface FormData {
  type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE';
  format: AGFormat;
  date: string;
  heure: string;
  adresse: AdresseAG;
  adresseComplete: string;
  visioUrl: string;
  visioProvider?: string;
  budget: boolean;
  budgetExercice: string;
  budgetPostes: BudgetPoste[];
}

interface AgNewFormContentProps {
  formData: FormData;
  errors: Record<string, string>;
  validationDateAG: ValidationDateAG | null;
  datesMinimales: DatesMinimales;
  addressSearchValue: string;
  addressSuggestions: AdresseAutocompleteSuggestion[];
  isAddressSearching: boolean;
  onAddressSearchChange: (value: string) => void;
  onAddressSuggestionSelect: (suggestion: AdresseAutocompleteSuggestion) => void;
  isGoogleMapsLoaded: boolean;
  googleMapsStatus: GoogleMapsAutocompleteStatus;
  jalons: JalonAG[];
  alertes: AlerteDelai[];
  showCalendrierJalons: boolean;
  showCalendrier: boolean;
  budgetTotal: number;
  budgetPostesManager: BudgetPostesManager;
  isBudgetImporting: boolean;
  budgetImportError: string | null;
  availableBudgetYears: number[];
  onTypeChange: (type: 'ORDINAIRE' | 'EXTRAORDINAIRE' | 'URGENTE') => void;
  onFormatChange: (format: AGFormat) => void;
  onDateChange: (date: string) => void;
  onHeureChange: (heure: string) => void;
  onAdresseChange: (field: keyof AdresseAG, value: string) => void;
  onVisioUrlChange: (url: string) => void;
  onToggleCalendrier: () => void;
  onBudgetChange: (value: boolean) => void;
  onExerciceChange: (value: string) => void;
}

export function AgNewFormContent({
  formData,
  errors,
  validationDateAG,
  datesMinimales,
  addressSearchValue,
  addressSuggestions,
  isAddressSearching,
  onAddressSearchChange,
  onAddressSuggestionSelect,
  isGoogleMapsLoaded,
  googleMapsStatus,
  jalons,
  alertes,
  showCalendrierJalons,
  showCalendrier,
  budgetTotal,
  budgetPostesManager,
  isBudgetImporting,
  budgetImportError,
  availableBudgetYears,
  onTypeChange,
  onFormatChange,
  onDateChange,
  onHeureChange,
  onAdresseChange,
  onVisioUrlChange,
  onToggleCalendrier,
  onBudgetChange,
  onExerciceChange,
}: AgNewFormContentProps) {
  return (
    <div className={styles.formContent}>
      <TypeAGSection
        type={formData.type}
        onChange={onTypeChange}
      />

      <FormatAGSection
        format={formData.format}
        onChange={onFormatChange}
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
          onDateChange={onDateChange}
          onHeureChange={onHeureChange}
        />

        <AdresseSection
          adresse={formData.adresse}
          adresseComplete={formData.adresseComplete}
          errors={errors}
          addressSearchValue={addressSearchValue}
          addressSuggestions={addressSuggestions}
          isAddressSearching={isAddressSearching}
          onAddressSearchChange={onAddressSearchChange}
          onAddressSuggestionSelect={onAddressSuggestionSelect}
          isGoogleMapsLoaded={isGoogleMapsLoaded}
          googleMapsStatus={googleMapsStatus}
          onAdresseChange={onAdresseChange}
        />

        {formData.format === AGFormat.MIXTE && (
          <VisioSection
            visioUrl={formData.visioUrl}
            visioProvider={formData.visioProvider}
            error={errors.visioUrl}
            onVisioUrlChange={onVisioUrlChange}
          />
        )}
      </div>

      {showCalendrier && (
        <CalendrierJalonsSection
          date={formData.date}
          jalons={jalons}
          alertes={alertes}
          showCalendrier={showCalendrierJalons}
          onToggleCalendrier={onToggleCalendrier}
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
        isImporting={budgetPostesManager.isImporting || isBudgetImporting}
        importError={budgetPostesManager.importError || budgetImportError}
        availableBudgetYears={availableBudgetYears}
        onBudgetChange={onBudgetChange}
        onExerciceChange={onExerciceChange}
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
  );
}
