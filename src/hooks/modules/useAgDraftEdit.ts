'use client';

/**
 * Hook pour éditer un brouillon d'AG avec persistance Supabase
 * Source de vérité : Supabase uniquement - AUCUN localStorage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCopro } from '@/providers/CoproContext';
import { AGFormat } from '@/types';
import type { AgMeeting, AgMeetingType } from '@/lib/ag/types';
import type { AGFormData, AdresseAG, BudgetPoste } from '@/features/ag/new/domain/types';

// Helper: Create untyped client for tables/views not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createUntypedClient = () => createClient() as any;

/**
 * Metadata stockée dans opening_notes pour les champs non présents dans le schema
 */
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

/**
 * Constantes de mapping type AG
 */
const TYPE_MAPPING_TO_DB: Record<AGFormData['type'], AgMeetingType> = {
  'ORDINAIRE': 'ordinary',
  'EXTRAORDINAIRE': 'extraordinary',
  'URGENTE': 'mixed', // On map URGENTE sur mixed car pas de type urgente dans le schema
};

const TYPE_MAPPING_FROM_DB: Record<AgMeetingType, AGFormData['type']> = {
  'ordinary': 'ORDINAIRE',
  'extraordinary': 'EXTRAORDINAIRE',
  'mixed': 'URGENTE',
};

/**
 * Valeurs initiales du formulaire
 */
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

interface UseAgDraftEditReturn {
  formData: AGFormData;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  draftId: string | null;
  // Méthodes de modification
  updateField: <K extends keyof AGFormData>(field: K, value: AGFormData[K]) => void;
  updateAdresse: (field: keyof AdresseAG, value: string) => void;
  setAdresseFromAutocomplete: (adresse: AdresseAG, nomLieu?: string) => void;
  // Sauvegarde manuelle (optionnel, auto-save activé par défaut)
  save: () => Promise<boolean>;
}

/**
 * Sérialise les métadonnées pour stockage
 */
function serializeMetadata(formData: AGFormData): string {
  const metadata: DraftMetadata = {
    format: formData.format,
    heure: formData.heure,
    adresse: formData.adresse,
    visioUrl: formData.visioUrl,
    visioProvider: formData.visioProvider,
    budget: formData.budget,
    budgetMontant: formData.budgetMontant,
    budgetExercice: formData.budgetExercice,
    budgetPostes: formData.budgetPostes,
  };
  return JSON.stringify(metadata);
}

/**
 * Désérialise les métadonnées depuis le stockage
 */
function deserializeMetadata(raw: string | null): DraftMetadata {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as DraftMetadata;
  } catch {
    return {};
  }
}

/**
 * Formate l'adresse complète à partir des composants
 */
function formatAdresseComplete(adresse: AdresseAG): string {
  const parts = [];
  if (adresse.nomLieu) parts.push(adresse.nomLieu);
  if (adresse.rue) parts.push(adresse.rue);
  if (adresse.codePostal || adresse.ville) {
    parts.push(`${adresse.codePostal} ${adresse.ville}`.trim());
  }
  return parts.join(', ');
}

/**
 * Extrait la date (sans heure) d'un datetime ISO
 */
function extractDateFromISO(isoString: string | null): string {
  if (!isoString) return '';
  try {
    return isoString.split('T')[0];
  } catch {
    return '';
  }
}

/**
 * Combine date et heure en datetime ISO
 */
function combineDateAndTime(date: string, heure: string): string {
  if (!date) return '';
  if (!heure) return `${date}T00:00:00`;
  return `${date}T${heure}:00`;
}

export function useAgDraftEdit(draftId: string | null): UseAgDraftEditReturn {
  const { currentCoproId } = useCopro();
  const [formData, setFormData] = useState<AGFormData>(INITIAL_FORM_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce timer pour auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);

  /**
   * Charge les données du brouillon depuis Supabase
   */
  const loadDraft = useCallback(async () => {
    if (!draftId || !currentCoproId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      const { data: meeting, error: meetingError } = await supabase
        .from('ag_meetings')
        .select('*')
        .eq('id', draftId)
        .eq('copro_id', currentCoproId)
        .single();

      if (meetingError) {
        if (meetingError.code === 'PGRST116') {
          setError('Brouillon non trouvé');
        } else {
          throw new Error(meetingError.message);
        }
        return;
      }

      const m = meeting as AgMeeting;
      const metadata = deserializeMetadata(m.opening_notes);

      // Reconstituer les données du formulaire
      const loadedData: AGFormData = {
        type: TYPE_MAPPING_FROM_DB[m.meeting_type] || 'ORDINAIRE',
        format: metadata.format || AGFormat.PRESENTIEL,
        date: extractDateFromISO(m.meeting_date),
        heure: metadata.heure || '',
        lieu: m.location || '',
        adresse: metadata.adresse || {
          nomLieu: '',
          rue: '',
          codePostal: '',
          ville: '',
        },
        adresseComplete: m.location || '',
        visioUrl: metadata.visioUrl || '',
        visioProvider: metadata.visioProvider,
        budget: metadata.budget || false,
        budgetMontant: metadata.budgetMontant || '',
        budgetExercice: metadata.budgetExercice || (new Date().getFullYear() + 1 + ''),
        budgetPostes: metadata.budgetPostes || [],
      };

      setFormData(loadedData);
      isInitialLoadRef.current = true;
    } catch (err) {
      console.error('[useAgDraftEdit] Error loading draft:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [draftId, currentCoproId]);

  /**
   * Sauvegarde les données vers Supabase
   */
  const save = useCallback(async (): Promise<boolean> => {
    if (!draftId || !currentCoproId) return false;

    setIsSaving(true);
    setError(null);

    try {
      const supabase = createUntypedClient();

      const updates = {
        meeting_type: TYPE_MAPPING_TO_DB[formData.type],
        meeting_date: combineDateAndTime(formData.date, formData.heure) || null,
        location: formData.adresseComplete || formData.lieu || null,
        opening_notes: serializeMetadata(formData),
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('ag_meetings')
        .update(updates)
        .eq('id', draftId)
        .eq('copro_id', currentCoproId);

      if (updateError) throw new Error(updateError.message);

      return true;
    } catch (err) {
      console.error('[useAgDraftEdit] Error saving draft:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [draftId, currentCoproId, formData]);

  /**
   * Auto-save avec debounce (500ms)
   */
  const triggerAutoSave = useCallback(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 500);
  }, [save]);

  /**
   * Met à jour un champ du formulaire
   */
  const updateField = useCallback(<K extends keyof AGFormData>(
    field: K,
    value: AGFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  /**
   * Met à jour un champ de l'adresse
   */
  const updateAdresse = useCallback((field: keyof AdresseAG, value: string) => {
    setFormData((prev) => {
      const newAdresse = { ...prev.adresse, [field]: value };
      return {
        ...prev,
        adresse: newAdresse,
        adresseComplete: formatAdresseComplete(newAdresse),
      };
    });
  }, []);

  /**
   * Définit l'adresse depuis l'autocomplete Google
   */
  const setAdresseFromAutocomplete = useCallback((adresse: AdresseAG, nomLieu?: string) => {
    setFormData((prev) => ({
      ...prev,
      lieu: nomLieu || prev.lieu,
      adresse,
      adresseComplete: formatAdresseComplete(adresse),
    }));
  }, []);

  // Charger les données au montage
  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Auto-save quand formData change
  useEffect(() => {
    triggerAutoSave();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, triggerAutoSave]);

  return {
    formData,
    isLoading,
    isSaving,
    error,
    draftId,
    updateField,
    updateAdresse,
    setAdresseFromAutocomplete,
    save,
  };
}

/**
 * Hook pour la création/reprise automatique d'un brouillon d'AG
 * À utiliser sur /ag/new pour la logique de reprise
 */
export function useAgDraftAutoCreate() {
  const { currentCoproId } = useCopro();
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCoproId) {
      setIsLoading(false);
      return;
    }

    const initializeDraft = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createUntypedClient();

        // 1. Chercher un brouillon existant
        const { data: existingDrafts, error: searchError } = await supabase
          .from('ag_meetings')
          .select('id, updated_at')
          .eq('copro_id', currentCoproId)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (searchError) throw new Error(searchError.message);

        if (existingDrafts && existingDrafts.length > 0) {
          // Reprendre le brouillon existant
          setDraftId(existingDrafts[0].id);
        } else {
          // Créer un nouveau brouillon
          const newDraft = {
            copro_id: currentCoproId,
            title: `AG ${new Date().toLocaleDateString('fr-FR')}`,
            meeting_type: 'ordinary',
            status: 'draft',
          };

          const { data: created, error: createError } = await supabase
            .from('ag_meetings')
            .insert(newDraft)
            .select('id')
            .single();

          if (createError) throw new Error(createError.message);

          setDraftId(created.id);
        }
      } catch (err) {
        console.error('[useAgDraftAutoCreate] Error:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'initialisation');
      } finally {
        setIsLoading(false);
      }
    };

    initializeDraft();
  }, [currentCoproId]);

  return {
    draftId,
    isLoading,
    error,
  };
}
