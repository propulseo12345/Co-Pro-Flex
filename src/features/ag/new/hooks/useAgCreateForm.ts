'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseISO, format } from 'date-fns';
import type { AGFormData, AdresseAG, BudgetPoste } from '../domain/types';
import { AGFormat, requiresVisioUrl, isVisioUrlMandatory, detectVisioProvider } from '@/types';
import { validateVisioUrl, sanitizeUrl } from '@/lib/utils/url-validation';
import { useAGDelais } from '@/hooks/modules/useAGDelais';
import { DELAIS_LEGAUX } from '@/lib/constants/ag-delais-legaux';
import { ajouterResolutionsAGOrdinaire } from '@/lib/utils/ag-resolutions';

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
  const [formData, setFormData] = useState<AGFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [showCalendrierJalons, setShowCalendrierJalons] = useState(false);

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
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      const agId = 'ag-' + Date.now();

      try {
        localStorage.setItem('ag-draft-' + agId, JSON.stringify(formData));

        if (formData.type === 'ORDINAIRE') {
          const resolutions = ajouterResolutionsAGOrdinaire(agId);
          if (resolutions) {
            sessionStorage.setItem(`ag-resolutions-created-${agId}`, 'true');
          }
        }

        router.push(`/ag/${agId}/agenda`);
      } catch {
        setErrors({ form: "Une erreur est survenue lors de la création de l'AG. Veuillez réessayer." });
      }
    },
    [formData, validate, router]
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
