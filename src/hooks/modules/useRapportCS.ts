'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { rapportCSService } from '@/lib/services/rapport-cs.service';
import {
  RapportActiviteCS,
  SectionRapportCS,
  CreateSectionData,
  CreateAnnexeData,
  TypeAnnexeRapport,
} from '@/types/models/conseil-syndical';

interface UseRapportCSOptions {
  rapportId?: string;
  coproprieteId?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

interface UseRapportCSReturn {
  // État
  rapport: RapportActiviteCS | null;
  isLoading: boolean;
  isSaving: boolean;
  error: Error | null;
  hasUnsavedChanges: boolean;

  // Actions contenu
  updateTitre: (titre: string) => void;
  updateIntroduction: (introduction: string) => void;
  updateContenu: (contenu: string) => void;

  // Actions sections
  addSection: (section: Omit<SectionRapportCS, 'id'>) => Promise<void>;
  updateSection: (sectionId: string, updates: Partial<SectionRapportCS>) => Promise<void>;
  deleteSection: (sectionId: string) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;

  // Actions annexes
  addAnnexe: (annexe: { nom: string; type: TypeAnnexeRapport; fichier?: File }) => Promise<void>;
  deleteAnnexe: (annexeId: string) => Promise<void>;

  // Workflow
  soumettrePourRevision: () => Promise<void>;
  /** userId = profiles.id (utilisateur de session), PAS un council_members.id */
  valider: (userId: string) => Promise<void>;
  publier: (agId: string) => Promise<void>;

  // Sauvegarde
  save: () => Promise<void>;

  // Génération
  genererTexteResolution: () => string;

  // Rechargement
  reload: () => Promise<void>;
}

export function useRapportCS({
  rapportId,
  autoSave = true,
  autoSaveDelay = 3000,
}: UseRapportCSOptions): UseRapportCSReturn {
  const [rapport, setRapport] = useState<RapportActiviteCS | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Persistance débouncée des sections : updates accumulés par section (sinon
  // 1 UPDATE HTTP par frappe + courses de réponses qui écrasent la saisie)
  const sectionSaveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const sectionPendingUpdates = useRef<Map<string, Partial<SectionRapportCS>>>(new Map());

  // Charger le rapport
  const loadRapport = useCallback(async () => {
    if (!rapportId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await rapportCSService.getRapport(rapportId);
      setRapport(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [rapportId]);

  useEffect(() => {
    loadRapport();
  }, [loadRapport]);

  // Auto-save avec debounce
  useEffect(() => {
    if (!autoSave || !hasUnsavedChanges || !rapport) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      // l'erreur est déjà capturée via setError dans save() — sans ce catch,
      // chaque échec d'autosave serait une unhandled promise rejection
      save().catch(() => {});
    }, autoSaveDelay);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, autoSave, autoSaveDelay, rapport]);

  // ========================================
  // ACTIONS CONTENU
  // ========================================

  const updateTitre = useCallback((titre: string) => {
    setRapport(prev => prev ? { ...prev, titre } : null);
    setHasUnsavedChanges(true);
  }, []);

  const updateIntroduction = useCallback((introduction: string) => {
    setRapport(prev => prev ? { ...prev, introduction } : null);
    setHasUnsavedChanges(true);
  }, []);

  const updateContenu = useCallback((contenu: string) => {
    setRapport(prev => prev ? { ...prev, contenu } : null);
    setHasUnsavedChanges(true);
  }, []);

  // ========================================
  // ACTIONS SECTIONS
  // ========================================

  const addSection = useCallback(async (section: Omit<SectionRapportCS, 'id'>) => {
    if (!rapport) return;

    try {
      const sectionData: CreateSectionData = {
        titre: section.titre,
        contenu: section.contenu,
        ordre: section.ordre,
      };
      const newSection = await rapportCSService.ajouterSection(rapport.id, sectionData);
      setRapport(prev => prev ? {
        ...prev,
        sections: [...prev.sections, newSection],
      } : null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [rapport]);

  const updateSection = useCallback(async (
    sectionId: string,
    updates: Partial<SectionRapportCS>
  ) => {
    // 1. Optimiste : l'input contrôlé reflète la frappe immédiatement (le
    //    round-trip par frappe faisait « sauter » le texte sur réponse périmée)
    setRapport(prev => prev ? {
      ...prev,
      sections: prev.sections.map(s => s.id === sectionId ? { ...s, ...updates } : s),
    } : null);

    // 2. Persistance débouncée, updates ACCUMULÉS (titre puis contenu tapés
    //    coup sur coup ne doivent pas s'écraser mutuellement)
    const pending = sectionPendingUpdates.current;
    pending.set(sectionId, { ...(pending.get(sectionId) ?? {}), ...updates });

    const timers = sectionSaveTimers.current;
    const existing = timers.get(sectionId);
    if (existing) clearTimeout(existing);
    timers.set(sectionId, setTimeout(() => {
      timers.delete(sectionId);
      const toPersist = pending.get(sectionId);
      pending.delete(sectionId);
      if (!toPersist) return;
      rapportCSService.mettreAJourSection(sectionId, toPersist).catch((err) => {
        setError(err as Error);
      });
    }, 800));
  }, []);

  const deleteSection = useCallback(async (sectionId: string) => {
    try {
      await rapportCSService.supprimerSection(sectionId);
      setRapport(prev => prev ? {
        ...prev,
        sections: prev.sections.filter(s => s.id !== sectionId),
      } : null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  const reorderSections = useCallback(async (sectionIds: string[]) => {
    if (!rapport) return;

    // Mise à jour optimiste
    const reorderedSections = sectionIds.map((id, index) => {
      const section = rapport.sections.find(s => s.id === id);
      return section ? { ...section, ordre: index } : null;
    }).filter((s): s is SectionRapportCS => s !== null);

    setRapport(prev => prev ? { ...prev, sections: reorderedSections } : null);

    // Sauvegarder les ordres
    try {
      for (let i = 0; i < sectionIds.length; i++) {
        await rapportCSService.mettreAJourSection(sectionIds[i], { ordre: i });
      }
    } catch (err) {
      setError(err as Error);
      // Recharger en cas d'erreur
      await loadRapport();
    }
  }, [rapport, loadRapport]);

  // ========================================
  // ACTIONS ANNEXES
  // ========================================

  const addAnnexe = useCallback(async (annexe: {
    nom: string;
    type: TypeAnnexeRapport;
    fichier?: File;
  }) => {
    if (!rapport) return;

    try {
      // TODO: Upload fichier si présent vers Supabase Storage
      let fichierUrl: string | undefined;
      let fichierNom: string | undefined;
      let fichierTaille: number | undefined;

      if (annexe.fichier) {
        // Placeholder pour l'upload
        // fichierUrl = await uploadFile(annexe.fichier);
        fichierNom = annexe.fichier.name;
        fichierTaille = annexe.fichier.size;
      }

      const annexeData: CreateAnnexeData = {
        nom: annexe.nom,
        type: annexe.type,
        fichierUrl,
        fichierNom,
        fichierTaille,
      };

      const newAnnexe = await rapportCSService.ajouterAnnexe(rapport.id, annexeData);

      setRapport(prev => prev ? {
        ...prev,
        annexes: [...prev.annexes, newAnnexe],
      } : null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [rapport]);

  const deleteAnnexe = useCallback(async (annexeId: string) => {
    try {
      await rapportCSService.supprimerAnnexe(annexeId);
      setRapport(prev => prev ? {
        ...prev,
        annexes: prev.annexes.filter(a => a.id !== annexeId),
      } : null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, []);

  // ========================================
  // WORKFLOW
  // ========================================

  const soumettrePourRevision = useCallback(async () => {
    if (!rapport) return;

    setIsSaving(true);
    try {
      // D'abord sauvegarder les modifications
      if (hasUnsavedChanges) {
        await rapportCSService.mettreAJourContenu(rapport.id, {
          titre: rapport.titre,
          introduction: rapport.introduction,
          contenu: rapport.contenu,
        });
      }

      const updated = await rapportCSService.soumettreRevision(rapport.id);
      setRapport(updated);
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [rapport, hasUnsavedChanges]);

  const valider = useCallback(async (userId: string) => {
    if (!rapport) return;

    setIsSaving(true);
    try {
      const updated = await rapportCSService.validerRapport(rapport.id, userId);
      setRapport(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [rapport]);

  const publier = useCallback(async (agId: string) => {
    if (!rapport) return;

    setIsSaving(true);
    try {
      const updated = await rapportCSService.publierRapport(rapport.id, agId);
      setRapport(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [rapport]);

  // ========================================
  // SAUVEGARDE
  // ========================================

  const save = useCallback(async () => {
    if (!rapport || !hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      await rapportCSService.mettreAJourContenu(rapport.id, {
        titre: rapport.titre,
        introduction: rapport.introduction,
        contenu: rapport.contenu,
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [rapport, hasUnsavedChanges]);

  // ========================================
  // GÉNÉRATION
  // ========================================

  const genererTexteResolution = useCallback((): string => {
    if (!rapport) return '';
    return rapportCSService.genererTexteResolution(rapport);
  }, [rapport]);

  // ========================================
  // RECHARGEMENT
  // ========================================

  const reload = useCallback(async () => {
    await loadRapport();
  }, [loadRapport]);

  return {
    rapport,
    isLoading,
    isSaving,
    error,
    hasUnsavedChanges,
    updateTitre,
    updateIntroduction,
    updateContenu,
    addSection,
    updateSection,
    deleteSection,
    reorderSections,
    addAnnexe,
    deleteAnnexe,
    soumettrePourRevision,
    valider,
    publier,
    save,
    genererTexteResolution,
    reload,
  };
}
