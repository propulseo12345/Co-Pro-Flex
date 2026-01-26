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
    selectTemplate: (templateId: string | null) => void;
    createTemplate: (name: string, description?: string) => IPVTemplate | null;
    duplicateTemplate: (templateId: string, newName?: string) => IPVTemplate | null;
    updateTemplate: (templateId: string, updates: Partial<Pick<IPVTemplate, 'name' | 'description' | 'status'>>) => boolean;
    deleteTemplate: (templateId: string) => boolean;
    setAsDefault: (templateId: string) => boolean;

    // Actions sur les sections
    updateSection: (templateId: string, sectionId: string, updates: Partial<IPVSection>) => boolean;
    toggleSection: (templateId: string, sectionId: string, enabled: boolean) => boolean;
    reorderSections: (templateId: string, sectionIds: string[]) => boolean;

    // Actions sur la spec
    updateTemplateSpec: (templateId: string, specUpdates: Partial<IPVTemplateSpec>) => boolean;

    // Export/Import
    exportTemplate: (templateId: string) => string | null;
    importTemplate: (jsonString: string) => IPVTemplate | null;

    // Preview & Export PV
    generatePreview: (templateId: string, context?: IPVRenderContext) => { success: boolean; html: string; errors: string[] };
    exportPV: (templateId: string, context: IPVRenderContext, options: IPVExportOptions) => Promise<IPVExportResult>;
    downloadExport: (result: IPVExportResult) => void;

    // Utilitaires
    refreshTemplates: () => void;
    getMockContext: () => IPVRenderContext;
    validateTemplate: (templateId: string) => { valid: boolean; errors: string[]; warnings: string[] };
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

    const loadTemplates = useCallback(() => {
        setIsLoading(true);
        setError(null);

        try {
            const loadedTemplates = pvTemplateService.listTemplates(organizationId);
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

    const selectTemplate = useCallback((templateId: string | null) => {
        if (!templateId) {
            setSelectedTemplate(null);
            return;
        }

        const template = pvTemplateService.getTemplate(templateId);
        setSelectedTemplate(template);
    }, []);

    // ───────────────────────────────────────────────────────────
    // CRUD
    // ───────────────────────────────────────────────────────────

    const createTemplate = useCallback(
        (name: string, description?: string): IPVTemplate | null => {
            try {
                const template = pvTemplateService.createTemplate(
                    organizationId,
                    name,
                    description || '',
                    userId
                );
                loadTemplates();
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
        (templateId: string, newName?: string): IPVTemplate | null => {
            try {
                const template = pvTemplateService.duplicateTemplate(
                    templateId,
                    organizationId,
                    userId,
                    newName
                );
                if (template) {
                    loadTemplates();
                    setSelectedTemplate(template);
                }
                return template;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la duplication');
                return null;
            }
        },
        [organizationId, userId, loadTemplates]
    );

    const updateTemplate = useCallback(
        (templateId: string, updates: Partial<Pick<IPVTemplate, 'name' | 'description' | 'status'>>): boolean => {
            try {
                const updated = pvTemplateService.updateTemplate(templateId, updates, userId);
                if (updated) {
                    loadTemplates();
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
        (templateId: string): boolean => {
            try {
                const success = pvTemplateService.deleteTemplate(templateId);
                if (success) {
                    if (selectedTemplate?.id === templateId) {
                        setSelectedTemplate(null);
                    }
                    loadTemplates();
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
        (templateId: string): boolean => {
            try {
                const success = pvTemplateService.setAsDefault(templateId, organizationId);
                if (success) {
                    loadTemplates();
                }
                return success;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la définition par défaut');
                return false;
            }
        },
        [organizationId, loadTemplates]
    );

    // ───────────────────────────────────────────────────────────
    // SECTIONS
    // ───────────────────────────────────────────────────────────

    const updateSection = useCallback(
        (templateId: string, sectionId: string, updates: Partial<IPVSection>): boolean => {
            try {
                const updated = pvTemplateService.updateSection(templateId, sectionId, updates, userId);
                if (updated) {
                    loadTemplates();
                    return true;
                }
                return false;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de section');
                return false;
            }
        },
        [userId, loadTemplates]
    );

    const toggleSection = useCallback(
        (templateId: string, sectionId: string, enabled: boolean): boolean => {
            try {
                const updated = pvTemplateService.toggleSection(templateId, sectionId, enabled, userId);
                if (updated) {
                    loadTemplates();
                    return true;
                }
                return false;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors du toggle de section');
                return false;
            }
        },
        [userId, loadTemplates]
    );

    const reorderSections = useCallback(
        (templateId: string, sectionIds: string[]): boolean => {
            try {
                const updated = pvTemplateService.reorderSections(templateId, sectionIds, userId);
                if (updated) {
                    loadTemplates();
                    return true;
                }
                return false;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors du réordonnancement');
                return false;
            }
        },
        [userId, loadTemplates]
    );

    // ───────────────────────────────────────────────────────────
    // SPEC
    // ───────────────────────────────────────────────────────────

    const updateTemplateSpec = useCallback(
        (templateId: string, specUpdates: Partial<IPVTemplateSpec>): boolean => {
            try {
                const updated = pvTemplateService.updateTemplateSpec(templateId, specUpdates, userId);
                if (updated) {
                    loadTemplates();
                    return true;
                }
                return false;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour de la spec');
                return false;
            }
        },
        [userId, loadTemplates]
    );

    // ───────────────────────────────────────────────────────────
    // EXPORT/IMPORT
    // ───────────────────────────────────────────────────────────

    const exportTemplate = useCallback((templateId: string): string | null => {
        return pvTemplateService.exportTemplate(templateId);
    }, []);

    const importTemplate = useCallback(
        (jsonString: string): IPVTemplate | null => {
            try {
                const template = pvTemplateService.importTemplate(jsonString, organizationId, userId);
                if (template) {
                    loadTemplates();
                    setSelectedTemplate(template);
                }
                return template;
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
                return null;
            }
        },
        [organizationId, userId, loadTemplates]
    );

    // ───────────────────────────────────────────────────────────
    // PREVIEW & EXPORT PV
    // ───────────────────────────────────────────────────────────

    const generatePreview = useCallback(
        (templateId: string, context?: IPVRenderContext): { success: boolean; html: string; errors: string[] } => {
            if (context) {
                return pvExportService.generatePreview(templateId, context);
            }
            return pvExportService.generatePreviewWithMockData(templateId);
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

    const refreshTemplates = useCallback(() => {
        loadTemplates();
    }, [loadTemplates]);

    const getMockContext = useCallback((): IPVRenderContext => {
        return pvExportService.getMockContext();
    }, []);

    const validateTemplate = useCallback(
        (templateId: string): { valid: boolean; errors: string[]; warnings: string[] } => {
            return pvTemplateService.validateTemplate(templateId);
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
