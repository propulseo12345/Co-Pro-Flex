/**
 * Hook pour la gestion des templates de PV
 *
 * Fournit:
 * - Liste des templates pour l'organisation
 * - CRUD des templates
 * - Export/Import
 * - Preview
 */

import { useState, useEffect, useCallback } from 'react';
import type {
    IPVTemplate,
    IPVTemplateSpec,
    IPVRenderContext,
    IPVExportOptions,
    IPVExportResult,
    IPVSection,
} from '@/types/models/pv-template';
import { pvTemplateService } from '@/lib/services/pv-template.service';
import { pvExportService } from '@/lib/services/pv-export.service';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface UsePVTemplatesOptions {
    organizationId: string;
    userId: string;
}

interface UsePVTemplatesReturn {
    // État
    templates: IPVTemplate[];
    selectedTemplate: IPVTemplate | null;
    isLoading: boolean;
    error: string | null;

    // Actions CRUD
    selectTemplate: (templateId: string | null) => Promise<void>;
    createTemplate: (name: string, description?: string) => Promise<IPVTemplate | null>;
    duplicateTemplate: (templateId: string, newName?: string) => Promise<IPVTemplate | null>;
    updateTemplate: (templateId: string, updates: Partial<Pick<IPVTemplate, 'name' | 'description' | 'status'>>) => Promise<boolean>;
    deleteTemplate: (templateId: string) => Promise<boolean>;
    setAsDefault: (templateId: string) => Promise<boolean>;

    // Actions sur les sections
    updateSection: (templateId: string, sectionId: string, updates: Partial<IPVSection>) => Promise<boolean>;
    toggleSection: (templateId: string, sectionId: string, enabled: boolean) => Promise<boolean>;
    reorderSections: (templateId: string, sectionIds: string[]) => Promise<boolean>;

    // Actions sur la spec
    updateTemplateSpec: (templateId: string, specUpdates: Partial<IPVTemplateSpec>) => Promise<boolean>;

    // Export/Import
    exportTemplate: (templateId: string) => string | null;
    importTemplate: (jsonString: string) => Promise<IPVTemplate | null>;

    // Preview & Export PV
    generatePreview: (templateId: string, context?: IPVRenderContext) => Promise<{ success: boolean; html: string; errors: string[] }>;
    exportPV: (templateId: string, context: IPVRenderContext, options: IPVExportOptions) => Promise<IPVExportResult>;
    downloadExport: (result: IPVExportResult) => void;

    // Utilitaires
    refreshTemplates: () => Promise<void>;
    getMockContext: () => IPVRenderContext;
    validateTemplate: (templateId: string) => Promise<{ valid: boolean; errors: string[]; warnings: string[] }>;
}

// ═══════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════

export function usePVTemplates({ organizationId, userId }: UsePVTemplatesOptions): UsePVTemplatesReturn {
    const [templates, setTemplates] = useState<IPVTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<IPVTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ───────────────────────────────────────────────────────────
    // CHARGEMENT
    // ───────────────────────────────────────────────────────────

    const loadTemplates = useCallback(async () => {
        // Copro pas encore résolue (mount async) : ne pas requêter avec un uuid
        // vide (22P02 garanti) — l'effet se re-déclenche quand l'id arrive.
        if (!organizationId) {
            setTemplates([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const loadedTemplates = await pvTemplateService.listTemplates(organizationId);
            setTemplates(loadedTemplates);

            // Recharger le template sélectionné s'il existe encore
            if (selectedTemplate) {
                const updated = loadedTemplates.find(t => t.id === selectedTemplate.id);
                setSelectedTemplate(updated || null);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur lors du chargement des templates');
        } finally {
            setIsLoading(false);
        }
    }, [organizationId, selectedTemplate?.id]);

    useEffect(() => {
        loadTemplates();
    }, [organizationId]);

    // ───────────────────────────────────────────────────────────
    // SÉLECTION
    // ───────────────────────────────────────────────────────────

    const selectTemplate = useCallback(async (templateId: string | null) => {
        if (!templateId) {
            setSelectedTemplate(null);
            return;
        }

        const template = await pvTemplateService.getTemplate(templateId);
        setSelectedTemplate(template);
    }, []);

    // ───────────────────────────────────────────────────────────
    // CRUD
    // ───────────────────────────────────────────────────────────

    const createTemplate = useCallback(
        async (name: string, description?: string): Promise<IPVTemplate | null> => {
            if (!organizationId || !userId) {
                setError('Aucune copropriété active ou session expirée — création impossible.');
                return null;
            }
            try {
                const template = await pvTemplateService.createTemplate(
                    organizationId,
                    name,
                    description || '',
                    userId
                );
                if (!template) {
                    setError('La création du template a échoué (voir console).');
                    return null;
                }
                await loadTemplates();
                setSelectedTemplate(template);
                return template;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la création');
                return null;
            }
        },
        [organizationId, userId, loadTemplates]
    );

    const duplicateTemplate = useCallback(
        async (templateId: string, newName?: string): Promise<IPVTemplate | null> => {
            if (!organizationId || !userId) {
                setError('Aucune copropriété active — duplication impossible.');
                return null;
            }
            try {
                const source = await pvTemplateService.getTemplate(templateId);
                if (!source) return null;
                const copy = await pvTemplateService.createTemplate(
                    organizationId,
                    newName || `${source.name} (copie)`,
                    source.description || '',
                    userId,
                    source.spec
                );
                if (copy) await loadTemplates();
                return copy;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la duplication');
                return null;
            }
        },
        [organizationId, userId, loadTemplates]
    );

    const updateTemplate = useCallback(
        async (templateId: string, updates: Partial<Pick<IPVTemplate, 'name' | 'description' | 'status'>>): Promise<boolean> => {
            try {
                const updated = await pvTemplateService.updateTemplate(templateId, updates, userId);
                if (updated) {
                    await loadTemplates();
                    return true;
                }
                return false;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
                return false;
            }
        },
        [userId, loadTemplates]
    );

    const deleteTemplate = useCallback(
        async (templateId: string): Promise<boolean> => {
            try {
                const success = await pvTemplateService.deleteTemplate(templateId);
                if (success) {
                    if (selectedTemplate?.id === templateId) {
                        setSelectedTemplate(null);
                    }
                    await loadTemplates();
                }
                return success;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
                return false;
            }
        },
        [selectedTemplate, loadTemplates]
    );

    const setAsDefault = useCallback(
        async (templateId: string): Promise<boolean> => {
            try {
                // RPC transactionnelle (0052) : dé-flague l'ancien défaut puis pose
                // le nouveau — deux UPDATE client ne seraient pas atomiques (23505
                // sur l'index unique partiel uq_pv_templates_default).
                const ok = await pvTemplateService.setDefaultTemplate(templateId);
                if (ok) await loadTemplates();
                else setError('Impossible de définir ce template par défaut.');
                return ok;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors du changement de défaut');
                return false;
            }
        },
        [loadTemplates]
    );

    // ───────────────────────────────────────────────────────────
    // SPEC (chemin de persistance commun : updateTemplate(spec))
    // ───────────────────────────────────────────────────────────

    const persistSpec = useCallback(
        async (templateId: string, mutate: (spec: IPVTemplateSpec) => IPVTemplateSpec): Promise<boolean> => {
            try {
                const current = await pvTemplateService.getTemplate(templateId);
                if (!current || current.isSystemTemplate) {
                    setError('Le template système ne peut pas être modifié — dupliquez-le.');
                    return false;
                }
                const nextSpec = mutate(current.spec);
                const updated = await pvTemplateService.updateTemplate(templateId, { spec: nextSpec }, userId);
                if (!updated) {
                    setError('La sauvegarde du template a échoué.');
                    return false;
                }
                setSelectedTemplate(updated);
                setTemplates((prev) => prev.map((t) => (t.id === templateId ? updated : t)));
                return true;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
                return false;
            }
        },
        [userId]
    );

    const updateTemplateSpec = useCallback(
        (templateId: string, specUpdates: Partial<IPVTemplateSpec>): Promise<boolean> =>
            persistSpec(templateId, (spec) => ({ ...spec, ...specUpdates })),
        [persistSpec]
    );

    // ───────────────────────────────────────────────────────────
    // SECTIONS (stockées dans spec.sections)
    // ───────────────────────────────────────────────────────────

    const updateSection = useCallback(
        (templateId: string, sectionId: string, updates: Partial<IPVSection>): Promise<boolean> =>
            persistSpec(templateId, (spec) => ({
                ...spec,
                sections: spec.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
            })),
        [persistSpec]
    );

    const toggleSection = useCallback(
        (templateId: string, sectionId: string, enabled: boolean): Promise<boolean> =>
            persistSpec(templateId, (spec) => ({
                ...spec,
                sections: spec.sections.map((s) =>
                    s.id === sectionId && !s.required ? { ...s, enabled } : s
                ),
            })),
        [persistSpec]
    );

    const reorderSections = useCallback(
        (templateId: string, sectionIds: string[]): Promise<boolean> =>
            persistSpec(templateId, (spec) => ({
                ...spec,
                sections: spec.sections
                    .map((s) => {
                        const idx = sectionIds.indexOf(s.id);
                        return idx === -1 ? s : { ...s, order: idx };
                    })
                    .sort((a, b) => a.order - b.order),
            })),
        [persistSpec]
    );

    // ───────────────────────────────────────────────────────────
    // EXPORT/IMPORT (JSON de la spec + métadonnées)
    // ───────────────────────────────────────────────────────────

    const exportTemplate = useCallback(
        (templateId: string): string | null => {
            const template = templates.find((t) => t.id === templateId) ?? selectedTemplate;
            if (!template || template.id !== templateId) return null;
            return JSON.stringify(
                { name: template.name, description: template.description, spec: template.spec },
                null,
                2
            );
        },
        [templates, selectedTemplate]
    );

    const importTemplate = useCallback(
        async (jsonString: string): Promise<IPVTemplate | null> => {
            if (!organizationId || !userId) {
                setError('Aucune copropriété active — import impossible.');
                return null;
            }
            try {
                const parsed = JSON.parse(jsonString) as { name?: string; description?: string; spec?: IPVTemplateSpec };
                if (!parsed.name || !parsed.spec || !Array.isArray(parsed.spec.sections)) {
                    setError('JSON invalide : champs name et spec.sections requis.');
                    return null;
                }
                const template = await pvTemplateService.createTemplate(
                    organizationId,
                    parsed.name,
                    parsed.description || '',
                    userId,
                    parsed.spec
                );
                if (template) await loadTemplates();
                return template;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'JSON invalide');
                return null;
            }
        },
        [organizationId, userId, loadTemplates]
    );

    // ───────────────────────────────────────────────────────────
    // PREVIEW & EXPORT PV
    // ───────────────────────────────────────────────────────────

    const generatePreview = useCallback(
        async (templateId: string, context?: IPVRenderContext): Promise<{ success: boolean; html: string; errors: string[] }> => {
            if (context) {
                return await pvExportService.generatePreview(templateId, context);
            }
            return await pvExportService.generatePreviewWithMockData(templateId);
        },
        []
    );

    const exportPV = useCallback(
        async (
            templateId: string,
            context: IPVRenderContext,
            options: IPVExportOptions
        ): Promise<IPVExportResult> => {
            return pvExportService.export(templateId, context, options);
        },
        []
    );

    const downloadExport = useCallback((result: IPVExportResult): void => {
        pvExportService.download(result);
    }, []);

    // ───────────────────────────────────────────────────────────
    // UTILITAIRES
    // ───────────────────────────────────────────────────────────

    const refreshTemplates = useCallback(async () => {
        await loadTemplates();
    }, [loadTemplates]);

    const getMockContext = useCallback((): IPVRenderContext => {
        return pvExportService.getMockContext();
    }, []);

    const validateTemplate = useCallback(
        async (templateId: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> => {
            return await pvTemplateService.validateTemplate(templateId);
        },
        []
    );

    // ───────────────────────────────────────────────────────────
    // RETURN
    // ───────────────────────────────────────────────────────────

    return {
        // État
        templates,
        selectedTemplate,
        isLoading,
        error,

        // Actions CRUD
        selectTemplate,
        createTemplate,
        duplicateTemplate,
        updateTemplate,
        deleteTemplate,
        setAsDefault,

        // Actions sur les sections
        updateSection,
        toggleSection,
        reorderSections,

        // Actions sur la spec
        updateTemplateSpec,

        // Export/Import
        exportTemplate,
        importTemplate,

        // Preview & Export PV
        generatePreview,
        exportPV,
        downloadExport,

        // Utilitaires
        refreshTemplates,
        getMockContext,
        validateTemplate,
    };
}

export default usePVTemplates;
