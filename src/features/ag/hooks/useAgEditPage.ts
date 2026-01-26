'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isValid, parseISO, format, startOfDay } from 'date-fns';
import type { AGFormData, AdresseAG, BudgetPoste } from '../types';

interface GooglePlaceResult {
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  name?: string;
}

interface GoogleAutocomplete {
  addListener: (event: string, callback: () => void) => void;
  getPlace: () => GooglePlaceResult;
}

const BUDGET_PRECEDENT = {
  exercice: new Date().getFullYear(),
  postes: [
    { id: 'prev-1', poste: 'Eau', montant: 2500 },
    { id: 'prev-2', poste: 'Assurance', montant: 4200 },
    { id: 'prev-3', poste: 'Électricité', montant: 1800 },
    { id: 'prev-4', poste: 'Entretien', montant: 3500 },
    { id: 'prev-5', poste: 'Nettoyage', montant: 2800 },
    { id: 'prev-6', poste: 'Ascenseur', montant: 2200 },
    { id: 'prev-7', poste: 'Frais de gestion', montant: 5500 },
  ],
  total: 22500
};

const POSTES_DEPENSES = [
  'Eau', 'Assurance', 'Électricité', 'Chauffage', 'Entretien', 'Nettoyage',
  'Gardiennage', 'Ascenseur', 'Éclairage', 'Télésurveillance', 'Travaux',
  'Maintenance', 'Fournitures', 'Frais de gestion', 'Honoraires', 'Autre'
];

interface UseAgEditPageParams {
  agId: string;
}

export function useAgEditPage({ agId }: UseAgEditPageParams) {
  const router = useRouter();

  const [formData, setFormData] = useState<AGFormData>({
    type: 'ORDINAIRE',
    date: '',
    heure: '',
    lieu: '',
    adresse: { nomLieu: '', rue: '', codePostal: '', ville: '' },
    adresseComplete: '',
    budget: false,
    budgetMontant: '',
    budgetExercice: new Date().getFullYear() + 1 + '',
    budgetPostes: [],
  });

  const [newPoste, setNewPoste] = useState({ poste: '', montant: '' });
  const [showCustomPoste, setShowCustomPoste] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);
  const [editingPosteId, setEditingPosteId] = useState<string | null>(null);
  const [editingPosteData, setEditingPosteData] = useState<{ poste: string; montant: string }>({ poste: '', montant: '' });
  const [editingError, setEditingError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const autocompleteRef = useRef<HTMLInputElement>(null);
  const autocompleteInstance = useRef<GoogleAutocomplete | null>(null);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem(`ag-draft-${agId}`);
    if (savedData) {
      try {
        setFormData(JSON.parse(savedData) as AGFormData);
      } catch { /* ignore */ }
    }
  }, [agId]);

  const handleChange = useCallback((field: keyof AGFormData, value: string | boolean | BudgetPoste[] | AdresseAG) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const formatAdresseComplete = (adresse: AdresseAG): string => {
    const parts = [];
    if (adresse.nomLieu) parts.push(adresse.nomLieu);
    if (adresse.rue) parts.push(adresse.rue);
    if (adresse.codePostal || adresse.ville) {
      parts.push(`${adresse.codePostal} ${adresse.ville}`.trim());
    }
    return parts.join(', ');
  };

  const handleAdresseChange = useCallback((field: keyof AdresseAG, value: string) => {
    const newAdresse = { ...formData.adresse, [field]: value };
    setFormData(prev => ({
      ...prev,
      adresse: newAdresse,
      adresseComplete: formatAdresseComplete(newAdresse)
    }));
    if (errors[`adresse.${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`adresse.${field}`];
        return newErrors;
      });
    }
  }, [formData.adresse, errors]);

  const handleImportBudgetPrecedent = useCallback(() => {
    const postesAvecNouveauxIds = BUDGET_PRECEDENT.postes.map(p => ({
      ...p,
      id: `${p.id}-${Date.now()}`
    }));
    handleChange('budgetPostes', postesAvecNouveauxIds);
  }, [handleChange]);

  const budgetTotal = useMemo(() =>
    formData.budgetPostes.reduce((sum, poste) => sum + poste.montant, 0)
  , [formData.budgetPostes]);

  useEffect(() => {
    if (formData.budget) {
      setFormData(prev => ({ ...prev, budgetMontant: budgetTotal.toString() }));
    }
  }, [formData.budgetPostes, formData.budget, budgetTotal]);

  const handlePosteSelect = useCallback((value: string) => {
    if (value === 'Autre') {
      setShowCustomPoste(true);
      setNewPoste(prev => ({ ...prev, poste: '' }));
    } else {
      setShowCustomPoste(false);
      setNewPoste(prev => ({ ...prev, poste: value }));
    }
  }, []);

  const handleAddPoste = useCallback(() => {
    if (!newPoste.poste.trim() || !newPoste.montant) return;
    const montant = parseFloat(newPoste.montant);
    if (isNaN(montant) || montant <= 0) return;

    const nouveauPoste: BudgetPoste = {
      id: Date.now().toString(),
      poste: newPoste.poste.trim(),
      montant
    };
    handleChange('budgetPostes', [...formData.budgetPostes, nouveauPoste]);
    setNewPoste({ poste: '', montant: '' });
    setShowCustomPoste(false);
  }, [newPoste, formData.budgetPostes, handleChange]);

  const handleRemovePoste = useCallback((id: string) => {
    handleChange('budgetPostes', formData.budgetPostes.filter(p => p.id !== id));
  }, [formData.budgetPostes, handleChange]);

  const handleEditPoste = useCallback((poste: BudgetPoste) => {
    setEditingPosteId(poste.id);
    setEditingPosteData({ poste: poste.poste, montant: poste.montant.toString() });
    setEditingError(null);
  }, []);

  const handleSavePoste = useCallback(() => {
    if (!editingPosteId) return;
    if (!editingPosteData.poste.trim()) {
      setEditingError('Le libellé ne peut pas être vide');
      return;
    }
    const montant = parseFloat(editingPosteData.montant);
    if (isNaN(montant) || montant <= 0) {
      setEditingError('Le montant doit être un nombre positif');
      return;
    }
    const updatedPostes = formData.budgetPostes.map(p =>
      p.id === editingPosteId ? { ...p, poste: editingPosteData.poste.trim(), montant } : p
    );
    handleChange('budgetPostes', updatedPostes);
    setEditingPosteId(null);
    setEditingPosteData({ poste: '', montant: '' });
    setEditingError(null);
  }, [editingPosteId, editingPosteData, formData.budgetPostes, handleChange]);

  const handleCancelEdit = useCallback(() => {
    setEditingPosteId(null);
    setEditingPosteData({ poste: '', montant: '' });
    setEditingError(null);
  }, []);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSavePoste(); }
    else if (e.key === 'Escape') { e.preventDefault(); handleCancelEdit(); }
  }, [handleSavePoste, handleCancelEdit]);

  // Google Maps autocomplete
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      setIsGoogleMapsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded || !autocompleteRef.current || typeof window === 'undefined' || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'fr' },
      fields: ['formatted_address', 'address_components', 'geometry', 'name']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.address_components) {
        let rue = '', numero = '', codePostal = '', ville = '';
        const nomLieu = place.name || '';

        for (const component of place.address_components) {
          const types = component.types;
          if (types.includes('street_number')) numero = component.long_name;
          else if (types.includes('route')) rue = component.long_name;
          else if (types.includes('postal_code')) codePostal = component.long_name;
          else if (types.includes('locality')) ville = component.long_name;
        }

        const nouvelleAdresse: AdresseAG = {
          nomLieu,
          rue: numero ? `${numero} ${rue}` : rue,
          codePostal,
          ville
        };

        setFormData(prev => ({
          ...prev,
          lieu: nomLieu || prev.lieu,
          adresse: nouvelleAdresse,
          adresseComplete: formatAdresseComplete(nouvelleAdresse)
        }));
      }
    });

    autocompleteInstance.current = autocomplete;

    return () => {
      if (autocompleteInstance.current && window.google) {
        window.google.maps.event.clearInstanceListeners(autocompleteInstance.current);
      }
    };
  }, [isGoogleMapsLoaded]);

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
      }
    }

    if (!formData.heure) newErrors.heure = 'L\'heure est obligatoire';
    if (!formData.adresse.rue.trim()) newErrors['adresse.rue'] = 'La rue est obligatoire';
    if (!formData.adresse.codePostal.trim()) {
      newErrors['adresse.codePostal'] = 'Le code postal est obligatoire';
    } else if (!/^\d{5}$/.test(formData.adresse.codePostal.trim())) {
      newErrors['adresse.codePostal'] = 'Le code postal doit contenir 5 chiffres';
    }
    if (!formData.adresse.ville.trim()) newErrors['adresse.ville'] = 'La ville est obligatoire';
    if (formData.budget && formData.budgetPostes.length === 0) {
      newErrors.budgetMontant = 'Au moins un poste de dépense est requis';
    }

    setErrors(newErrors);
    setShowValidationErrors(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      localStorage.setItem(`ag-draft-${agId}`, JSON.stringify(formData));
      router.push(`/ag/${agId}/agenda`);
    } catch (error) {
      setErrors({ form: 'Une erreur est survenue lors de la modification de l\'AG. Veuillez réessayer.' });
    }
  }, [validate, agId, formData, router]);

  const handleDateChange = useCallback((date: Date | null) => {
    if (date && isValid(date)) {
      handleChange('date', format(date, 'yyyy-MM-dd'));
    } else {
      handleChange('date', '');
    }
  }, [handleChange]);

  const goBack = useCallback(() => router.back(), [router]);

  return {
    formData,
    errors,
    showValidationErrors,
    newPoste,
    showCustomPoste,
    editingPosteId,
    editingPosteData,
    editingError,
    isGoogleMapsLoaded,
    autocompleteRef,
    budgetTotal,
    POSTES_DEPENSES,
    BUDGET_PRECEDENT,
    handleChange,
    handleAdresseChange,
    handleImportBudgetPrecedent,
    handlePosteSelect,
    handleAddPoste,
    handleRemovePoste,
    handleEditPoste,
    handleSavePoste,
    handleCancelEdit,
    handleEditKeyDown,
    handleDateChange,
    handleSubmit,
    goBack,
    setNewPoste,
    setEditingPosteData,
    startOfDay,
    parseISO,
  };
}
