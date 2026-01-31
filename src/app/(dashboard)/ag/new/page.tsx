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
import { useGoogleMapsAutocomplete, useBudgetPostes, useBudgetImport } from '../../../../features/ag/new/hooks';
import { useAgDraftAutoCreate, useAgDraftEdit } from '@/hooks/modules/useAgDraftEdit';
import { useAGDelais } from '@/hooks/modules/useAGDelais';
import { DELAIS_LEGAUX } from '@/lib/constants/ag-delais-legaux';
import { genererResolutionsAGOrdinaire } from '@/lib/utils/ag-resolutions';
import { saveDraft } from '@/lib/ag/draft-persistence';
import { validateVisioUrl, sanitizeUrl } from '@/lib/utils/url-validation';
import { detectVisioProvider, requiresVisioUrl, isVisioUrlMandatory } from '@/types';
import { ensureRemoteMeeting } from '@/lib/services/remote-meeting.service';
import { useCopro } from '@/providers/CoproContext';
import { useRouter } from 'next/navigation';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import styles from './new-ag.module.css';

export default function NewAGPage() {
  const router = useRouter();
  const { currentCoproId } = useCopro();

  // Auto-création/reprise de brouillon via Supabase
  const { draftId, isLoading: isDraftLoading, error: draftError } = useAgDraftAutoCreate();

  // Édition du brouillon avec persistance Supabase
  const {
    formData,
    isLoading: isFormLoading,
    isSaving,
    error: formError,
    updateField,
    updateAdresse,
    setAdresseFromAutocomplete,
  } = useAgDraftEdit(draftId);

  // État local pour les erreurs de validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showCalendrierJalons, setShowCalendrierJalons] = useState(false);

  // Calcul des délais légaux
  const {
    jalons,
    alertes,
    validationDateAG,
    datesMinimales,
  } = useAGDelais({
    dateAG: formData.date ? parseISO(formData.date) : null,
    statut: 'brouillon',
  });

  // Calcul du total budget
  const budgetTotal = useMemo(
    () => formData.budgetPostes.reduce((sum, poste) => sum + poste.montant, 0),
    [formData.budgetPostes]
  );

  // Mise à jour du montant budget quand les postes changent
  useEffect(() => {
    if (formData.budget) {
      updateField('budgetMontant', budgetTotal.toString());
    }
  }, [formData.budgetPostes, formData.budget, budgetTotal, updateField]);

  // Google Maps Autocomplete
  const { autocompleteRef, isGoogleMapsLoaded } = useGoogleMapsAutocomplete({
    onPlaceSelect: setAdresseFromAutocomplete,
    formatAdresseComplete: (adresse) => {
      const parts = [];
      if (adresse.nomLieu) parts.push(adresse.nomLieu);
      if (adresse.rue) parts.push(adresse.rue);
      if (adresse.codePostal || adresse.ville) {
        parts.push(`${adresse.codePostal} ${adresse.ville}`.trim());
      }
      return parts.join(', ');
    },
  });

  // Budget import depuis Supabase
  const { importBudget, isLoading: isBudgetImporting, error: budgetImportError } = useBudgetImport();

  // Budget postes manager avec import Supabase
  const budgetPostesManager = useBudgetPostes({
    budgetPostes: formData.budgetPostes,
    onPostesChange: (postes) => updateField('budgetPostes', postes),
    importBudgetFn: importBudget,
    exercice: parseInt(formData.budgetExercice) || new Date().getFullYear(),
  });

  // Handler pour le changement de champ générique
  const handleChange = useCallback((field: keyof typeof formData, value: unknown) => {
    updateField(field, value as typeof formData[typeof field]);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  }, [updateField, errors]);

  // Handler pour le changement d'URL visio
  const handleVisioUrlChange = useCallback((url: string) => {
    const sanitized = sanitizeUrl(url);
    const provider = detectVisioProvider(sanitized);
    updateField('visioUrl', sanitized);
    updateField('visioProvider', provider);
    if (errors.visioUrl) {
      setErrors((prev) => ({ ...prev, visioUrl: '' }));
    }
  }, [updateField, errors]);

  // Handler pour le changement d'adresse
  const handleAdresseChange = useCallback((field: keyof typeof formData.adresse, value: string) => {
    updateAdresse(field, value);
    if (errors[`adresse.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`adresse.${field}`];
        return newErrors;
      });
    }
  }, [updateAdresse, errors]);

  // Validation du formulaire
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

  // Soumission du formulaire
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !draftId || !currentCoproId) {
      return;
    }

    try {
      // Génération automatique du lien de réunion à distance si format MIXTE
      // et si l'utilisateur n'a pas fourni son propre lien
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

        console.log(`[NewAGPage] Lien de réunion généré: ${meeting.url} (${meeting.provider})`);
      }

      // Ajouter les résolutions standard pour AG ordinaire
      if (formData.type === 'ORDINAIRE') {
        const resolutions = genererResolutionsAGOrdinaire();
        if (resolutions && resolutions.length > 0) {
          // Sauvegarder les résolutions dans Supabase via saveDraft
          await saveDraft(draftId, 'resolutions', resolutions);
          // Marquer que les résolutions ont été créées
          await saveDraft(draftId, 'milestones', { resolutionsCreated: true });
          console.log(`[NewAGPage] ${resolutions.length} résolutions sauvegardées pour AG ${draftId}`);
        }
      }

      // Rediriger vers l'étape suivante (agenda)
      router.push(`/ag/${draftId}/agenda`);
    } catch (err) {
      console.error('[NewAGPage] Erreur:', err);
      setErrors({ form: "Une erreur est survenue lors de la création de l'AG. Veuillez réessayer." });
    }
  }, [formData.type, formData.format, formData.visioUrl, formData.date, formData.heure, validate, router, draftId, currentCoproId]);

  // Retour en arrière
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Affichage du chargement
  if (isDraftLoading || isFormLoading) {
    return (
      <div className="container">
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p>Chargement du brouillon...</p>
        </div>
      </div>
    );
  }

  // Affichage des erreurs critiques
  if (draftError || formError) {
    return (
      <div className="container">
        <div className={styles.errorContainer}>
          <p className={styles.errorText}>
            {draftError || formError}
          </p>
          <button
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header onBack={handleBack} />

      <Stepper currentStep={1} />

      {/* Indicateur de sauvegarde automatique */}
      {isSaving && (
        <div className={styles.savingIndicator}>
          <span className={styles.savingDot} />
          Sauvegarde en cours...
        </div>
      )}

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
            isImporting={budgetPostesManager.isImporting || isBudgetImporting}
            importError={budgetPostesManager.importError || budgetImportError}
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
