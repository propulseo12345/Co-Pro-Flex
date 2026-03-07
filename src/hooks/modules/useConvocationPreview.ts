/**
 * Hook pour gérer la prévisualisation des convocations
 *
 * Gère:
 * - Génération PDF en temps réel
 * - Versioning des modifications
 * - États de chargement/erreur
 * - Mode relecture avec checklist
 * - Historique des versions
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  generateConvocationPDF,
  downloadConvocationPDF,
  type ConvocationPDFParams,
  type ConvocationPDFResult,
  type ConvocationAnnexePDF,
} from '@/lib/pdf/generateConvocationPDF';
import type { AnnexeAccountingData } from '@/lib/pdf/annexe-pdf-tables';
import type { AGData, Resolution } from '@/hooks/modules/useConvocationData';
import { logger } from '@/lib/utils/logger';
import { withTimeoutSafe, DEFAULT_TIMEOUTS } from '@/lib/utils/timeout';
import { loadDraft, saveDraft, isValidUUID } from '@/lib/ag/draft-persistence';

// Types pour le versioning
export interface ConvocationVersion {
  version: number;
  generatedAt: string;
  snapshot: {
    agData: AGData;
    resolutions: Resolution[];
    annexes: string[];
  };
  pdfUrl: string;
  changesFromPrevious?: string[];
}

// Types pour la checklist de relecture
export interface ReviewChecklistItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  required: boolean;
}

export interface ReviewValidation {
  reluPar?: string;
  reluLe?: string;
  version: number;
  checklistCompleted: boolean;
}

// État du preview
export type PreviewStatus = 'idle' | 'generating' | 'ready' | 'error';
export type PreviewMode = 'print' | 'email';

export interface ConvocationPreviewState {
  status: PreviewStatus;
  currentVersion: number;
  pdfUrl: string | null;
  pdfBlob: Blob | null;
  error: string | null;
  versions: ConvocationVersion[];
  previewMode: PreviewMode;
  reviewValidation: ReviewValidation | null;
  checklist: ReviewChecklistItem[];
  isReviewMode: boolean;
  canSend: boolean;
}

interface UseConvocationPreviewOptions {
  agId: string;
  agData: AGData | null;
  resolutions: Resolution[];
  annexes?: string[];
  annexesStructured?: ConvocationAnnexePDF[];
  accountingData?: AnnexeAccountingData | null;
  uploadedDocPages?: import('@/lib/pdf/pdf-document-renderer').RenderedPage[];
  copropriete?: { nom: string; adresse: string };
  syndic?: { nom: string; adresse: string };
  autoGenerate?: boolean;
  debounceMs?: number;
}

interface UseConvocationPreviewReturn extends ConvocationPreviewState {
  generatePreview: () => Promise<void>;
  regeneratePreview: () => Promise<void>;
  downloadPDF: (filename?: string) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  toggleReviewMode: () => void;
  updateChecklistItem: (id: string, checked: boolean) => void;
  validateReview: (reluPar: string) => void;
  resetReview: () => void;
  viewVersion: (version: number) => void;
  getCurrentVersionUrl: () => string | null;
}

// Checklist par défaut
const DEFAULT_CHECKLIST: Omit<ReviewChecklistItem, 'checked'>[] = [
  {
    id: 'ordre_du_jour',
    label: 'Ordre du jour vérifié',
    description: 'Toutes les résolutions sont présentes et dans le bon ordre',
    required: true,
  },
  {
    id: 'variables',
    label: 'Variables complétées',
    description: 'Toutes les variables (montants, dates, noms) sont remplies',
    required: true,
  },
  {
    id: 'mentions_legales',
    label: 'Mentions légales présentes',
    description: 'Les mentions obligatoires (loi 1965, décret 1967) sont incluses',
    required: true,
  },
  {
    id: 'documents_annexes',
    label: 'Documents annexés corrects',
    description: 'Les pièces jointes sont listées et disponibles',
    required: false,
  },
  {
    id: 'format_ag',
    label: 'Format AG cohérent',
    description: 'Le lieu/lien visio correspond au format choisi',
    required: true,
  },
];

/**
 * Génère un hash simple pour détecter les changements
 */
function hashData(data: unknown): string {
  return JSON.stringify(data);
}

/**
 * Hook principal pour la prévisualisation des convocations
 */
export function useConvocationPreview({
  agId,
  agData,
  resolutions,
  annexes = [],
  annexesStructured,
  accountingData,
  uploadedDocPages,
  copropriete = { nom: 'Copropriété', adresse: '' },
  syndic = { nom: 'Le Syndic', adresse: '' },
  autoGenerate = true,
  debounceMs = 500,
}: UseConvocationPreviewOptions): UseConvocationPreviewReturn {
  // État principal
  const [state, setState] = useState<ConvocationPreviewState>({
    status: 'idle',
    currentVersion: 1,
    pdfUrl: null,
    pdfBlob: null,
    error: null,
    versions: [],
    previewMode: 'print',
    reviewValidation: null,
    checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, checked: false })),
    isReviewMode: false,
    canSend: false,
  });

  // Refs pour le debounce et le hash
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHashRef = useRef<string>('');
  const generationCountRef = useRef(0);

  /**
   * Calcule si l'envoi est possible
   */
  const calculateCanSend = useCallback((checklist: ReviewChecklistItem[], reviewValidation: ReviewValidation | null): boolean => {
    const requiredChecked = checklist.filter((item) => item.required).every((item) => item.checked);
    return requiredChecked && reviewValidation !== null && reviewValidation.checklistCompleted;
  }, []);

  /**
   * Génère le PDF de prévisualisation
   */
  const generatePreview = useCallback(async (): Promise<void> => {
    if (!agData) {
      logger.debug('Pas de données AG pour générer le preview', { agId, step: 'convocation', action: 'generatePreview' });
      return;
    }

    const currentHash = hashData({ agData, resolutions, annexes, annexesStructured, accountingData, uploadedDocPagesCount: uploadedDocPages?.length ?? 0 });

    // Si rien n'a changé, ne pas régénérer
    if (currentHash === lastHashRef.current && state.pdfUrl) {
      logger.debug('Données identiques, pas de régénération', { agId, step: 'convocation', action: 'generatePreview' });
      return;
    }

    setState((prev) => ({ ...prev, status: 'generating', error: null }));

    generationCountRef.current += 1;
    const currentGeneration = generationCountRef.current;

    try {
      // Utiliser timeout pour la génération
      const generatePromise = new Promise<ConvocationPDFResult>((resolve, reject) => {
        try {
          const result = generateConvocationPDF({
            agData,
            resolutions,
            copropriete,
            syndic,
            annexes,
            annexesStructured,
            accountingData,
            uploadedDocPages,
            version: state.currentVersion,
          });
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      const result = await withTimeoutSafe(generatePromise, DEFAULT_TIMEOUTS.GENERATE_PDF, 'ERR-PDF-TIMEOUT');

      // Vérifier que cette génération est toujours la plus récente
      if (currentGeneration !== generationCountRef.current) {
        logger.debug('Génération obsolète ignorée', { agId, step: 'convocation', action: 'generatePreview' });
        return;
      }

      if (!result.success) {
        throw result.error;
      }

      // Nettoyer l'ancien URL
      if (state.pdfUrl) {
        URL.revokeObjectURL(state.pdfUrl);
      }

      // Détecter si c'est une nouvelle version (changements significatifs)
      const isNewVersion = lastHashRef.current !== '' && currentHash !== lastHashRef.current;
      const newVersion = isNewVersion ? state.currentVersion + 1 : state.currentVersion;

      // Créer l'entrée de version
      const versionEntry: ConvocationVersion = {
        version: newVersion,
        generatedAt: result.data.generatedAt,
        snapshot: { agData, resolutions, annexes },
        pdfUrl: result.data.url,
      };

      lastHashRef.current = currentHash;

      setState((prev) => {
        const newVersions = isNewVersion
          ? [...prev.versions, versionEntry]
          : prev.versions.length === 0
            ? [versionEntry]
            : [...prev.versions.slice(0, -1), versionEntry];

        // Invalider la validation si nouvelle version
        const newReviewValidation = isNewVersion ? null : prev.reviewValidation;
        const newChecklist = isNewVersion
          ? prev.checklist.map((item) => ({ ...item, checked: false }))
          : prev.checklist;

        return {
          ...prev,
          status: 'ready',
          currentVersion: newVersion,
          pdfUrl: result.data.url,
          pdfBlob: result.data.blob,
          error: null,
          versions: newVersions.slice(-10), // Garder les 10 dernières versions
          reviewValidation: newReviewValidation,
          checklist: newChecklist,
          canSend: calculateCanSend(newChecklist, newReviewValidation),
        };
      });

      logger.info('Preview PDF généré', {
        agId,
        step: 'convocation',
        action: 'generatePreview',
        component: 'useConvocationPreview',
      });
    } catch (error) {
      if (currentGeneration !== generationCountRef.current) return;

      const errorMessage = error instanceof Error ? error.message : 'Erreur de génération PDF';
      logger.error('Erreur génération preview', {
        agId,
        step: 'convocation',
        action: 'generatePreview',
        errorCode: 'ERR-PDF-GEN',
      }, error instanceof Error ? error : undefined);

      setState((prev) => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }));
    }
  }, [agData, resolutions, annexes, annexesStructured, accountingData, uploadedDocPages, copropriete, syndic, agId, state.currentVersion, state.pdfUrl, calculateCanSend]);

  /**
   * Force la régénération (bouton retry)
   */
  const regeneratePreview = useCallback(async (): Promise<void> => {
    lastHashRef.current = ''; // Forcer la régénération
    await generatePreview();
  }, [generatePreview]);

  /**
   * Télécharge le PDF
   */
  const downloadPDF = useCallback((filename?: string): void => {
    if (!agData) return;

    try {
      downloadConvocationPDF(
        {
          agData,
          resolutions,
          copropriete,
          syndic,
          annexes,
          annexesStructured,
          accountingData,
          uploadedDocPages,
          version: state.currentVersion,
        },
        filename
      );

      logger.info('PDF téléchargé', { agId, step: 'convocation', action: 'downloadPDF' });
    } catch (error) {
      logger.error('Erreur téléchargement PDF', {
        agId,
        step: 'convocation',
        action: 'downloadPDF',
        errorCode: 'ERR-PDF-DOWNLOAD',
      });
    }
  }, [agData, resolutions, copropriete, syndic, annexes, annexesStructured, accountingData, uploadedDocPages, state.currentVersion, agId]);

  /**
   * Change le mode de prévisualisation
   */
  const setPreviewMode = useCallback((mode: PreviewMode): void => {
    setState((prev) => ({ ...prev, previewMode: mode }));
  }, []);

  /**
   * Active/désactive le mode relecture
   */
  const toggleReviewMode = useCallback((): void => {
    setState((prev) => ({ ...prev, isReviewMode: !prev.isReviewMode }));
  }, []);

  /**
   * Met à jour un item de la checklist
   */
  const updateChecklistItem = useCallback((id: string, checked: boolean): void => {
    setState((prev) => {
      const newChecklist = prev.checklist.map((item) =>
        item.id === id ? { ...item, checked } : item
      );
      return {
        ...prev,
        checklist: newChecklist,
        canSend: calculateCanSend(newChecklist, prev.reviewValidation),
      };
    });
  }, [calculateCanSend]);

  /**
   * Valide la relecture
   */
  const validateReview = useCallback((reluPar: string): void => {
    const allRequiredChecked = state.checklist.filter((item) => item.required).every((item) => item.checked);

    if (!allRequiredChecked) {
      logger.warn('Tentative de validation avec checklist incomplète', { agId, step: 'convocation', action: 'validateReview' });
      return;
    }

    const validation: ReviewValidation = {
      reluPar,
      reluLe: new Date().toISOString(),
      version: state.currentVersion,
      checklistCompleted: true,
    };

    setState((prev) => ({
      ...prev,
      reviewValidation: validation,
      canSend: calculateCanSend(prev.checklist, validation),
    }));

    // Sauvegarder dans Supabase (ag_session_drafts)
    if (isValidUUID(agId)) {
      saveDraft(agId, 'session', validation, `ag-review-${agId}`).catch(() => {
        // Ignorer les erreurs de sauvegarde
      });
    }

    logger.info('Relecture validée', { agId, step: 'convocation', action: 'validateReview' });
  }, [agId, state.checklist, state.currentVersion, calculateCanSend]);

  /**
   * Réinitialise la validation
   */
  const resetReview = useCallback((): void => {
    setState((prev) => ({
      ...prev,
      reviewValidation: null,
      checklist: prev.checklist.map((item) => ({ ...item, checked: false })),
      canSend: false,
    }));

    // Supprimer de Supabase
    if (isValidUUID(agId)) {
      // Sauvegarder null pour "supprimer" la validation
      saveDraft(agId, 'session', null, `ag-review-${agId}`).catch(() => {
        // Ignorer
      });
    }
  }, [agId]);

  /**
   * Affiche une version spécifique
   */
  const viewVersion = useCallback((version: number): void => {
    const versionData = state.versions.find((v) => v.version === version);
    if (versionData) {
      setState((prev) => ({
        ...prev,
        pdfUrl: versionData.pdfUrl,
      }));
    }
  }, [state.versions]);

  /**
   * Retourne l'URL de la version courante
   */
  const getCurrentVersionUrl = useCallback((): string | null => {
    return state.pdfUrl;
  }, [state.pdfUrl]);

  // Auto-génération avec debounce
  useEffect(() => {
    if (!autoGenerate || !agData) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      generatePreview();
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [agData, resolutions, annexes, annexesStructured, accountingData, uploadedDocPages, autoGenerate, debounceMs, generatePreview]);

  // Charger la validation depuis Supabase au montage
  useEffect(() => {
    if (!isValidUUID(agId)) return;

    const loadReviewValidation = async () => {
      try {
        const { data: validation } = await loadDraft<ReviewValidation>(
          agId,
          'session',
          `ag-review-${agId}`
        );

        if (validation && validation.version === state.currentVersion) {
          setState((prev) => ({
            ...prev,
            reviewValidation: validation,
            canSend: calculateCanSend(prev.checklist, validation),
          }));
        }
      } catch {
        // Ignorer les erreurs de chargement
      }
    };

    loadReviewValidation();
  }, [agId, state.currentVersion, calculateCanSend]);

  // Cleanup des URLs au démontage
  useEffect(() => {
    return () => {
      state.versions.forEach((v) => {
        try {
          URL.revokeObjectURL(v.pdfUrl);
        } catch {
          // Ignorer
        }
      });
    };
  }, []);

  return {
    ...state,
    generatePreview,
    regeneratePreview,
    downloadPDF,
    setPreviewMode,
    toggleReviewMode,
    updateChecklistItem,
    validateReview,
    resetReview,
    viewVersion,
    getCurrentVersionUrl,
  };
}
