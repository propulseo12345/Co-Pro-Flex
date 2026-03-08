'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { AGFormData, AdresseAG, BudgetPoste } from '../domain/types';
import { AGFormat, requiresVisioUrl, isVisioUrlMandatory, detectVisioProvider } from '@/types';
import { validateVisioUrl, sanitizeUrl } from '@/lib/utils/url-validation';
import { useAGDelais } from '@/hooks/modules/useAGDelais';
import { DELAIS_LEGAUX } from '@/lib/constants/ag-delais-legaux';
import { useCreateAg } from '@/hooks/modules/useAgData';
import { createStandardResolutions } from '@/lib/ag/create-standard-resolutions';
import { useCopro } from '@/providers/CoproContext';

const INITIAL_FORM_DATA: AGFormData = {
  type: 'ORDINAIRE',
  format: AGFormat.PRESENTIEL,
  date: '',
  heure: '',
  lieu: '',
  adresse: {
    nomLieu: '',
    rue: '',
    codePostal: '',
    ville: '',
  },
  adresseComplete: '',
  visioUrl: '',
  visioProvider: undefined,
  budget: false,
  budgetMontant: '',
  budgetExercice: new Date().getFullYear() + 1 + '',
  budgetPostes: [],
};

export function useAgCreateForm() {
  const router = useRouter();
  const { currentCoproId } = useCopro();
  const [formData, setFormData] = useState<AGFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showCalendrierJalons, setShowCalendrierJalons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hook pour créer l'AG dans Supabase
  const { execute: createAgInSupabase, isLoading: isCreatingAg, error: createAgError } = useCreateAg();

  const {
    jalons,
    alertes,
    validationDateAG,
    datesMinimales,
  } = useAGDelais({
    dateAG: formData.date ? parseISO(formData.date) : null,
    statut: 'brouillon',
  });

  const budgetTotal = useMemo(
    () => formData.budgetPostes.reduce((sum, poste) => sum + poste.montant, 0),
    [formData.budgetPostes]
  );

  useEffect(() => {
    if (formData.budget) {
      setFormData((prev) => ({ ...prev, budgetMontant: budgetTotal.toString() }));
    }
  }, [formData.budgetPostes, formData.budget, budgetTotal]);

  const formatAdresseComplete = useCallback((adresse: AdresseAG): string => {
    const parts = [];
    if (adresse.nomLieu) parts.push(adresse.nomLieu);
    if (adresse.rue) parts.push(adresse.rue);
    if (adresse.codePostal || adresse.ville) {
      parts.push(`${adresse.codePostal} ${adresse.ville}`.trim());
    }
    return parts.join(', ');
  }, []);

  const handleChange = useCallback(
    (field: keyof AGFormData, value: string | boolean | BudgetPoste[] | AdresseAG | AGFormat) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
    },
    [errors]
  );

  const handleVisioUrlChange = useCallback(
    (url: string) => {
      const sanitized = sanitizeUrl(url);
      const provider = detectVisioProvider(sanitized);
      setFormData((prev) => ({
        ...prev,
        visioUrl: sanitized,
        visioProvider: provider,
      }));
      if (errors.visioUrl) {
        setErrors((prev) => ({ ...prev, visioUrl: '' }));
      }
    },
    [errors]
  );

  const handleAdresseChange = useCallback(
    (field: keyof AdresseAG, value: string) => {
      const newAdresse = { ...formData.adresse, [field]: value };
      setFormData((prev) => ({
        ...prev,
        adresse: newAdresse,
        adresseComplete: formatAdresseComplete(newAdresse),
      }));
      if (errors[`adresse.${field}`]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`adresse.${field}`];
          return newErrors;
        });
      }
    },
    [formData.adresse, errors, formatAdresseComplete]
  );

  const setAdresseFromAutocomplete = useCallback(
    (nouvelleAdresse: AdresseAG, nomLieu?: string) => {
      setFormData((prev) => ({
        ...prev,
        lieu: nomLieu || prev.lieu,
        adresse: nouvelleAdresse,
        adresseComplete: formatAdresseComplete(nouvelleAdresse),
      }));
    },
    [formatAdresseComplete]
  );

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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        // Construire la date complète ISO (date + heure)
        const meetingDateTime = `${formData.date}T${formData.heure}:00`;

        // Construire l'adresse complète pour location
        const locationParts = [];
        if (formData.lieu) locationParts.push(formData.lieu);
        if (formData.adresse.nomLieu && formData.adresse.nomLieu !== formData.lieu) {
          locationParts.push(formData.adresse.nomLieu);
        }
        if (formData.adresse.rue) locationParts.push(formData.adresse.rue);
        if (formData.adresse.codePostal || formData.adresse.ville) {
          locationParts.push(`${formData.adresse.codePostal} ${formData.adresse.ville}`.trim());
        }
        const location = locationParts.join(', ') || 'À définir';

        // Mapper le type vers meeting_type Supabase (AgMeetingType: 'ordinary' | 'extraordinary' | 'special')
        const meetingTypeMap: Record<string, 'ordinary' | 'extraordinary' | 'special'> = {
          'ORDINAIRE': 'ordinary',
          'EXTRAORDINAIRE': 'extraordinary',
          'URGENTE': 'extraordinary', // AG urgente = extraordinaire
          'MIXTE': 'special', // AG mixte = special
        };
        const meetingType = meetingTypeMap[formData.type] || 'ordinary';

        // Générer le titre
        const dateFormatted = format(parseISO(formData.date), 'd MMMM yyyy', { locale: fr });
        const title = formData.type === 'ORDINAIRE'
          ? `Assemblée Générale Ordinaire du ${dateFormatted}`
          : formData.type === 'EXTRAORDINAIRE'
            ? `Assemblée Générale Extraordinaire du ${dateFormatted}`
            : `Assemblée Générale du ${dateFormatted}`;

        if (!currentCoproId) {
          setErrors({ form: 'Aucune copropriété sélectionnée' });
          setIsSubmitting(false);
          return;
        }

        // Créer l'AG dans Supabase via Edge Function (sans résolutions automatiques)
        const result = await createAgInSupabase({
          title,
          meeting_date: meetingDateTime,
          location,
          meeting_type: meetingType,
          include_standard_resolutions: false, // On crée les résolutions manuellement après
        });

        if (!result.success || !result.ag_id) {
          setErrors({
            form: result.error || "Une erreur est survenue lors de la création de l'AG dans la base de données."
          });
          setIsSubmitting(false);
          return;
        }

        const agId = result.ag_id;
        console.log('[useAgCreateForm] AG créée avec succès, UUID:', agId);

        // Créer les résolutions obligatoires avec templates complets et variables
        const typeAG = formData.type === 'ORDINAIRE' ? 'ORDINAIRE' : 'EXTRAORDINAIRE';
        const exerciceYear = parseInt(formData.budgetExercice) || new Date().getFullYear() + 1;

        const resolutionsResult = await createStandardResolutions({
          agId,
          coproId: currentCoproId,
          typeAG,
          exerciceYear,
          budgetPostes: formData.budget && formData.budgetPostes.length > 0
            ? formData.budgetPostes.map(p => ({
                id: p.id,
                poste: p.poste,
                montant: p.montant,
                accountId: p.accountId,
                accountCode: p.accountCode,
                accountName: p.accountName,
                repartitionKeyId: p.repartitionKeyId,
                repartitionKeyName: p.repartitionKeyName,
              }))
            : undefined,
        });

        console.log('[useAgCreateForm] Résolutions créées:', resolutionsResult.resolutionsCreated);

        if (!resolutionsResult.success && resolutionsResult.resolutionsCreated === 0) {
          console.warn('[useAgCreateForm] Aucune résolution créée:', resolutionsResult.results);
        }

        // Naviguer vers la page agenda avec l'UUID Supabase
        router.push(`/ag/${agId}/agenda`);

      } catch (err) {
        console.error('[useAgCreateForm] Erreur:', err);
        setErrors({
          form: err instanceof Error
            ? err.message
            : "Une erreur est survenue lors de la création de l'AG. Veuillez réessayer."
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, router, createAgInSupabase, currentCoproId]
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return {
    formData,
    errors,
    showValidationErrors,
    showCalendrierJalons,
    jalons,
    alertes,
    validationDateAG,
    datesMinimales,
    budgetTotal,
    isSubmitting: isSubmitting || isCreatingAg,
    setFormData,
    setShowCalendrierJalons,
    handleChange,
    handleVisioUrlChange,
    handleAdresseChange,
    setAdresseFromAutocomplete,
    handleSubmit,
    handleBack,
    formatAdresseComplete,
  };
}
