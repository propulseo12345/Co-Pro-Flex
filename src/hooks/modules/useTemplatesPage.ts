'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePVTemplates } from '@/hooks/modules/usePVTemplates';
import type { IPVTemplate } from '@/types/models/pv-template';

const MOCK_ORG_ID = 'org-001';
const MOCK_USER_ID = 'user-001';

export function useTemplatesPage() {
  const router = useRouter();

  const {
    templates,
    isLoading,
    error,
    createTemplate,
    duplicateTemplate,
    deleteTemplate,
    setAsDefault,
    exportTemplate,
    importTemplate,
    validateTemplate,
  } = usePVTemplates({
    organizationId: MOCK_ORG_ID,
    userId: MOCK_USER_ID,
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [importJson, setImportJson] = useState('');

  const handleCreate = useCallback(() => {
    if (!newTemplateName.trim()) return;
    const template = createTemplate(newTemplateName.trim(), newTemplateDesc.trim());
    if (template) {
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      router.push(`/settings/templates/${template.id}`);
    }
  }, [newTemplateName, newTemplateDesc, createTemplate, router]);

  const handleDuplicate = useCallback((templateId: string, templateName: string) => {
    const newName = `${templateName} (copie)`;
    const template = duplicateTemplate(templateId, newName);
    if (template) {
      router.push(`/settings/templates/${template.id}`);
    }
    setActiveMenu(null);
  }, [duplicateTemplate, router]);

  const handleDelete = useCallback(() => {
    if (!showDeleteModal) return;
    deleteTemplate(showDeleteModal);
    setShowDeleteModal(null);
  }, [showDeleteModal, deleteTemplate]);

  const handleExport = useCallback((templateId: string) => {
    const json = exportTemplate(templateId);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template-${templateId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setActiveMenu(null);
  }, [exportTemplate]);

  const handleImport = useCallback(() => {
    if (!importJson.trim()) return;
    const template = importTemplate(importJson);
    if (template) {
      setShowImportModal(false);
      setImportJson('');
      router.push(`/settings/templates/${template.id}`);
    }
  }, [importJson, importTemplate, router]);

  const handleSetDefault = useCallback((templateId: string) => {
    setAsDefault(templateId);
    setActiveMenu(null);
  }, [setAsDefault]);

  const handleEdit = useCallback((templateId: string) => {
    router.push(`/settings/templates/${templateId}`);
  }, [router]);

  const handlePreview = useCallback((templateId: string) => {
    router.push(`/settings/templates/${templateId}/preview`);
  }, [router]);

  const getValidationStatus = useCallback((template: IPVTemplate) => {
    const validation = validateTemplate(template.id);
    if (!validation.valid) {
      return { status: 'error' as const, message: validation.errors.join(', ') };
    }
    if (validation.warnings.length > 0) {
      return { status: 'warning' as const, message: validation.warnings.join(', ') };
    }
    return { status: 'valid' as const, message: 'Template valide' };
  }, [validateTemplate]);

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return {
    templates,
    isLoading,
    error,
    showCreateModal,
    setShowCreateModal,
    showDeleteModal,
    setShowDeleteModal,
    showImportModal,
    setShowImportModal,
    activeMenu,
    setActiveMenu,
    newTemplateName,
    setNewTemplateName,
    newTemplateDesc,
    setNewTemplateDesc,
    importJson,
    setImportJson,
    handleCreate,
    handleDuplicate,
    handleDelete,
    handleExport,
    handleImport,
    handleSetDefault,
    handleEdit,
    handlePreview,
    getValidationStatus,
    formatDate,
  };
}
