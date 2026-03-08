'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO, format } from 'date-fns';
import { AGFormat } from '@/types';
import { useAgDraftAutoCreate, useAgDraftEdit } from '@/hooks/modules/useAgDraftEdit';
import { useAGDelais } from '@/hooks/modules/useAGDelais';
import { DELAIS_LEGAUX } from '@/lib/constants/ag-delais-legaux';
import { genererResolutionsAGOrdinaire } from '@/lib/utils/ag-resolutions';
import { saveDraft } from '@/lib/ag/draft-persistence';
import { validateVisioUrl, sanitizeUrl } from '@/lib/utils/url-validation';
import { detectVisioProvider, requiresVisioUrl, isVisioUrlMandatory } from '@/types';
import { ensureRemoteMeeting } from '@/lib/services/remote-meeting.service';
import { useCopro } from '@/providers/CoproContext';
import { useGoogleMapsAutocomplete } from './useGoogleMapsAutocomplete';
import { useBudgetPostes } from './useBudgetPostes';
import { useBudgetImport } from './useBudgetImport';
import { useAccountsAndKeys } from './useAccountsAndKeys';
import type { AdresseAG, BudgetPoste, AGFormData } from '../domain/types';

export function useAgNewPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();

  // Auto-creation/resume draft via Supabase
  const { draftId, isLoading: isDraftLoading, error: draftError } = useAgDraftAutoCreate();

  // Draft editing with Supabase persistence
  const {
    formData,
    isLoading: isFormLoading,
    isSaving,
    error: formError,
    updateField,
    updateAdresse,
    setAdresseFromAutocomplete,
    flush,
  } = useAgDraftEdit(draftId);

  // Local state for validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showCalendrierJalons, setShowCalendrierJalons] = useState(false);

  // Legal deadlines calculation
  const {
    jalons,
    alertes,
    validationDateAG,
    datesMinimales,
  } = useAGDelais({
    dateAG: formData.date ? parseISO(formData.date) : null,
    statut: 'brouillon',
  });

  // Budget total calculation
  const budgetTotal = useMemo(
    () => formData.budgetPostes.reduce((sum, poste) => sum + poste.montant, 0),
    [formData.budgetPostes]
  );

  // Update budget amount when posts change
  useEffect(() => {
    if (formData.budget) {
      updateField('budgetMontant', budgetTotal.toString());
    }
  }, [formData.budgetPostes, formData.budget, budgetTotal, updateField]);

  // Google Maps Autocomplete
  const {
    searchValue,
    suggestions,
    isSearching,
    setSearchValue,
    selectSuggestion,
    isGoogleMapsLoaded,
    googleMapsStatus,
  } = useGoogleMapsAutocomplete({
    onPlaceSelect: setAdresseFromAutocomplete,
  });

  // Budget import from Supabase
  const {
    importBudget,
    isLoading: isBudgetImporting,
    error: budgetImportError,
    availableYears,
  } = useBudgetImport();

  // Accounts and repartition keys
  const { repartitionKeys } = useAccountsAndKeys();

  // Budget posts manager with Supabase import
  const budgetPostesManager = useBudgetPostes({
    budgetPostes: formData.budgetPostes,
    onPostesChange: (postes: BudgetPoste[]) => updateField('budgetPostes', postes),
    importBudgetFn: importBudget,
    exercice: parseInt(formData.budgetExercice) || new Date().getFullYear(),
  });

  // Handler for updating repartition key on a budget poste
  const handleUpdatePosteKey = useCallback((posteId: string, keyId: string, keyName: string) => {
    const updated = formData.budgetPostes.map(p =>
      p.id === posteId ? { ...p, repartitionKeyId: keyId || undefined, repartitionKeyName: keyName || undefined } : p
    );
    updateField('budgetPostes', updated);
  }, [formData.budgetPostes, updateField]);

  // Handler for generic field change
  const handleChange = useCallback(<K extends keyof AGFormData>(field: K, value: AGFormData[K]) => {
    updateField(field, value);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [updateField, errors]);

  // Handler for visio URL change
  const handleVisioUrlChange = useCallback((url: string) => {
    const sanitized = sanitizeUrl(url);
    const provider = detectVisioProvider(sanitized);
    updateField('visioUrl', sanitized);
    updateField('visioProvider', provider);
    if (errors.visioUrl) {
      setErrors((prev) => ({ ...prev, visioUrl: '' }));
    }
  }, [updateField, errors]);

  // Handler for address change
  const handleAdresseChange = useCallback((field: keyof AdresseAG, value: string) => {
    updateAdresse(field, value);
    if (errors[`adresse.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`adresse.${field}`];
        return newErrors;
      });
    }
  }, [updateAdresse, errors]);

  // Form validation
  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) {
      newErrors.date = 'La date est obligatoire';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'La date doit être dans le futur';
      } else if (formData.type !== 'URGENTE' && validationDateAG && !validationDateAG.valide) {
        newErrors.date = `La date de l'AG doit être au minimum dans ${DELAIS_LEGAUX.convocation_min} jours pour respecter les délais de convocation légaux. Date minimum recommandée : ${format(datesMinimales.minimum, 'dd/MM/yyyy')}`;
      }
    }

    if (!formData.heure) {
      newErrors.heure = "L'heure est obligatoire";
    }

    if (!formData.adresse.rue.trim()) {
      newErrors['adresse.rue'] = "La rue est obligatoire pour le lieu de l'AG";
    }
    if (!formData.adresse.codePostal.trim()) {
      newErrors['adresse.codePostal'] = 'Le code postal est obligatoire';
    } else if (!/^\d{5}$/.test(formData.adresse.codePostal.trim())) {
      newErrors['adresse.codePostal'] = 'Le code postal doit contenir 5 chiffres';
    }
    if (!formData.adresse.ville.trim()) {
      newErrors['adresse.ville'] = 'La ville est obligatoire';
    }

    if (requiresVisioUrl(formData.format) && formData.visioUrl.trim()) {
      const visioValidation = validateVisioUrl(formData.visioUrl);
      if (!visioValidation.isValid) {
        newErrors.visioUrl = visioValidation.error || "Le lien n'est pas valide";
      }
    } else if (isVisioUrlMandatory(formData.format) && !formData.visioUrl.trim()) {
      newErrors.visioUrl = 'Le lien de visioconférence est obligatoire';
    }

    if (formData.budget && formData.budgetPostes.length === 0) {
      newErrors.budgetMontant = 'Au moins un poste de dépense est requis';
    }

    setErrors(newErrors);
    setShowValidationErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  }, [formData, validationDateAG, datesMinimales]);

  // Form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !draftId || !currentCoproId) {
      return;
    }

    try {
      // Auto-generate remote meeting link if MIXTE format and user hasn't provided one
      if (formData.format === AGFormat.MIXTE && !formData.visioUrl.trim()) {
        const meetingDatetime = formData.date && formData.heure
          ? `${formData.date}T${formData.heure}:00`
          : new Date().toISOString();

        const meeting = await ensureRemoteMeeting({
          coproId: currentCoproId,
          agId: draftId,
          title: formData.type === 'ORDINAIRE' ? 'AG Ordinaire' : 'AG Extraordinaire',
          startsAt: meetingDatetime,
        });

        console.log(`[NewAGPage] Remote meeting link generated: ${meeting.url} (${meeting.provider})`);
      }

      // Add standard resolutions for ordinary AG
      if (formData.type === 'ORDINAIRE') {
        const resolutions = genererResolutionsAGOrdinaire();
        if (resolutions && resolutions.length > 0) {
          // Save resolutions in Supabase via saveDraft
          await saveDraft(draftId, 'resolutions', resolutions);
          // Mark that resolutions have been created
          await saveDraft(draftId, 'milestones', { resolutionsCreated: true });
          console.log(`[NewAGPage] ${resolutions.length} resolutions saved for AG ${draftId}`);
        }
      }

      // Flush pending debounced saves before navigating
      await flush();

      // Redirect to next step (agenda)
      router.push(`/ag/${draftId}/agenda`);
    } catch (err) {
      console.error('[NewAGPage] Error:', err);
      setErrors({ form: "Une erreur est survenue lors de la création de l'AG. Veuillez réessayer." });
    }
  }, [formData.type, formData.format, formData.visioUrl, formData.date, formData.heure, validate, router, draftId, currentCoproId, flush]);

  // Navigate back
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Toggle calendar milestones
  const toggleCalendrierJalons = useCallback(() => {
    setShowCalendrierJalons((prev) => !prev);
  }, []);

  // Derived state
  const isLoading = isDraftLoading || isFormLoading;
  const error = draftError || formError;
  const showCalendrier = !!(formData.date && validationDateAG && validationDateAG.valide && jalons.length > 0);

  return {
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
    availableBudgetYears: availableYears,
    repartitionKeys,
    handleUpdatePosteKey,

    // Google Maps
    addressSearchValue: searchValue,
    addressSuggestions: suggestions,
    isAddressSearching: isSearching,
    setAddressSearchValue: setSearchValue,
    selectAddressSuggestion: selectSuggestion,
    isGoogleMapsLoaded,
    googleMapsStatus,

    // Handlers
    handleChange,
    handleVisioUrlChange,
    handleAdresseChange,
    handleSubmit,
    handleBack,
  };
}
