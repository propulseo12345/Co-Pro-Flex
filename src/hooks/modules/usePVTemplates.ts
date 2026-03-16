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
            try {
                const template = await pvTemplateService.createTemplate(
                    organizationId,
                    name,
                    description || '',
                    userId
                );
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (templateId: string, newName?: string): Promise<IPVTemplate | null> => {
            // TODO: Implement duplicateTemplate in PVTemplateService
            // TODO: Implement duplicateTemplate in PVTemplateService
            return null;
        },
        []
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (templateId: string): Promise<boolean> => {
            // TODO: Implement setAsDefault in PVTemplateService
            // TODO: Implement setAsDefault in PVTemplateService
            return false;
        },
        []
    );

    // ───────────────────────────────────────────────────────────
    // SECTIONS
    // ───────────────────────────────────────────────────────────

    const updateSection = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (templateId: string, sectionId: string, updates: Partial<IPVSection>): Promise<boolean> => {
            // TODO: Implement updateSection in PVTemplateService
            // TODO: Implement updateSection in PVTemplateService
            return false;
        },
        []
    );

    const toggleSection = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (templateId: string, sectionId: string, enabled: boolean): Promise<boolean> => {
            // TODO: Implement toggleSection in PVTemplateService
            // TODO: Implement toggleSection in PVTemplateService
            return false;
        },
        []
    );

    const reorderSections = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (templateId: string, sectionIds: string[]): Promise<boolean> => {
            // TODO: Implement reorderSections in PVTemplateService
            // TODO: Implement reorderSections in PVTemplateService
            return false;
        },
        []
    );

    // ───────────────────────────────────────────────────────────
    // SPEC
    // ───────────────────────────────────────────────────────────

    const updateTemplateSpec = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (templateId: string, specUpdates: Partial<IPVTemplateSpec>): Promise<boolean> => {
            // TODO: Implement updateTemplateSpec in PVTemplateService
            // TODO: Implement updateTemplateSpec in PVTemplateService
            return false;
        },
        []
    );

    // ───────────────────────────────────────────────────────────
    // EXPORT/IMPORT
    // ───────────────────────────────────────────────────────────

    const exportTemplate = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        (templateId: string): string | null => {
            // TODO: Implement exportTemplate in PVTemplateService
            // TODO: Implement exportTemplate in PVTemplateService
            return null;
        },
        []
    );

    const importTemplate = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async (jsonString: string): Promise<IPVTemplate | null> => {
            // TODO: Implement importTemplate in PVTemplateService
            // TODO: Implement importTemplate in PVTemplateService
            return null;
        },
        []
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
