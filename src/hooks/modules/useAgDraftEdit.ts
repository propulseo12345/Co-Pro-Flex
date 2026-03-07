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
  'URGENTE': 'special', // On map URGENTE sur special car pas de type urgente dans le schema
};

const TYPE_MAPPING_FROM_DB: Record<AgMeetingType, AGFormData['type']> = {
  'ordinary': 'ORDINAIRE',
  'extraordinary': 'EXTRAORDINAIRE',
  'special': 'URGENTE',
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
  // Sauvegarde manuelle
  save: () => Promise<boolean>;
  // Flush avant navigation — garantit la persistance
  flush: () => Promise<boolean>;
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
    // Supabase peut retourner "2026-04-18 19:43:00+00" (avec espace) ou "2026-04-18T19:43:00" (avec T)
    // On gère les deux formats
    const dateOnly = isoString.split('T')[0].split(' ')[0];
    return dateOnly;
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

  // Persistance immédiate — dedup via lastSavedJson
  const isInitialLoadRef = useRef(true);
  const lastSavedJsonRef = useRef<string>('');

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

      // meeting_date est NOT NULL dans la DB, on ne met à jour que si on a une date valide
      const meetingDate = combineDateAndTime(formData.date, formData.heure);

      // Construire l'objet de mise à jour
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {
        meeting_type: TYPE_MAPPING_TO_DB[formData.type],
        location: formData.adresseComplete || formData.lieu || null,
        opening_notes: serializeMetadata(formData),
        updated_at: new Date().toISOString(),
      };

      // Ne mettre à jour meeting_date que si on a une date valide
      // (car c'est NOT NULL dans la base)
      if (meetingDate) {
        updates.meeting_date = meetingDate;
      }

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
   * Flush — force la sauvegarde immédiate (à appeler avant navigation)
   */
  const flush = useCallback(async (): Promise<boolean> => {
    return save();
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

  // Persistance immédiate quand formData change
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      lastSavedJsonRef.current = JSON.stringify(formData);
      return;
    }

    const currentJson = JSON.stringify(formData);
    if (currentJson === lastSavedJsonRef.current) return;
    lastSavedJsonRef.current = currentJson;

    save();
  }, [formData, save]);

  // Sécurité : sauvegarder avant fermeture de la page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentJson = JSON.stringify(formData);
      if (currentJson !== lastSavedJsonRef.current) {
        save();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, save]);

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
    flush,
  };
}

/**
 * Génère une date par défaut pour un nouveau brouillon (dans 30 jours)
 */
function getDefaultMeetingDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30); // 30 jours dans le futur par défaut
  return date.toISOString();
}

/**
 * Hook pour la création d'un NOUVEAU brouillon d'AG
 * À utiliser sur /ag/new - crée TOUJOURS une nouvelle AG
 * Pour reprendre un brouillon existant, utiliser les liens depuis le dashboard
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

    const createNewDraft = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createUntypedClient();

        // Toujours créer un NOUVEAU brouillon (meeting_date est NOT NULL)
        const newDraft = {
          copro_id: currentCoproId,
          title: `AG ${new Date().toLocaleDateString('fr-FR')}`,
          meeting_type: 'ordinary',
          meeting_date: getDefaultMeetingDate(),
          status: 'draft',
        };

        const { data: created, error: createError } = await supabase
          .from('ag_meetings')
          .insert(newDraft)
          .select('id')
          .single();

        if (createError) throw new Error(createError.message);

        const newId = created.id;
        setDraftId(newId);
        console.log('[useAgDraftAutoCreate] Nouvelle AG créée:', newId);
      } catch (err) {
        console.error('[useAgDraftAutoCreate] Error:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      } finally {
        setIsLoading(false);
      }
    };

    createNewDraft();
  }, [currentCoproId]);

  return {
    draftId,
    isLoading,
    error,
  };
}
