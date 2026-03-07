'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { isValid, parseISO, format, startOfDay } from 'date-fns';
import type { AGFormData, AdresseAG, BudgetPoste } from '../types';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';
import { createClient } from '@/lib/supabase/client';
import { AGFormat } from '@/types';
import type { AgMeeting, AgMeetingType } from '@/lib/ag/types';
import { POSTES_DEPENSES, BUDGET_PRECEDENT, POSTE_ACCOUNT_MAPPING } from '@/features/ag/new/domain/constants';
import { useAccountsAndKeys } from '@/features/ag/new/hooks/useAccountsAndKeys';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

interface GooglePlaceResult {
  address_components?: Array<{
    long_name: string;
    short_name?: string;
    types: string[];
  }>;
  name?: string;
}

interface GoogleAutocomplete {
  addListener: (event: string, callback: () => void) => void;
  getPlace: () => GooglePlaceResult;
}

// Mapping des types AG depuis la DB
const TYPE_MAPPING_FROM_DB: Record<AgMeetingType, 'ORDINAIRE' | 'EXTRAORDINAIRE'> = {
  'ordinary': 'ORDINAIRE',
  'extraordinary': 'EXTRAORDINAIRE',
  'special': 'EXTRAORDINAIRE',
};

const TYPE_MAPPING_TO_DB: Record<string, AgMeetingType> = {
  'ORDINAIRE': 'ordinary',
  'EXTRAORDINAIRE': 'extraordinary',
};

// Interface pour les métadonnées stockées dans opening_notes
interface DraftMetadata {
  format?: AGFormat;
  heure?: string;
  adresse?: AdresseAG;
  visioUrl?: string;
  visioProvider?: string;
  budget?: boolean;
  budgetMontant?: string;
  budgetExercice?: string;
  budgetPostes?: BudgetPoste[];
}

function deserializeMetadata(raw: string | null): DraftMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DraftMetadata;
  } catch {
    return {};
  }
}

function serializeMetadata(formData: AGFormData): string {
  const metadata: DraftMetadata = {
    heure: formData.heure,
    adresse: formData.adresse,
    budget: formData.budget,
    budgetMontant: formData.budgetMontant,
    budgetExercice: formData.budgetExercice,
    budgetPostes: formData.budgetPostes,
  };
  return JSON.stringify(metadata);
}

function extractDateFromISO(isoString: string | null): string {
  if (!isoString) return '';
  try {
    // Supabase peut retourner "2026-04-18 19:43:00+00" (avec espace) ou "2026-04-18T19:43:00" (avec T)
    // On gère les deux formats
    const dateOnly = isoString.split('T')[0].split(' ')[0];
    return dateOnly;
  } catch {
    return '';
  }
}

function combineDateAndTime(date: string, heure: string): string {
  if (!date) return '';
  if (!heure) return `${date}T00:00:00`;
  return `${date}T${heure}:00`;
}

interface UseAgEditPageParams {
  agId: string;
}

export function useAgEditPage({ agId }: UseAgEditPageParams) {
  const router = useRouter();
  const { accounts, repartitionKeys, findAccountByCode, findKeyByName } = useAccountsAndKeys();

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

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Vérifier si c'est une AG Supabase (UUID)
      if (isValidUUID(agId)) {
        try {
          const supabase = createUntypedClient();
          const { data: meeting, error } = await supabase
            .from('ag_meetings')
            .select('*')
            .eq('id', agId)
            .single();

          if (!error && meeting) {
            const m = meeting as AgMeeting;
            const metadata = deserializeMetadata(m.opening_notes);

            // Essayer aussi de charger depuis ag_session_drafts
            let sessionMetadata: DraftMetadata = metadata;
            try {
              const { data: sessionData } = await loadDraft<DraftMetadata>(agId, 'session', `ag-session-${agId}`);
              if (sessionData) {
                sessionMetadata = { ...metadata, ...sessionData };
              }
            } catch {
              // Ignore, use metadata from opening_notes
            }

            const loadedData: AGFormData = {
              type: TYPE_MAPPING_FROM_DB[m.meeting_type] || 'ORDINAIRE',
              date: extractDateFromISO(m.meeting_date),
              heure: sessionMetadata.heure || '',
              lieu: m.location || '',
              adresse: sessionMetadata.adresse || { nomLieu: '', rue: '', codePostal: '', ville: '' },
              adresseComplete: m.location || '',
              budget: sessionMetadata.budget || false,
              budgetMontant: sessionMetadata.budgetMontant || '',
              budgetExercice: sessionMetadata.budgetExercice || (new Date().getFullYear() + 1 + ''),
              budgetPostes: sessionMetadata.budgetPostes || [],
            };

            setFormData(loadedData);
          }
        } catch (err) {
          console.error('[useAgEditPage] Error loading from Supabase:', err);
        }
      } else {
        // Fallback pour les anciennes AG (localStorage)
        const { data: savedData } = await loadDraft<AGFormData>(agId, 'session', `ag-draft-${agId}`);
        if (savedData) {
          setFormData(savedData);
        }
      }

      setIsLoading(false);
    };
    loadData();
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

  const resolveAccountData = useCallback((posteName: string) => {
    const mapping = POSTE_ACCOUNT_MAPPING[posteName];
    if (!mapping) return null;
    const account = findAccountByCode(mapping.accountCode);
    const key = findKeyByName(mapping.repartitionKeyName);
    return {
      accountId: account?.id,
      accountCode: mapping.accountCode,
      accountName: mapping.accountName,
      repartitionKeyId: key?.id,
      repartitionKeyName: mapping.repartitionKeyName,
    };
  }, [findAccountByCode, findKeyByName]);

  const handleAddPoste = useCallback(() => {
    if (!newPoste.poste.trim() || !newPoste.montant) return;
    const montant = parseFloat(newPoste.montant);
    if (isNaN(montant) || montant <= 0) return;

    const accountData = resolveAccountData(newPoste.poste.trim());

    const nouveauPoste: BudgetPoste = {
      id: Date.now().toString(),
      poste: newPoste.poste.trim(),
      montant,
      ...(accountData || {}),
    };
    handleChange('budgetPostes', [...formData.budgetPostes, nouveauPoste]);
    setNewPoste({ poste: '', montant: '' });
    setShowCustomPoste(false);
  }, [newPoste, formData.budgetPostes, handleChange, resolveAccountData]);

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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (!apiKey) {
      setIsGoogleMapsLoaded(false);
      return;
    }

    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      setIsGoogleMapsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=fr`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isGoogleMapsLoaded || !autocompleteRef.current || typeof window === 'undefined') return;
    const googleMaps = window.google?.maps;
    if (!googleMaps?.places || !googleMaps.event) return;
    const googleMapsEvent = googleMaps.event;

    const autocomplete = new googleMaps.places.Autocomplete(autocompleteRef.current, {
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
      if (autocompleteInstance.current) {
        googleMapsEvent.clearInstanceListeners(autocompleteInstance.current);
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      // Sauvegarder vers Supabase si c'est une AG UUID
      if (isValidUUID(agId)) {
        const supabase = createUntypedClient();

        const meetingDate = combineDateAndTime(formData.date, formData.heure);

        const updates: Record<string, unknown> = {
          meeting_type: TYPE_MAPPING_TO_DB[formData.type] || 'ordinary',
          location: formData.adresseComplete || formData.lieu || null,
          opening_notes: serializeMetadata(formData),
          updated_at: new Date().toISOString(),
          // Met à jour current_step vers étape 2 (agenda) après validation étape 1
          current_step: 2,
        };

        // Mettre à jour meeting_date seulement si valide
        if (meetingDate && formData.date) {
          updates.meeting_date = meetingDate;
        }

        const { error } = await supabase
          .from('ag_meetings')
          .update(updates)
          .eq('id', agId);

        if (error) throw new Error(error.message);

        // Sauvegarder aussi dans ag_session_drafts pour backup
        await saveDraft(agId, 'session', formData, `ag-session-${agId}`);
      } else {
        // Fallback localStorage
        await saveDraft(agId, 'session', formData, `ag-draft-${agId}`);
      }

      router.push(`/ag/${agId}/agenda`);
    } catch (err) {
      console.error('[useAgEditPage] Error saving:', err);
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
    isLoading,
    accounts,
    repartitionKeys,
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
